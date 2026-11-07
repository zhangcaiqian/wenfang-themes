#!/usr/bin/env node
/**
 * Behaviour test for the generated DSH client bundle, without a browser.
 *
 * Runs `packages/dsh/lib/client.js` against a mocked `window.__ModuleLoader__`,
 * `localStorage` and Cordis context, then asserts the six themes register and the
 * remembered-choice rules hold:
 *   - first boot picks the variant closest to the current light/dark preference;
 *   - a stored choice is replayed;
 *   - once initialized, switching back to a built-in palette is NOT overridden;
 *   - switching away clears the remembered choice but keeps the init marker;
 *   - the asynchronous settings adoption performed by ui-theme right after boot
 *     does not leave the user on a built-in palette (regression: install test);
 *   - after the restore window closes, a built-in choice stays chosen.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CODE = readFileSync(join(ROOT, 'packages/dsh/lib/client.js'), 'utf8');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

/** Minimal localStorage stand-in. */
function createStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    snapshot: () => Object.fromEntries(map),
  };
}

/**
 * Boot the bundle once.
 * @param {{ storage: any, preference: string }} options
 */
function boot({ storage, preference: initialPreference }) {
  let preference = initialPreference;
  const registered = new Map();
  const listeners = [];
  const calls = { registered: [], setTheme: [] };

  const theme = {
    register(definition) {
      if (definition.id === 'system') throw new Error('"system" is a preference, not a registrable theme id');
      if (registered.has(definition.id)) throw new Error(`theme "${definition.id}" is already registered`);
      registered.set(definition.id, definition);
      calls.registered.push(definition);
      return () => registered.delete(definition.id);
    },
    getTheme() {
      return {
        preference,
        themes: [
          { id: 'light', colorScheme: 'light' },
          { id: 'dark', colorScheme: 'dark' },
          ...[...registered.values()].map((definition) => ({ id: definition.id, colorScheme: definition.colorScheme })),
        ],
      };
    },
    setTheme(id) {
      if (id !== 'system' && !['light', 'dark'].includes(id) && !registered.has(id)) {
        throw new Error(`theme "${id}" is not registered`);
      }
      preference = id;
      calls.setTheme.push(id);
      for (const listener of listeners) listener();
    },
  };

  let registration = null;
  const window = {
    __ModuleLoader__: {
      load(value) {
        registration = value;
      },
    },
  };
  new Function('window', 'localStorage', CODE)(window, storage);
  if (registration === null) throw new Error('bundle did not call window.__ModuleLoader__.load');
  if (registration.id !== 'wenfang-themes') throw new Error(`unexpected bundle id ${registration.id}`);
  const exports = registration.factory();
  const ctx = {
    theme,
    effect(effect) {
      return effect();
    },
    on(event, callback) {
      if (event === 'theme/change') listeners.push(callback);
    },
  };
  exports.apply(ctx);

  return {
    ids: [...registered.keys()],
    calls,
    storage,
    preference: () => preference,
    switchTo: (id) => theme.setTheme(id),
  };
}

// 1. First boot, dark preference → first dark variant, remembered.
{
  const storage = createStorage();
  const result = boot({ storage, preference: 'dark' });
  check(result.calls.registered.length === 6, `first boot: expected 6 registrations, got ${result.calls.registered.length}`);
  check(result.preference() === 'wenfang-xuanmo', `first boot: expected wenfang-xuanmo, got ${result.preference()}`);
  check(storage.getItem('wenfang-themes:active') === 'wenfang-xuanmo', 'first boot: active choice not stored');
  check(storage.getItem('wenfang-themes:initialized') === '1', 'first boot: init marker not stored');
  for (const definition of result.calls.registered) {
    check(definition.tokens && Object.keys(definition.tokens).length >= 20, `${definition.id}: fewer than 20 tokens`);
    for (const [name, value] of Object.entries(definition.tokens)) {
      check(name.startsWith('--') && typeof value === 'string', `${definition.id}: bad token ${name}`);
    }
  }
}

// 2. First boot, light preference → first light variant.
{
  const result = boot({ storage: createStorage(), preference: 'light' });
  check(result.preference() === 'wenfang-xuanzhi', `light first boot: expected wenfang-xuanzhi, got ${result.preference()}`);
}

// 3. Stored choice is replayed across boots.
{
  const result = boot({
    storage: createStorage({ 'wenfang-themes:active': 'wenfang-qingci', 'wenfang-themes:initialized': '1' }),
    preference: 'light',
  });
  check(result.preference() === 'wenfang-qingci', `restore: expected wenfang-qingci, got ${result.preference()}`);
}

// 4. Initialized + switched back to a built-in palette → do not override.
{
  const result = boot({
    storage: createStorage({ 'wenfang-themes:initialized': '1' }),
    preference: 'light',
  });
  check(result.preference() === 'light', `built-in respect: expected light to survive, got ${result.preference()}`);
  check(result.calls.setTheme.length === 0, 'built-in respect: plugin called setTheme anyway');
}

// 5. Switching to a built-in palette clears the remembered choice, keeps init.
{
  const storage = createStorage();
  const result = boot({ storage, preference: 'dark' });
  result.switchTo('light');
  check(storage.getItem('wenfang-themes:active') === null, 'switch away: active choice was not cleared');
  check(storage.getItem('wenfang-themes:initialized') === '1', 'switch away: init marker was lost');
}

// 6. Stored but unknown id is ignored (e.g. a removed variant).
{
  const result = boot({
    storage: createStorage({ 'wenfang-themes:active': 'wenfang-removed', 'wenfang-themes:initialized': '1' }),
    preference: 'dark',
  });
  check(result.preference() === 'dark', `unknown saved id: expected built-in dark, got ${result.preference()}`);
}

// 7. Regression — the theme service adopts Host settings asynchronously right
// after boot and snaps the preference back to the built-in value. The bundle must
// re-assert the desired palette instead of leaving the user on the default one.
{
  const storage = createStorage();
  const result = boot({ storage, preference: 'system' });
  check(result.preference() === 'wenfang-xuanmo', `adopt race: expected initial wenfang-xuanmo, got ${result.preference()}`);
  result.switchTo('system'); // what the async settings adoption does a moment later
  await sleep(120);
  check(result.preference() === 'wenfang-xuanmo', `adopt race: expected re-asserted wenfang-xuanmo, got ${result.preference()}`);
  check(storage.getItem('wenfang-themes:active') === 'wenfang-xuanmo', 'adopt race: active choice lost');
}

// 8. After the restore window closes, a deliberate built-in choice is respected.
{
  const storage = createStorage();
  const result = boot({ storage, preference: 'dark' });
  await sleep(4300);
  result.switchTo('light');
  check(result.preference() === 'light', `window expiry: expected light to stay, got ${result.preference()}`);
  check(storage.getItem('wenfang-themes:active') === null, 'window expiry: active choice was not cleared');
}

if (failures.length > 0) {
  console.error(`FAILED (${failures.length}):`);
  for (const message of failures) console.error('  ✗ ' + message);
  process.exit(1);
}
console.log('OK — client bundle: register, restore, adopt-race re-assert and opt-out rules hold');
