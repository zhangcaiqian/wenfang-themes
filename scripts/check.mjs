#!/usr/bin/env node
/**
 * Wenfang checks. Fails CI on structural problems or on any drift between the
 * design source and the six Codex import strings that ship in the design doc.
 *
 * Hard failures:
 *   - source shape / duplicate ids / bad hex / bad variant
 *   - generated Codex string differs from fixtures/codex/<id>.txt
 *   - DSH bundle missing an id, or a token map value is not a string
 *   - missing / stale README swatch, or a README that stopped linking one
 *   - generated client.js does not parse
 * Warnings (reported, not fatal — design decisions, not build errors):
 *   - `codeThemeId` not in the known built-in list (Codex version drift)
 *   - text/UI contrast below WCAG floors
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { codexImportString, KNOWN_CODE_THEME_IDS } from './lib/codex.mjs';
import { contrast } from './lib/color.mjs';
import { deriveDshTokens, dshThemes } from './lib/dsh.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(join(ROOT, relative), 'utf8').trim();

const failures = [];
const warnings = [];
const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);

const doc = JSON.parse(read('themes/wenfang.json'));
if (!doc.series?.slug || !Array.isArray(doc.variants)) fail('themes/wenfang.json: missing series.slug or variants[]');
if (doc.variants.length !== 6) fail(`expected 6 variants, found ${doc.variants.length}`);

const seen = new Set();
for (const variant of doc.variants) {
  const id = variant.id;
  if (seen.has(id)) fail(`duplicate variant id: ${id}`);
  seen.add(id);
  if (!['dark', 'light'].includes(variant.variant)) fail(`${id}: variant must be dark|light`);
  for (const [role, value] of Object.entries(variant.palette ?? {})) {
    if (!/^#[0-9a-f]{6}$/i.test(String(value))) fail(`${id}: palette.${role} is not #rrggbb (${value})`);
  }
  if (typeof variant.codex?.contrast !== 'number') fail(`${id}: codex.contrast must be a number`);
  if (!KNOWN_CODE_THEME_IDS.has(variant.codex?.codeThemeId)) {
    warn(`${id}: codeThemeId "${variant.codex?.codeThemeId}" not in the known built-in list — confirm against your Codex version`);
  }

  const expected = read(`fixtures/codex/${id}.txt`);
  const actual = codexImportString(variant);
  if (expected !== actual) {
    fail(`${id}: generated Codex string does not match fixtures/codex/${id}.txt`);
    fail(`  expected: ${expected.slice(0, 120)}…`);
    fail(`  actual:   ${actual.slice(0, 120)}…`);
  }
}

// --- DSH side -------------------------------------------------------------
const themes = dshThemes(doc);
if (themes.length !== doc.variants.length) fail('dsh: variant count mismatch');
for (const [index, theme] of themes.entries()) {
  const variant = doc.variants[index];
  if (typeof theme.id !== 'string' || theme.id.length === 0) fail(`dsh: ${variant.id} has no theme id`);
  if (variant.dshId !== theme.id) fail(`dsh: id mismatch for ${variant.id} → ${theme.id} (expected ${variant.dshId})`);
  // The market renders the id verbatim as a card label; keep it narrow enough for
  // the card's action button (CJK counts double). Real render wrapped at 24 ASCII.
  const visualWidth = [...theme.id].reduce((n, ch) => n + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0);
  if (visualWidth > 16) warn(`dsh: theme id ${theme.id} is ${visualWidth} units wide — market cards may wrap the label`);
  if (theme.colorScheme !== variant.variant) fail(`dsh: ${theme.id} colorScheme mismatch`);
  const derived = deriveDshTokens(variant);
  for (const [name, value] of Object.entries(theme.tokens)) {
    if (!name.startsWith('--')) fail(`dsh: ${theme.id} token ${name} is not a custom property`);
    if (typeof value !== 'string' || value.length === 0) fail(`dsh: ${theme.id} token ${name} is not a string`);
  }
  if (Object.keys(derived).length < 20) fail(`dsh: ${theme.id} derived only ${Object.keys(derived).length} tokens`);
}

const bundle = read('packages/dsh/lib/client.js');
if (!bundle.includes('__ModuleLoader__.load')) fail('packages/dsh/lib/client.js: not a ModuleLoader bundle');
for (const theme of themes) {
  if (!bundle.includes(JSON.stringify(theme.id))) fail(`packages/dsh/lib/client.js: missing theme id ${theme.id}`);
}
try {
  execFileSync(process.execPath, ['--check', join(ROOT, 'packages/dsh/lib/client.js')], { stdio: 'pipe' });
} catch (error) {
  fail(`packages/dsh/lib/client.js does not parse: ${error.message}`);
}

// --- README swatches ------------------------------------------------------
const readmes = ['README.md', 'README.zh.md'];
for (const variant of doc.variants) {
  const relative = `media/swatches/${variant.id}.svg`;
  let svg;
  try {
    svg = read(relative);
  } catch {
    fail(`${relative}: missing — run node scripts/build.mjs`);
    continue;
  }
  if (!svg.startsWith('<svg')) fail(`${relative}: not an SVG document`);
  for (const [role, value] of Object.entries(variant.palette)) {
    if (role === 'skill') continue;
    if (!svg.includes(value)) fail(`${relative}: missing ${role} color ${value}`);
  }
  if (svg.includes('__')) fail(`${relative}: contains an unreplaced placeholder`);
  for (const readme of readmes) {
    if (!read(readme).includes(relative)) fail(`${readme}: does not reference ${relative}`);
  }
}

// --- contrast report ------------------------------------------------------
const rows = [];
for (const variant of doc.variants) {
  const { surface, ink, accent, diffAdded, diffRemoved } = variant.palette;
  const text = contrast(ink, surface);
  const ui = contrast(accent, surface);
  const added = contrast(diffAdded, surface);
  const removed = contrast(diffRemoved, surface);
  const line = `${variant.nameZh.padEnd(12)} ink/surface ${text.toFixed(2)}  accent ${ui.toFixed(2)}  diff+ ${added.toFixed(2)}  diff- ${removed.toFixed(2)}`;
  rows.push(line);
  if (text < 4.5) warn(`${variant.id}: body text contrast ${text.toFixed(2)} < 4.5`);
  if (ui < 3) warn(`${variant.id}: accent contrast ${ui.toFixed(2)} < 3.0`);
  if (added < 3) warn(`${variant.id}: diffAdded contrast ${added.toFixed(2)} < 3.0`);
  if (removed < 3) warn(`${variant.id}: diffRemoved contrast ${removed.toFixed(2)} < 3.0`);
}

console.log('contrast (WCAG):');
for (const line of rows) console.log('  ' + line);
if (warnings.length > 0) {
  console.log(`\nwarnings (${warnings.length}):`);
  for (const message of warnings) console.log('  ! ' + message);
}
if (failures.length > 0) {
  console.error(`\nFAILED (${failures.length}):`);
  for (const message of failures) console.error('  ✗ ' + message);
  process.exit(1);
}
console.log(`\nOK — ${doc.variants.length} variants, ${themes.length} DSH themes, Codex round-trip exact, ${doc.variants.length} swatches`);
