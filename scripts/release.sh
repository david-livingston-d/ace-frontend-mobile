#!/usr/bin/env bash
# Builds a signed release APK + AAB locally. Not run in CI (CI only ever
# builds `assembleDebug` — see .github/workflows/ci.yml) — this is a manual,
# on-a-dev-machine step, run after `npm run release:bump -- <patch|minor|major|x.y.z>`.
#
# Usage: bash scripts/release.sh
# Signing: this script exports ACE_RELEASE_SIGNING=required by default, which
# makes the Gradle build FAIL instead of silently falling back to the debug
# keystore when the upload keystore properties aren't in
# ~/.gradle/gradle.properties (see android/app/build.gradle and README.md's
# Release section). Override it for a deliberately debug-signed smoke build:
#   ACE_RELEASE_SIGNING=optional bash scripts/release.sh
set -euo pipefail

# The default is the safe one: a "release" build that silently used the debug
# keystore is the failure this guard exists to prevent, so it has to be on
# unless the operator explicitly asks for the unsigned smoke build.
export ACE_RELEASE_SIGNING="${ACE_RELEASE_SIGNING:-required}"

cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== Checking .env =="
if [ ! -f .env ]; then
  echo "ERROR: .env is missing. Release builds need a real API_URL — copy .env.example and fill it in." >&2
  exit 1
fi
if ! grep -qE '^API_URL=https://' .env; then
  echo "ERROR: .env's API_URL must be a real https:// URL for a release build (found: $(grep '^API_URL=' .env || echo 'none'))." >&2
  exit 1
fi

echo "== Running tests, typecheck, lint =="
npm test
npm run typecheck
npm run lint

echo "== Building release APK + AAB =="
( cd android && ./gradlew bundleRelease assembleRelease )

APK="android/app/build/outputs/apk/release/app-release.apk"
AAB="android/app/build/outputs/bundle/release/app-release.aab"

echo "== Artefacts =="
for f in "$APK" "$AAB"; do
  if [ -f "$f" ]; then
    size=$(du -h "$f" | cut -f1)
    echo "$f ($size)"
  else
    echo "WARNING: expected artefact not found: $f" >&2
  fi
done

# Hermes source maps let PostHog (or any crash reporter) symbolicate a
# release stack trace back to real file/line — the release bundle itself has
# already been through Hermes bytecode compilation by the time Gradle is
# done, so this has to be a documented follow-up, not something this script
# runs blind: `posthog-cli` isn't installed on this machine, and uploading a
# source map is a one-way action against PostHog's servers.
if [ -f .env ] && grep -qE '^POSTHOG_API_KEY=.+' .env; then
  echo "== PostHog source map upload (documented — not run automatically) =="
  echo "POSTHOG_API_KEY is set in .env. If posthog-cli is installed, upload the Hermes source map with:"
  echo
  echo "  posthog-cli sourcemap inject --directory android/app/build/generated/sourcemaps/react"
  echo "  posthog-cli sourcemap upload --directory android/app/build/generated/sourcemaps/react"
  echo
fi

echo "== Done =="
