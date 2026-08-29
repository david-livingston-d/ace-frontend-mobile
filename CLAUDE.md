# CLAUDE.md — ACE Sales (mobile)

Guidance for Claude Code working in **this repo** (`ace-frontend-mobile`). The workspace-level
`CLAUDE.md` one directory up carries the product, domain and branch rules; this file is about the
app itself. On functional questions the PRD wins, on technical ones the architecture doc wins, on
**visual** ones the design system below wins.

Bare React Native (CLI, **not** Expo), Android-first, iOS on the simulator. One codebase, one look
on both platforms. Talks to the same backend as the web app — no mobile-specific endpoints.

## Design system

The M4 redesign made the tokens the single source of truth for every visual value. These rules are
not style preferences; a jest guard (`src/ui/__tests__/tokenGuard.test.ts`) fails the build on most
of them.

- **All styling comes from `src/ui/tokens/*`** — `colors.ts`, `spacing.ts`, `layout.ts`,
  `radius.ts`, `typography.ts`, `elevation.ts`, `motion.ts`. A screen imports tokens; it never
  invents values.
- **Never hard-code a colour, spacing step, radius, font size, line height or max width.** The
  token guard scans all of `src/` outside `src/ui/tokens/**` and `__tests__/**` for literal hex
  colours, `borderRadius: <n>`, `fontSize: <n>`, `lineHeight: <n>`, `maxWidth: <n>`, `elevation:`
  and `shadowColor` — every one of them is a failure.
- **Spacing is the 4-pt scale** (`space[1..12]`), plus the documented mockup exceptions that live
  in `spacing.ts` as named constants: `gutter 20` (every screen's side padding), `cardPad 18`
  (`.card`), `rowPad 12 × 14` (`rowPadV`/`rowPadH`, a list row inside a card), and the `gap*`
  figures. Fixed chrome sizes (tab bar, FAB, control heights, chart, hit slops) live in
  `layout.ts`.
- **Depth is drawn only through `shadow()`** (`tokens/elevation.ts`), which emits a CSS
  `boxShadow` string. Never RN's `elevation` (Android-only, no spread/colour control) and never
  the `shadow*` props (iOS-only). One string renders the same design on both platforms;
  `shadow()` is also the *only* place a `Platform.select` is allowed in styling.
- **Safe-area insets go through `useBottomClearance`, `Screen`'s `footer` slot, or `FormScreen`.**
  No screen reads `useSafeAreaInsets()` to pad a list by hand. Forms use `FormScreen` — it owns
  the keyboard-aware scroll, the measured pinned footer and the per-platform keyboard lift.
- **Every interactive control has a ≥ 44 × 44 touch area.** The drawn size stays the mockup's; the
  touch box is padded out with a `hitSlop` from `layout.ts`'s `hit` map (or a min-height wrapper
  for small buttons). Don't grow the visual control to reach 44.
- **Uppercase is a role, never a call-site style.** Only the `label`, `badge`, `tab`, `button` and
  `chip` type roles are uppercase, and `Text` uppercases their content for real so the
  accessibility tree and text queries see the glyphs on screen. Never `textTransform` by hand,
  never `.toUpperCase()` in a screen.
- **Money is weight 600 with Indian digit grouping**, always through `formatMoney` (`₹1,24,500.00`).
  Money crosses the wire as a decimal *string*; compare with `cmpMoney`, never `Number()`.
  Quantities go through `formatQty`/`remainingQty`.
- **Reference designs:** `design/reference/redesign/{index.html,kit.html,redesign.css}` (every
  screen and the component sheet), `design/reference/canvas-edits-2026-08-28.md` (the owner's
  approved deltas, which override the spec where they differ), and `design/screenshots/`
  (`android-after/`, `ios-after/`, `ios-before/` — there is no `android-before/`: those captures
  were taken in a scratch directory that has since been cleared). See `design/README.md`.
- **A value that isn't in the tokens gets added to the tokens first** — with a comment saying which
  mockup rule it comes from — and only then used. Never hard-coded in a screen "just this once".
- **One codebase, no platform-specific styling.** Keyboard and inset *logic* is platform-aware
  (that's behaviour, and it lives in `FormScreen`/`useBottomClearance`); the *look* is not. The
  single exception is inside `shadow()`, which degrades `boxShadow` on old Android.

## Commands

```bash
cp .env.example .env                      # once; API_URL, POSTHOG_*, ENV
adb reverse tcp:8000 tcp:8000 && npm run android   # Android (needs the API on :8000 + an emulator)
npm run ios                               # iOS simulator (macOS; LANG must be UTF-8)
npm test                                  # jest (msw/node + RTL)
npm run typecheck                         # tsc --noEmit
npm run lint                              # eslint .
npm run gen:api                           # regenerate src/lib/api/schema.d.ts from a running API — commit it
npm run release:bump -- <patch|minor|major>   # version across android/version.properties, package.json, ios pbxproj
npm run release                           # signed release APK/AAB (keystore-gated; asserts .env API_URL)
```

Run `npm test && npm run typecheck && npm run lint` before every commit. Details — prerequisites,
iOS pod install, keystore custody, Play track — are in `README.md`.
