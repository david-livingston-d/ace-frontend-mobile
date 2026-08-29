# ACE Sales (mobile)

Bare React Native (CLI, **not** Expo) app for the ACE Sales team — order creation/tracking,
customer creation, stock view, DC creation, payment recording, order timeline. Android first;
iOS runs on the simulator (see below) but has no signing set up yet.

Talks to the same ACE OMS FastAPI backend as the web app (`ace-backend`); no mobile-specific
endpoints or databases.

## Prerequisites

- Node 22+, npm
- JDK 17 (Temurin)
- Android SDK (`ANDROID_HOME` set), an emulator or a device with USB debugging enabled
- For iOS: Xcode 26 with an iOS 26 simulator runtime, Ruby (rbenv) + Bundler
- The ACE backend running locally for API calls: `cd ../ace-backend && uv run uvicorn app.main:app --port 8000`

## Setup

```bash
npm install
cp .env.example .env
```

`.env` is git-ignored; `.env.example` documents the required keys (`API_URL`, `POSTHOG_API_KEY`,
`POSTHOG_HOST`, `ENV`).

## Running on Android

```bash
adb reverse tcp:8000 tcp:8000   # so the emulator/device can reach the backend on localhost:8000
npm run android
```

## Running on iOS (simulator)

macOS only, and simulator only — there is **no code signing / provisioning set up yet**, so the
app cannot be installed on a physical iPhone from this repo.

```bash
export LANG=en_US.UTF-8     # CocoaPods refuses to run under a non-UTF-8 locale
bundle install              # CocoaPods 1.16.x, pinned in the Gemfile
(cd ios && bundle exec pod install)
npm run ios                 # or: npx react-native run-ios --simulator "iPhone 17"
```

`ios/Pods/` is generated and git-ignored; `ios/Podfile.lock` and `Gemfile.lock` are committed —
re-run `pod install` after any native dependency change and commit the updated lockfile.

Notes:

- The simulator reaches the backend over `http://localhost:8000` directly (no `adb reverse`
  equivalent needed), so the same `API_URL` works for both platforms. App Transport Security
  keeps `NSAllowsArbitraryLoads` off and allows only `NSAllowsLocalNetworking`, which is what
  permits that plaintext localhost call in dev.
- `LANG` must be UTF-8 for **any** command that shells out to CocoaPods, `react-native run-ios`
  included — it runs `bundle exec pod install` itself and fails with an
  `Encoding::CompatibilityError` otherwise.
- Deep links: `xcrun simctl openurl booted "acesales://orders/<id>"` (the `acesales` scheme is
  registered in `ios/AceSales/Info.plist`; iOS asks for confirmation the first time).
- Software keyboard in the simulator: I/O › Keyboard › uncheck "Connect Hardware Keyboard",
  otherwise the on-screen keyboard never appears.
- Dark mode: `xcrun simctl ui booted appearance dark` (`light` to switch back).
- CI does not build iOS — it runs lint/typecheck/tests plus an Android debug build only.

## Design system

Every visual value comes from `src/ui/tokens/*`, and a jest guard
(`src/ui/__tests__/tokenGuard.test.ts`) fails the build on a literal colour,
radius, font size, line height, max width, `elevation` or `shadowColor`
anywhere in `src/` outside the tokens. The full set of rules — the 4-pt scale
and its documented exceptions, `shadow()` for depth, `hitSlop` for 44 px touch
targets, insets through `useBottomClearance` / `Screen.footer` / `FormScreen`,
uppercase as a type role, money through `formatMoney` — is in
[`CLAUDE.md`](CLAUDE.md). A value the tokens don't have goes into the tokens
first; it is never hard-coded in a screen.

The reference designs and the visual record live in `design/`:

| Path | What it is |
|---|---|
| `design/reference/redesign/` | Every screen as a phone frame, the component sheet, and the stylesheet whose custom properties are the same numbers the tokens carry. |
| `design/reference/canvas-edits-2026-08-28.md` | The owner's approved deltas from the design canvas. They **override** the spec where they differ. |
| `design/screenshots/android-after/` | The shipped Android look, light and dark, 534 x 1200. |
| `design/screenshots/ios-after/` | The same app on the iPhone 17 simulator (iOS 26), light and dark. |

