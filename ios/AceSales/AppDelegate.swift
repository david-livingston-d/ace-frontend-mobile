import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import RNBootSplash

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "AceSales",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  /// `acesales://` links (`Info.plist`'s `CFBundleURLTypes`, parsed by
  /// `src/navigation/linking.ts`). The RN 0.86 Swift template's `AppDelegate`
  /// is a plain `UIResponder`, not `RCTAppDelegate`, so nothing forwards the
  /// opened URL to `RCTLinkingManager` unless we do it here — without this the
  /// `Linking` 'url' event never fires and deep links silently do nothing.
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    RCTLinkingManager.application(app, open: url, options: options)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  /// Hands the native splash over to `react-native-bootsplash`, which keeps the
  /// `BootSplash` storyboard on screen over the root view until JS calls
  /// `BootSplash.hide()` (`src/App.tsx`). Without this the storyboard is torn
  /// down the instant the window appears and iOS flashes an empty root view
  /// while the bundle loads.
  override func customize(_ rootView: RCTRootView) {
    super.customize(rootView)
    RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView)
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
