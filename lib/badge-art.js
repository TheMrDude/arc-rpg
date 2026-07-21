/**
 * Placeholder Legendary Badge art — self-contained SVG heraldic shields,
 * one accent color per badge. No external fonts, images, or network calls
 * (zero cost at rest). Final art comes from Canva later; these are the
 * shippable placeholders and match the app's dark theme.
 */

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * @param {object} badge  a BADGES entry (needs id, name, emoji, color, accent)
 * @param {object} [opts]
 * @param {boolean} [opts.earned=true]  false renders a locked silhouette
 * @returns {string} SVG markup
 */
export function buildBadgeSvg(badge, { earned = true } = {}) {
  const color = earned ? badge.color : '#2A2E45';
  const accent = earned ? badge.accent : '#3A3F5C';
  const stroke = earned ? '#0B0E1A' : '#1B1F33';
  const glyph = earned ? badge.emoji : '🔒';
  const name = earned ? badge.name : '???';
  const nameColor = earned ? '#0B0E1A' : '#6B7192';
  const gid = `g${badge.id}`;
  const rid = `r${badge.id}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 460" role="img" aria-label="${escapeXml(
    name,
  )} badge">
  <defs>
    <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${accent}"/>
      <stop offset="1" stop-color="${color}"/>
    </linearGradient>
    <radialGradient id="${rid}" cx="0.5" cy="0.38" r="0.7">
      <stop offset="0" stop-color="#ffffff" stop-opacity="${earned ? 0.35 : 0.05}"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="400" height="460" fill="#0F1424"/>
  <!-- shield -->
  <path d="M200 30 L350 80 L350 250 Q350 380 200 430 Q50 380 50 250 L50 80 Z"
        fill="url(#${gid})" stroke="${stroke}" stroke-width="10" stroke-linejoin="round"/>
  <path d="M200 30 L350 80 L350 250 Q350 380 200 430 Q50 380 50 250 L50 80 Z"
        fill="url(#${rid})"/>
  <!-- inner rim -->
  <path d="M200 62 L322 102 L322 248 Q322 356 200 400 Q78 356 78 248 L78 102 Z"
        fill="none" stroke="${stroke}" stroke-opacity="0.25" stroke-width="4"/>
  <!-- glyph -->
  <text x="200" y="235" font-size="150" text-anchor="middle" dominant-baseline="central">${escapeXml(
    glyph,
  )}</text>
  <!-- name ribbon -->
  <rect x="60" y="300" width="280" height="54" rx="10" fill="${stroke}" fill-opacity="0.82"/>
  <text x="200" y="335" font-size="30" font-family="'Georgia','Times New Roman',serif" font-weight="700"
        text-anchor="middle" fill="${earned ? accent : nameColor}">${escapeXml(name)}</text>
  <!-- wordmark -->
  <text x="200" y="452" font-size="15" letter-spacing="4" font-family="system-ui,-apple-system,sans-serif"
        text-anchor="middle" fill="${earned ? '#0B0E1A' : '#3A3F5C'}" fill-opacity="0.7">HABITQUEST</text>
</svg>`;
}
