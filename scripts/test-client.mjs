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
 *   - the asynchronous settings adoption performed by ui-theme (which changes the
 *     preference WITHOUT calling setTheme) does not leave the user on a built-in
 *     palette (regression: real-install test with a durable `dark` preference);
 *   - an explicit built-in choice from the UI (a setTheme call) is respected even
 *     when the Host settings adoption repeats it afterwards.
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
    /** Explicit choice, the way a UI/market calls it. */
    switchTo: (id) => theme.setTheme(id),
    /** What ui-theme's adopt() does: change the preference, notify, no setTheme call. */
    adopt: (id) => {
      preference = id;
      for (const listener of listeners) listener();
    },
  };
}

// 1. First boot, dark preference → first dark variant, remembered.
{
  const storage = createStorage();
  const result = boot({ storage, preference: 'dark' });
  check(result.calls.registered.length === 6, `first boot: expected 6 registrations, got ${result.calls.registered.length}`);
  check(result.preference() === '文房·玄墨', `first boot: expected 文房·玄墨, got ${result.preference()}`);
  check(storage.getItem('wenfang-themes:active') === '文房·玄墨', 'first boot: active choice not stored');
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
  check(result.preference() === '文房·宣纸', `light first boot: expected 文房·宣纸, got ${result.preference()}`);
}

// 3. Stored choice is replayed across boots.
{
  const result = boot({
    storage: createStorage({ 'wenfang-themes:active': '文房·青瓷', 'wenfang-themes:initialized': '1' }),
    preference: 'light',
  });
  check(result.preference() === '文房·青瓷', `restore: expected 文房·青瓷, got ${result.preference()}`);
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

// 7. Regression — durable preference differs from the boot-time default: the
// service adopts `dark` a moment after our setTheme, without calling setTheme.
// The bundle must re-assert the desired palette (not treat it as a user choice).
{
  const storage = createStorage();
  const result = boot({ storage, preference: 'system' });
  check(result.preference() === '文房·玄墨', `adopt race: expected initial 文房·玄墨, got ${result.preference()}`);
  result.adopt('dark');
  await sleep(120);
  check(result.preference() === '文房·玄墨', `adopt race: expected re-asserted 文房·玄墨, got ${result.preference()}`);
  check(storage.getItem('wenfang-themes:active') === '文房·玄墨', 'adopt race: active choice lost');
}

// 8. A stored palette survives adoption on the next boot.
{
  const storage = createStorage({ 'wenfang-themes:active': '文房·青瓷', 'wenfang-themes:initialized': '1' });
  const result = boot({ storage, preference: 'dark' });
  check(result.preference() === '文房·青瓷', `stored + adopt: expected qingci, got ${result.preference()}`);
  result.adopt('dark');
  await sleep(120);
  check(result.preference() === '文房·青瓷', `stored + adopt: expected qingci after adopt, got ${result.preference()}`);
}

// 9. An explicit built-in choice (setTheme from the UI) wins over later adoption.
{
  const storage = createStorage();
  const result = boot({ storage, preference: 'dark' });
  result.switchTo('light');
  await sleep(60);
  check(result.preference() === 'light', `explicit built-in: expected light, got ${result.preference()}`);
  check(storage.getItem('wenfang-themes:active') === null, 'explicit built-in: active choice was not cleared');
  result.adopt('light'); // Host settings push repeats the same durable value
  await sleep(120);
  check(result.preference() === 'light', `explicit built-in: adoption must not resurrect a Wenfang palette, got ${result.preference()}`);
}

// 10. Picking one of our palettes again ends the built-in state.
{
  const storage = createStorage({ 'wenfang-themes:initialized': '1' });
  const result = boot({ storage, preference: 'light' });
  result.switchTo('文房·沧海');
  await sleep(60);
  check(result.preference() === '文房·沧海', `re-pick: expected canghai, got ${result.preference()}`);
  check(storage.getItem('wenfang-themes:active') === '文房·沧海', 're-pick: active choice not stored');
}

// 11. Pre-release ASCII ids migrate to the shipped short labels.
{
  const storage = createStorage({ 'wenfang-themes:active': 'wenfang-xuanmo', 'wenfang-themes:initialized': '1' });
  const result = boot({ storage, preference: 'light' });
  check(result.preference() === '文房·玄墨', `legacy id migration: expected 文房·玄墨, got ${result.preference()}`);
  check(storage.getItem('wenfang-themes:active') === '文房·玄墨', 'legacy id migration: stored id was not rewritten');
}

if (failures.length > 0) {
  console.error(`FAILED (${failures.length}):`);
  for (const message of failures) console.error('  ✗ ' + message);
  process.exit(1);
}
console.log('OK — client bundle: register, restore, adopt-race re-assert and opt-out rules hold');
