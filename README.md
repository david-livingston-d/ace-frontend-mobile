# ACE Sales (mobile)

Bare React Native (CLI, **not** Expo) app for the ACE Sales team — order creation/tracking,
customer creation, stock view, DC creation, payment recording, order timeline. Android first;
the iOS project is generated but untouched until iOS work is scheduled.

Talks to the same ACE OMS FastAPI backend as the web app (`ace-backend`); no mobile-specific
endpoints or databases.

## Prerequisites

- Node 22+, npm
- JDK 17 (Temurin)
- Android SDK (`ANDROID_HOME` set), an emulator or a device with USB debugging enabled
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
npm run start           # Metro bundler only
npm run typecheck       # tsc --noEmit
npm run lint            # eslint .
npm test                # jest
npm run android:release-apk   # assembleRelease
npm run android:release-aab   # bundleRelease
```
