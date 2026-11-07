/**
 * Wenfang · 文房六色 — host half.
 *
 * The palettes live entirely in the browser half (`lib/client.js`, generated).
 * Cordis still requires every loader row to resolve to a valid plugin (a function
 * or an object with `apply`), so this file only provides that shape — some loader
 * paths read the default export directly.
 */
export const name = 'wenfang-themes';

/** No host services, settings, or routes are needed. */
export function apply() {}

const plugin = { name, apply };

export default plugin;
