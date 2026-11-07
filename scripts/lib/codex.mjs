/**
 * Codex adapter: `themes/wenfang.json` → `codex-theme-v1:…` import strings.
 *
 * The format is Codex-specific and lossy (surface / ink / accent / contrast / diff
 * colors / skill + a built-in syntax theme id). Key order is reproduced exactly so
 * the six strings shipped in the design doc round-trip byte-for-byte; `fixtures/`
 * pins that contract.
 */

/** Built-in Codex syntax theme ids seen in the docs/source at the time of writing. */
export const KNOWN_CODE_THEME_IDS = new Set([
  'ansi',
  'base16',
  'base16-256',
  'base16-eighties-dark',
  'base16-mocha-dark',
  'base16-ocean-dark',
  'base16-ocean-light',
  'catppuccin-frappe',
  'catppuccin-latte',
  'catppuccin-macchiato',
  'catppuccin-mocha',
  'coldark-cold',
  'coldark-dark',
  'dark-neon',
  'dracula',
  'github',
  'inspired-github',
  'gruvbox-dark',
  'gruvbox-light',
  '1337',
  'monokai-extended',
  'monokai-extended-bright',
  'monokai-extended-light',
  'monokai-extended-origin',
  'nord',
  'one-half-dark',
  'one-half-light',
  'solarized-dark',
  'solarized-light',
  'sublime-snazzy',
  'two-dark',
  'zenburn',
]);

/**
 * Build the Codex theme payload object (without the `codex-theme-v1:` prefix).
 * Field order follows the Codex import format as shipped by the design doc.
 * @param {any} variant
 */
export function codexPayload(variant) {
  const { codex, palette } = variant;
  return {
    codeThemeId: codex.codeThemeId,
    theme: {
      accent: palette.accent,
      contrast: codex.contrast,
      fonts: {
        code: codex.fonts?.code ?? null,
        ui: codex.fonts?.ui ?? null,
      },
      ink: palette.ink,
      opaqueWindows: codex.opaqueWindows ?? false,
      semanticColors: {
        diffAdded: palette.diffAdded,
        diffRemoved: palette.diffRemoved,
        skill: palette.skill,
      },
      surface: palette.surface,
    },
    variant: variant.variant,
  };
}

/**
 * Full one-line Codex import string.
 * @param {any} variant
 * @returns {string}
 */
export function codexImportString(variant) {
  return 'codex-theme-v1:' + JSON.stringify(codexPayload(variant));
}
