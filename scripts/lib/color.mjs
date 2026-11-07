/** Minimal sRGB color utilities. No dependencies — this repo's toolchain is plain Node ESM. */

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Parse `#rrggbb` into `[r, g, b]` (0–255, integers).
 * @param {string} hex
 * @returns {[number, number, number]}
 */
export function parseHex(hex) {
  if (typeof hex !== 'string' || !HEX.test(hex)) throw new Error(`invalid hex color: ${JSON.stringify(hex)}`);
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

/**
 * Format `[r, g, b]` as `#rrggbb`.
 * @param {[number, number, number]} rgb
 * @returns {string}
 */
export function toHex(rgb) {
  return '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

/**
 * Mix two colors in sRGB. `t` is the weight of `b`: 0 → a, 1 → b.
 * @param {string} a
 * @param {string} b
 * @param {number} t
 * @returns {string}
 */
export function mix(a, b, t) {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return toHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}

/**
 * WCAG 2.x relative luminance.
 * @param {string} hex
 * @returns {number}
 */
export function luminance(hex) {
  const [r, g, b] = parseHex(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG 2.x contrast ratio between two colors (1–21).
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