See `design/README.md` for how to regenerate the HTML preview.

## Regenerating the API types

With the backend running locally (`ENV` must not be `prod`, so `/openapi.json` is served):

```bash
npm run gen:api
```

This writes `src/lib/api/schema.d.ts` from the live OpenAPI schema — commit the result.

## Folder layout

```
src/
  navigation/   # screen navigators (React Navigation)
  features/     # feature modules (orders, customers, stock, ...)
  ui/           # shared UI components, theme
  lib/          # api client, query client, formatting, storage helpers
  native/       # thin wrappers around native modules (e.g. keychain)
  analytics/    # PostHog wiring
  store/        # zustand stores
  App.tsx       # root component
  providers.tsx # app-wide context providers
```

## Commands

```bash
npm run android         # build + run the debug app on a connected device/emulator
npm run ios             # build + run the debug app on an iOS simulator (macOS, LANG must be UTF-8)
npm run start           # Metro bundler only
npm run typecheck       # tsc --noEmit
npm run lint            # eslint .
npm test                # jest (--forceExit; see the note under "Release")
npm run android:release-apk   # assembleRelease (no version bump, no keystore checks)
npm run android:release-aab   # bundleRelease   (same)
npm run release:bump -- <major|minor|patch|x.y.z>   # bump the version on both platforms
npm run release          # the real release pipeline — see "Release" below
```

## Release

`android/version.properties` (`VERSION_NAME`, `VERSION_CODE`) is the single source of truth for
the app's version — `android/app/build.gradle` reads both fields from it, and it's never edited
by hand. `VERSION_CODE` is derived as `major*10000 + minor*100 + patch` (so each of minor/patch
gets two digits of headroom, 0-99, before the scheme would need widening).

`scripts/bump-version.mjs` writes four places from that one input: the two properties,
`package.json#version`, and iOS's `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` in
`ios/AceSales.xcodeproj/project.pbxproj` (which `Info.plist` reads through `$(...)`). iOS takes
the same integer as Android's `VERSION_CODE`, so the two stores never disagree about which build
is newer — and every `XCBuildConfiguration` is rewritten, not just the first, so a Release build
can't ship the Debug build's version.

**`npm test` runs `jest --forceExit`.** Jest reports "a worker process has failed to exit
gracefully" on this project; `--detectOpenHandles` over a whole suite finds *no* open handle, so
it is the React Native preset / msw keeping the loop alive rather than app code, and waiting it
out cost about 30 s a run. Use `npx jest --detectOpenHandles` if that ever needs re-checking.

### One-time: the upload keystore

Play requires every release to be signed with the *same* key over the app's lifetime (or, with
Play App Signing, the same **upload** key — Play re-signs with its own managed key for
distribution). Generate the upload keystore once, on one machine, and never regenerate it:

```bash
mkdir -p ~/keystores
keytool -genkeypair -v -keystore ~/keystores/ace-sales-upload.jks -alias ace-upload \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=ACE Sales, O=Advanced Clothing Concepts, C=IN"
```

`keytool` will prompt for a store password and a key password — generate a long random one (24+
characters) for each and **do not use the same password as anything else**. Then add the four
properties Gradle needs to `~/.gradle/gradle.properties` (create the file if it doesn't exist yet
— **never** put these in this repo; `.gitignore` already excludes `*.jks`/`*.keystore`):

```properties
ACE_UPLOAD_STORE_FILE=/Users/you/keystores/ace-sales-upload.jks
ACE_UPLOAD_STORE_PASSWORD=<the store password>
ACE_UPLOAD_KEY_ALIAS=ace-upload
ACE_UPLOAD_KEY_PASSWORD=<the key password>
```

**Keystore custody:** the `.jks` file and its two passwords are the only way to ever ship an
update through the same Play listing again — losing them means starting over with users on a
dead app. Back up `~/keystores/ace-sales-upload.jks` and the two passwords the same way (and to
the same place) as the production DB dumps — not in this repo, not in chat, not in a plaintext
note only on one laptop.

