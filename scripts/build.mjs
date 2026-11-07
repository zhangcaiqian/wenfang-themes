#!/usr/bin/env node
/**
 * Wenfang build: `themes/wenfang.json` → generated artifacts.
 *
 * Outputs (all deterministic — CI reruns this and fails on any diff):
 *   dist/codex/<variant>.txt        one-line Codex import string per variant
 *   dist/codex/all.json             all six strings keyed by variant
 *   dist/dsh-themes.json            registered DSH ThemeDefinitions (debug/inspection)
 *   packages/dsh/lib/client.js      browser half of the DSH plugin (generated)
 *   dist/readme-series-table.md     README table body (generated)
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { codexImportString } from './lib/codex.mjs';
import { dshThemes } from './lib/dsh.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const writeOut = async (relative, content) => {
  const path = join(ROOT, relative);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
  return relative;
};

const doc = JSON.parse(await readFile(join(ROOT, 'themes/wenfang.json'), 'utf8'));
const written = [];

for (const variant of doc.variants) {
  written.push(await writeOut(`dist/codex/${variant.id}.txt`, codexImportString(variant) + '\n'));
}

written.push(
  await writeOut(
    'dist/codex/all.json',
    JSON.stringify(
      Object.fromEntries(doc.variants.map((v) => [v.id, codexImportString(v)])),
      null,
      2,
    ) + '\n',
  ),
);

const themes = dshThemes(doc);
written.push(await writeOut('dist/dsh-themes.json', JSON.stringify(themes, null, 2) + '\n'));

const template = await readFile(join(ROOT, 'packages/dsh/src/client.template.js'), 'utf8');
const bundle = template.replace('__WENFANG_THEMES__', JSON.stringify(themes, null, 2));
if (bundle === template) throw new Error('client template is missing the __WENFANG_THEMES__ placeholder');
written.push(await writeOut('packages/dsh/lib/client.js', bundle));

const rows = doc.variants
  .map((v) => `| ${v.nameZh} | ${v.nameEn} | ${v.variant} | \`${v.id}\` | ${v.tagline} |`)
  .join('\n');
written.push(
  await writeOut(
    'dist/readme-series-table.md',
    `| 主题 | English | variant | slug | 气质 |\n| --- | --- | --- | --- | --- |\n${rows}\n`,
  ),
);

console.log(`wenfang: built ${written.length} artifacts`);
for (const path of written) console.log('  ' + path);
