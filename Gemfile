source 'https://rubygems.org'

# You may use http://rbenv.org/ or https://rvm.io/ to install and use this version
ruby ">= 2.6.10"

# Exclude problematic versions of cocoapods and activesupport that causes build failures.
# NOTE (M4-T4, first iOS bring-up): CocoaPods is pinned to 1.16.x and the RN
# template's `gem 'xcodeproj', '< 1.26.0'` pin is gone. That pin capped CocoaPods
# at 1.15.2 (1.16 needs xcodeproj >= 1.27), which is older than what RN 0.86's pod
# scripts (SPM dependencies, prebuilt React core, VFS overlay) are written against.
# `react-native run-ios` shells out to `bundle exec pod install`, so this file —
# not the system gems — is what decides the CocoaPods that writes `ios/Podfile.lock`.
gem 'cocoapods', '~> 1.16.2'
gem 'activesupport', '>= 6.1.7.5', '!= 7.1.0'
gem 'concurrent-ruby', '< 1.3.4'

# Ruby 3.4.0 has removed some libraries from the standard library.
gem 'bigdecimal'
gem 'logger'
gem 'benchmark'
gem 'mutex_m'
gem 'nkf'
