// `.test.js` (not `.mjs`) so jest's default `testMatch` picks it up at all —
// it does not include `.mjs` — but it imports straight from the real `.mjs`
// implementation (babel-jest transforms both extensions; see jest.config.js).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  bumpVersion,
  formatVersion,
  nextVersion,
  parseProperties,
  parseSemver,
  versionCodeFor,
} from '../bump-version.mjs';

describe('versionCodeFor', () => {
  test('major*10000 + minor*100 + patch', () => {
    expect(versionCodeFor(1, 2, 3)).toBe(10203);
    expect(versionCodeFor(1, 0, 0)).toBe(10000);
    expect(versionCodeFor(0, 0, 1)).toBe(1);
  });

  test('rejects minor/patch outside 0-99', () => {
    expect(() => versionCodeFor(1, 100, 0)).toThrow(/0-99/);
    expect(() => versionCodeFor(1, 0, 100)).toThrow(/0-99/);
  });

  test('rejects negative/non-integer components', () => {
    expect(() => versionCodeFor(1, -1, 0)).toThrow();
    expect(() => versionCodeFor(1.5, 0, 0)).toThrow();
  });
});

describe('parseSemver', () => {
  test('parses a strict x.y.z', () => {
    expect(parseSemver('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  test.each(['1.2', '1.2.3.4', '1.2.x', 'v1.2.3', '1.2.3-rc1', 'abc', ''])('rejects non-semver %p', (value) => {
    expect(() => parseSemver(value)).toThrow(/invalid version/);
  });
});

describe('nextVersion', () => {
  test('patch/minor/major bumps reset the components below them', () => {
    expect(nextVersion('1.2.3', 'patch')).toEqual({ major: 1, minor: 2, patch: 4 });
    expect(nextVersion('1.2.3', 'minor')).toEqual({ major: 1, minor: 3, patch: 0 });
    expect(nextVersion('1.2.3', 'major')).toEqual({ major: 2, minor: 0, patch: 0 });
  });

  test('an explicit x.y.z sets the version outright', () => {
    expect(nextVersion('1.2.3', '9.9.9')).toEqual({ major: 9, minor: 9, patch: 9 });
  });

  test('rejects a non-semver current version or bump kind', () => {
    expect(() => nextVersion('not-a-version', 'patch')).toThrow(/invalid version/);
    expect(() => nextVersion('1.2.3', 'banana')).toThrow(/invalid version/);
  });
});

test('formatVersion round-trips parseSemver', () => {
  expect(formatVersion(parseSemver('1.2.3'))).toBe('1.2.3');
});

test('parseProperties reads KEY=value lines, skipping blanks/comments', () => {
  expect(parseProperties('# comment\nVERSION_NAME=1.0.0\n\nVERSION_CODE=10000\n')).toEqual({
    VERSION_NAME: '1.0.0',
    VERSION_CODE: '10000',
  });
});

describe('bumpVersion (file I/O)', () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bump-version-test-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function write(versionName, versionCode) {
    const versionPropertiesPath = path.join(dir, 'version.properties');
    const packageJsonPath = path.join(dir, 'package.json');
    fs.writeFileSync(versionPropertiesPath, `VERSION_NAME=${versionName}\nVERSION_CODE=${versionCode}\n`);
    fs.writeFileSync(packageJsonPath, JSON.stringify({ name: 'ace-sales', version: versionName }, null, 2));
    return { versionPropertiesPath, packageJsonPath };
  }

  test('1.2.3 -> 10203 written to both files', () => {
    const paths = write('1.2.3', 10203 - 1); // any code lower than the target still counts as "monotonic so far"
    const result = bumpVersion('patch', paths);
    expect(result).toEqual({ versionName: '1.2.4', versionCode: 10204 });
    expect(parseProperties(fs.readFileSync(paths.versionPropertiesPath, 'utf8'))).toEqual({
      VERSION_NAME: '1.2.4',
      VERSION_CODE: '10204',
    });
    expect(JSON.parse(fs.readFileSync(paths.packageJsonPath, 'utf8')).version).toBe('1.2.4');
  });

  test('patch bump is monotonic across repeated calls', () => {
    const paths = write('1.0.0', 10000);
    const first = bumpVersion('patch', paths);
    const second = bumpVersion('patch', paths);
    expect(first.versionCode).toBeLessThan(second.versionCode);
    expect(second).toEqual({ versionName: '1.0.2', versionCode: 10002 });
  });

  test('a minor bump is still monotonic against the prior patch-heavy version', () => {
    const paths = write('1.9.9', versionCodeFor(1, 9, 9));
    const result = bumpVersion('minor', paths);
    expect(result).toEqual({ versionName: '1.10.0', versionCode: 11000 });
  });

  test('rejects an explicit version that would not increase VERSION_CODE', () => {
    const paths = write('2.0.0', versionCodeFor(2, 0, 0));
    expect(() => bumpVersion('1.9.9', paths)).toThrow(/non-increasing/);
  });

  test('rejects a non-semver bump argument without writing either file', () => {
    const paths = write('1.0.0', 10000);
    expect(() => bumpVersion('not-a-version', paths)).toThrow(/invalid version/);
    expect(fs.readFileSync(paths.versionPropertiesPath, 'utf8')).toContain('VERSION_NAME=1.0.0');
  });
});
