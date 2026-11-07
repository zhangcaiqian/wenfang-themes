/**
 * README swatches: one small "agent window" mock per variant, rendered as SVG.
 *
 * Pure shapes + Latin text only (hex codes, "Aa", "+ added"), so the image renders
 * identically on GitHub, npm and any browser without depending on CJK fonts.
 * Colors come from the DSH token derivation, so the picture shows the same surface
 * ladder, borders, diff tints and brand color the theme actually produces.
 */

/**
 * XML-escape text used inside the SVG template.
 * @param {string} value
 */
const esc = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);

/**
 * Render one 640×208 preview card.
 * @param {any} variant variant from themes/wenfang.json
 * @param {Record<string, string>} tokens derived DSH tokens for that variant
 * @returns {string} SVG document
 */
export function swatchSvg(variant, tokens) {
  const { surface, accent, diffAdded, diffRemoved } = variant.palette;
  const text = tokens['--dsw-alias-label-primary'];
  const dim = tokens['--dsw-alias-label-tertiary'];
  const layer1 = tokens['--dsw-alias-bg-layer-1'];
  const layer2 = tokens['--dsw-alias-bg-layer-2'];
  const border = tokens['--dsw-alias-border-l1'];
  const codeAdded = tokens['--dsw-alias-code-diff-added'];
  const codeDeleted = tokens['--dsw-alias-code-diff-deleted'];
  const font = "ui-sans-serif, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  const hex = (value) => esc(value.replace('#', ''));
  const label = esc(variant.nameEn) + (variant.variant === 'light' ? ' light' : '');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="208" viewBox="0 0 640 208" role="img" aria-label="Wenfang ${label}">
  <title>Wenfang — ${label}</title>
  <rect width="640" height="208" rx="16" fill="${esc(surface)}"/>
  <rect x="0.5" y="0.5" width="639" height="207" rx="15.5" fill="none" stroke="${esc(border)}"/>

  <text x="24" y="42" font-family="${font}" font-size="20" font-weight="600" fill="${esc(text)}">${esc(variant.nameEn)}</text>
  <text x="24" y="62" font-family="${font}" font-size="11" fill="${esc(dim)}">Wenfang · ${esc(variant.variant)} · ${esc(variant.codex.codeThemeId)}</text>

  <circle cx="478" cy="34" r="7" fill="${esc(accent)}"/>
  <text x="478" y="56" text-anchor="middle" font-family="${font}" font-size="9" fill="${esc(dim)}">${hex(accent)}</text>
  <circle cx="544" cy="34" r="7" fill="${esc(diffAdded)}"/>
  <text x="544" y="56" text-anchor="middle" font-family="${font}" font-size="9" fill="${esc(dim)}">${hex(diffAdded)}</text>
  <circle cx="610" cy="34" r="7" fill="${esc(diffRemoved)}"/>
  <text x="610" y="56" text-anchor="middle" font-family="${font}" font-size="9" fill="${esc(dim)}">${hex(diffRemoved)}</text>

  <rect x="24" y="84" width="300" height="100" rx="10" fill="${esc(layer1)}" stroke="${esc(border)}"/>
  <rect x="40" y="102" width="200" height="7" rx="3.5" fill="${esc(text)}" opacity="0.88"/>
  <rect x="40" y="118" width="240" height="7" rx="3.5" fill="${esc(text)}" opacity="0.55"/>
  <rect x="40" y="134" width="150" height="7" rx="3.5" fill="${esc(dim)}" opacity="0.8"/>
  <rect x="40" y="152" width="72" height="20" rx="10" fill="${esc(accent)}"/>
  <text x="76" y="166" text-anchor="middle" font-family="${font}" font-size="10" font-weight="600" fill="${esc(surface)}">Aa</text>
  <rect x="122" y="152" width="46" height="20" rx="10" fill="none" stroke="${esc(border)}"/>
  <text x="145" y="166" text-anchor="middle" font-family="${font}" font-size="10" fill="${esc(dim)}">···</text>

  <rect x="340" y="84" width="276" height="100" rx="10" fill="${esc(layer2)}" stroke="${esc(border)}"/>
  <rect x="348" y="94" width="260" height="24" rx="6" fill="${esc(codeAdded)}"/>
  <text x="356" y="110" font-family="${font}" font-size="11" fill="${esc(diffAdded)}">+ added</text>
  <rect x="348" y="122" width="260" height="24" rx="6" fill="${esc(codeDeleted)}"/>
  <text x="356" y="138" font-family="${font}" font-size="11" fill="${esc(diffRemoved)}">- removed</text>
  <rect x="356" y="154" width="180" height="6" rx="3" fill="${esc(dim)}" opacity="0.5"/>
  <rect x="356" y="166" width="120" height="6" rx="3" fill="${esc(dim)}" opacity="0.35"/>
</svg>
`;
}
