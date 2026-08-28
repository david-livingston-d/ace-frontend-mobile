import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * Design governance (spec D6): tokens are the single source of truth, so a
 * literal colour / radius / font size / native shadow prop anywhere in `src`
 * outside `src/ui/tokens/**` is a bug the moment it is written, not something
 * to be found in review.
 *
 * Allow-list:
 *  - `src/ui/tokens/**`            — the tokens themselves
 *  - `**\/__tests__/**`            — tests assert on literal values on purpose
 *  - `src/ui/InsetDebugOverlay.tsx`— dev-only scaffolding, removed in M4-T10
 *  - the SVG gradient stop ids in `Avatar.tsx` / `HeroTile.tsx` (`id="…"`,
 *    `url(#…)`), which are element references and not colours.
 */
const SRC = join(__dirname, '..', '..');

const ALLOWED_DIRS = [join('ui', 'tokens'), '__tests__'];
const ALLOWED_FILES = [join('ui', 'InsetDebugOverlay.tsx')];
/** Files whose SVG gradient references are stripped before scanning. */
const SVG_ID_FILES = [join('ui', 'Avatar.tsx'), join('ui', 'HeroTile.tsx')];

const RULES: { name: string; pattern: RegExp }[] = [
  { name: 'literal hex colour', pattern: /#[0-9a-f]{3,8}\b/i },
  { name: 'literal borderRadius', pattern: /borderRadius:\s*\d/ },
  { name: 'literal fontSize', pattern: /fontSize:\s*\d/ },
  { name: 'native elevation prop', pattern: /elevation:/ },
  // `textShadowColor` is deliberately *not* caught: it is the only way RN
  // draws a text shadow, and the hero tile's raised digit (canvas edit #2)
  // needs one. The ban is on the iOS-only view prop.
  { name: 'native shadowColor prop', pattern: /(?<![A-Za-z])shadowColor/ },
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

function isAllowed(rel: string): boolean {
  if (ALLOWED_FILES.includes(rel)) return true;
  return ALLOWED_DIRS.some((d) => rel.split(sep).join(sep).includes(d + sep) || rel.startsWith(d + sep));
}

const FILES = walk(SRC)
  .map((f) => relative(SRC, f))
  .filter((rel) => !isAllowed(rel))
  .sort();

test('the guard actually scans the app', () => {
  expect(FILES.length).toBeGreaterThan(50);
});

test.each(RULES)('no $name outside src/ui/tokens', ({ pattern }) => {
  const offenders: string[] = [];
  for (const rel of FILES) {
    let source = readFileSync(join(SRC, rel), 'utf8');
    if (SVG_ID_FILES.includes(rel)) source = source.replace(/url\(#[\w-]+\)|id="[\w-]+"/g, '');
    source.split('\n').forEach((line, i) => {
      if (pattern.test(line)) offenders.push(`${rel}:${i + 1}  ${line.trim()}`);
    });
  }
  expect(offenders).toEqual([]);
});