Without these properties set, `assembleRelease`/`bundleRelease` fall back to signing with the
**debug** keystore (with a Gradle warning) — fine for a local/CI smoke build, never for anything
uploaded to Play. Set `ACE_RELEASE_SIGNING=required` (env var or `-P` Gradle property) to make the
build fail loudly instead of silently falling back.

### Cutting a release

```bash
npm run release:bump -- patch     # or minor / major / an explicit x.y.z
bash scripts/release.sh
```

`scripts/release.sh` exports `ACE_RELEASE_SIGNING=required` itself, so a release build
fails loudly rather than falling back to the debug keystore. For a deliberately
debug-signed smoke build (no upload keystore on this machine), override it:
`ACE_RELEASE_SIGNING=optional bash scripts/release.sh`.

`scripts/release.sh`: asserts `.env` has a real `API_URL=https://…` (a release build must never
ship pointed at `localhost`), runs `npm test && npm run typecheck && npm run lint`, then
`cd android && ./gradlew bundleRelease assembleRelease`, and prints the resulting artefact paths
and sizes:

- `android/app/build/outputs/apk/release/app-release.apk` — for direct-install testing (`adb
  install -r`) or a Drive/S3 link to internal testers who aren't on the Play track.
- `android/app/build/outputs/bundle/release/app-release.aab` — upload this one to Play; Play
  builds device-specific APKs from it.

If `POSTHOG_API_KEY` is set in `.env`, the script prints (but does not run — `posthog-cli` isn't
installed on this machine) the Hermes source-map upload command, so a release crash can be
symbolicated back to real file/line later.

### Play internal track (first time)

1. Create the app in the Play Console, then **Release → Setup → App signing** and enrol in
   **Play App Signing** using the upload key generated above (Play keeps its own copy of the
   upload certificate to verify every future upload came from you; it manages the actual signing
   key used for distribution).
2. **Release → Testing → Internal testing** → create a release, upload the `.aab` from
   `scripts/release.sh`'s output, add release notes, roll out.
3. Add testers by email under the internal testing track's tester list; each tester needs the
   **opt-in URL** Play generates for that track (Testers tab) to be able to install the build —
   without opting in, the Play Store won't offer it to them at all.
4. **One channel per device.** A device that installed the direct APK (signed with the upload
   key locally) and a device that installed via Play (re-signed with Play's managed key) are
   signed with different certificates from Android's point of view — neither can *upgrade* the
   other; installing the other channel's build requires uninstalling first (which loses local
   app data). Pick one channel per tester device and stick to it.

## Security notes

- The refresh token lives in `react-native-keychain` (`src/native/keychain.ts`), backed by
  the Android Keystore. `securityLevel: SECURITY_LEVEL.ANY` is deliberate: it lets devices
  without a hardware-backed TEE fall back to a software-backed key rather than failing
  login outright. `accessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY` is the iOS equivalent
  (ignored on Android). There is no biometric gate on read/write in MVP.
- The access token is held in memory only (`src/lib/api/tokens.ts`) — never persisted,
  gone on process restart.
- `android:allowBackup="false"` — neither token survives an Android backup/restore.
- Cleartext HTTP traffic is permitted only in debug builds, and only to
  `localhost`/`10.0.2.2` (the emulator's host loopback) — see the network security config.
  Release builds are HTTPS-only.
- PostHog analytics (`src/analytics/`) is a no-op without a configured API key, and the
  `api_call` bridge (`src/analytics/apiEvents.ts`) only ever forwards method/UUID-redacted
  path/status/duration — no request or response bodies, so no PII can flow through it.
- The release upload keystore (`~/keystores/ace-sales-upload.jks`) and its passwords
  (`~/.gradle/gradle.properties`) live outside this repo entirely — see "Release" above for
  generation and custody. `.gitignore` excludes `*.jks`/`*.keystore` (except the throwaway
  `debug.keystore`, which is the same public one every RN project ships).
