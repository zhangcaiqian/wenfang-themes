/**
 * DSH adapter: `themes/wenfang.json` → registered DeepSeek Harness themes.
 *
 * A DSH theme is a `ThemeDefinition` ({ id, colorScheme, tokens }): one flat token
 * map for one palette. The six Codex variants therefore become six registered DSH
 * themes; the client bundle registers all of them and restores the last choice.
 *
 * Derivation rule: the five hand-tuned Codex colors (surface / ink / accent /
 * diffAdded / diffRemoved) are the source of truth. Every other DSH alias is
 * derived by mixing those toward each other, so a change in the design source
 * propagates to every token. `dsh.tokenOverrides` in the source file is the escape
 * hatch for tokens a designer wants to pin by hand.
 *
 * Token names: the 14 names in DSH's `BUILTIN_INSPECT_TOKENS` are the official
 * baseline; the rest are best-effort names observed in `ui-theme`'s stylesheets.
 * Unknown names are harmless at runtime (they become unused inline variables), but
 * they are only worth keeping once a real render confirms them.
 */

import { mix } from './color.mjs';

/** DSH theme id prefix (separate from the Codex string, which has no id). */
export const SERIES_SLUG = 'wenfang';

/** Warn amber: Codex has no warn slot, so the series pins one physical amber. */
const WARN = { dark: '#d6a01d', light: '#a86a00' };

/**
 * DSH theme id for one variant, e.g. `wenfang-xuanmo`.
 * @param {any} variant
 */
export function dshThemeId(variant) {
  return `${SERIES_SLUG}-${variant.id}`;
}

/**
 * Derive the flat `--dsw-*` token map for one variant.
 * @param {any} variant
 * @returns {Record<string, string>}
 */
export function deriveDshTokens(variant) {
  const { surface, ink, accent, diffAdded, diffRemoved, skill } = variant.palette;
  const dark = variant.variant === 'dark';
  /** Toward ink: raised surfaces and stronger borders. */
  const lift = (t) => mix(surface, ink, t);
  /** Toward surface: dimmer text. */
  const fade = (t) => mix(ink, surface, t);

  const derived = {
    // Canvas and surface ladder.
    '--dsw-alias-bg-base': surface,
    '--dsw-alias-bg-layer-1': lift(0.055),
    '--dsw-alias-bg-layer-2': lift(0.095),
    '--dsw-alias-bg-layer-3': lift(0.135),
    '--dsw-alias-bg-layer-4': lift(0.175),
    '--dsw-alias-bg-overlay': lift(0.12),
    '--dsw-specific-sidebar-fill': lift(0.045),
    // Borders.
    '--dsw-alias-border-l1': lift(0.16),
    '--dsw-alias-border-l2': lift(0.26),
    '--dsw-alias-border-l3': lift(0.34),
    // Text ladder.
    '--dsw-alias-label-primary': ink,
    '--dsw-alias-label-secondary': fade(0.28),
    '--dsw-alias-label-tertiary': fade(0.45),
    '--dsw-alias-label-quaternary': fade(0.6),
    '--dsw-alias-state-idle-primary': fade(0.45),
    // Brand, links, states.
    '--dsw-alias-brand-primary': accent,
    '--dsw-alias-state-business-primary': accent,
    '--dsw-alias-link': accent,
    '--dsw-focus-ring-color': accent,
    '--dsw-alias-state-success-primary': diffAdded,
    '--dsw-alias-state-error-primary': diffRemoved,
    '--dsw-alias-state-warn-primary': WARN[dark ? 'dark' : 'light'],
    // Diffs (backgrounds, not foregrounds).
    '--dsw-alias-code-diff-added': mix(surface, diffAdded, 0.18),
    '--dsw-alias-code-diff-deleted': mix(surface, diffRemoved, 0.18),
    // Selection, menus, scrollbars.
    '--dsw-alias-bg-document-selection': mix(surface, accent, 0.35),
    '--dsw-menu-surface-fill': lift(0.1),
    '--dsw-alias-menu-group-header-fill': lift(0.1),
    '--dsw-alias-tooltip-key-bg': lift(0.16),
    '--dsw-alias-scrollbar-thumb': lift(0.2),
    // The Codex `skill` (type) color has no verified DSH alias; the business
    // tertiary slot is the closest semantic stand-in.
    '--dsw-alias-state-business-tertiary': skill,
    // Pre-existing setting: keep the terminal cell size out of the theme.
  };

  return { ...derived, ...(variant.dsh?.tokenOverrides ?? {}) };
}

/**
 * Build the six `ThemeDefinition`s embedded into the browser bundle.
 * @param {any} doc parsed `themes/wenfang.json`
 */
export function dshThemes(doc) {
  return doc.variants.map((variant) => ({
    id: dshThemeId(variant),
    labelZh: variant.nameZh,
    labelEn: variant.nameEn,
    colorScheme: variant.variant,
    tagline: variant.tagline,
    tokens: deriveDshTokens(variant),
  }));
}
