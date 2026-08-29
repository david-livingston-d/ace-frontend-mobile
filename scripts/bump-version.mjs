#!/usr/bin/env node
// Bumps the mobile app's version (see `android/version.properties` and
// `package.json`), keeping three things in lockstep:
//   - `VERSION_NAME` (`android/version.properties`) — the human-facing
//     `x.y.z` shown in "About" and on the Play listing.
//   - `VERSION_CODE` (`android/version.properties`) — the integer Android
//     (and Play) actually compares to decide "is this an upgrade"; it must
//     strictly increase on every release or Play rejects the upload.
//   - `package.json#version` — mirrored only for tooling that reads it
//     (npm, editors); Android never looks at this field.
//   - `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` (`ios/AceSales.xcodeproj/
//     project.pbxproj`) — iOS's own pair, which `Info.plist` reads through
//     `$(MARKETING_VERSION)` / `$(CURRENT_PROJECT_VERSION)`. One command bumps
//     both platforms; a build number that disagrees between them is the kind
//     of thing nobody notices until a TestFlight upload is rejected.
//
// Usage: `node scripts/bump-version.mjs <major|minor|patch|x.y.z>`
// (or `npm run release:bump -- <same>`).
import fs from 'node:fs';
import path from 'node:path';

// Deliberately `process.cwd()`-relative, not derived from the module's own
// URL/`__dirname` — this file is loaded two ways that disagree on how to get
// that: real Node ESM (`node scripts/bump-version.mjs`, always run from the
// repo root by `npm run release:bump`) has no `__dirname`, and Jest's
// babel-transformed CJS execution of this same file (imported by the test
// suite below) chokes on a literal `import.meta` token appearing anywhere in
// the source, even dead code — a Jest/V8 restriction, not a bug to work
// around per-callsite. `process.cwd()` needs neither.
export const VERSION_PROPERTIES_PATH = path.join(process.cwd(), 'android', 'version.properties');
export const PACKAGE_JSON_PATH = path.join(process.cwd(), 'package.json');
export const PBXPROJ_PATH = path.join(process.cwd(), 'ios', 'AceSales.xcodeproj', 'project.pbxproj');

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;

/** Parses a `KEY=value` properties file (one entry per line; `#` comments and blank lines skipped). */
export function parseProperties(text) {
  /** @type {Record<string, string>} */
  const props = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    props[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return props;
}

/**
 * The `VERSION_CODE` scheme: `major*10000 + minor*100 + patch`. This gives
 * each of minor/patch two decimal digits of headroom (0-99) before it would
 * collide with the next major/minor's range — comfortably more than a
 * per-sprint release cadence will ever need, and the two-digit budget is
 * enforced below rather than silently overflowing into the next component.
 */
export function versionCodeFor(major, minor, patch) {
  if (!Number.isInteger(major) || !Number.isInteger(minor) || !Number.isInteger(patch) || major < 0 || minor < 0 || patch < 0) {
    throw new Error(`versionCodeFor expects non-negative integers, got ${major}.${minor}.${patch}`);
  }
  if (minor > 99 || patch > 99) {
    throw new Error(`minor/patch must stay within 0-99 under this versionCode scheme (got ${major}.${minor}.${patch})`);
  }
  return major * 10000 + minor * 100 + patch;
}

/** Formats a `{major,minor,patch}` triple back to an `x.y.z` string. */
export function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

/** Parses a strict `x.y.z` string (all-digit components only) or throws. */
export function parseSemver(value) {
  const m = SEMVER_RE.exec(value);
  if (!m) throw new Error(`invalid version "${value}" — expected "x.y.z" (digits only)`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

/**
 * Computes the next `{major,minor,patch}` given the current version string
 * and a bump kind: `"major"`/`"minor"`/`"patch"` increments that component
 * (resetting the ones below it, semver-style), or an explicit `"x.y.z"`
 * string sets the version outright.
 */
export function nextVersion(current, bump) {
  const { major, minor, patch } = parseSemver(current);
  if (bump === 'major') return { major: major + 1, minor: 0, patch: 0 };
  if (bump === 'minor') return { major, minor: minor + 1, patch: 0 };
  if (bump === 'patch') return { major, minor, patch: patch + 1 };
  return parseSemver(bump);
}

/**
 * Rewrites every `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` assignment in
 * an Xcode project file. All of them, not the first: a pbxproj carries one
 * `XCBuildConfiguration` per configuration (Debug and Release here), and
 * bumping only one is how a Release build ends up shipping the Debug build's
 * version. iOS takes the same integer as Android's `VERSION_CODE`, so the two
 * stores never disagree about which build is newer.
 */
export function setIosVersion(text, versionName, versionCode) {
  return text
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${versionName};`)
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${versionCode};`);
}

/**
 * Runs the bump end to end: reads the files, computes the next version, writes
 * them back. Returns the new version string + code.
 *
 * `pbxprojPath` has no default *on purpose*. Every other path here defaults to
 * the real repo file, which is safe because the tests always pass their own
 * temp copies — but a test that forgot to would then rewrite the checked-in
 * Xcode project. Opting in makes that impossible; the CLI below passes it.
 */
export function bumpVersion(bump, { versionPropertiesPath = VERSION_PROPERTIES_PATH, packageJsonPath = PACKAGE_JSON_PATH, pbxprojPath = null } = {}) {
  const propsText = fs.readFileSync(versionPropertiesPath, 'utf8');
  const props = parseProperties(propsText);
  const current = props.VERSION_NAME;
  if (!current) throw new Error(`VERSION_NAME missing from ${versionPropertiesPath}`);

  const next = nextVersion(current, bump);
  const versionName = formatVersion(next);
  const versionCode = versionCodeFor(next.major, next.minor, next.patch);
  const currentCode = Number(props.VERSION_CODE);
  if (Number.isFinite(currentCode) && versionCode <= currentCode) {
    throw new Error(`refusing to write a non-increasing VERSION_CODE (${currentCode} -> ${versionCode}) — is "${bump}" actually older than ${current}?`);
  }

  fs.writeFileSync(versionPropertiesPath, `VERSION_NAME=${versionName}\nVERSION_CODE=${versionCode}\n`, 'utf8');

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  pkg.version = versionName;
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

  if (pbxprojPath && fs.existsSync(pbxprojPath)) {
    const pbxproj = fs.readFileSync(pbxprojPath, 'utf8');
    fs.writeFileSync(pbxprojPath, setIosVersion(pbxproj, versionName, versionCode), 'utf8');
  }

  return { versionName, versionCode };
}

// Only run the CLI when invoked directly (`node scripts/bump-version.mjs …`),
// never when the test suite imports the pure functions above.
const isMain = !!process.argv[1] && path.basename(process.argv[1]) === 'bump-version.mjs';
if (isMain) {
  const bump = process.argv[2];
  if (!bump) {
    console.error('Usage: node scripts/bump-version.mjs <major|minor|patch|x.y.z>');
    process.exit(1);
  }
  try {
    const { versionName, versionCode } = bumpVersion(bump, { pbxprojPath: PBXPROJ_PATH });
    console.log(`Bumped to ${versionName} (versionCode / CFBundleVersion ${versionCode}) — Android + iOS`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
