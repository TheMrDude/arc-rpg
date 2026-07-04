/**
 * ISO week key like "2026-W27" (Monday-Sunday weeks). Used to gate
 * once-per-week grants (momentum bonus, momentum boost, weekly chronicle
 * card) consistently between client and server.
 */
export function getIsoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNum}`;
}

/** YYYY-MM-DD in local time, used for daily localStorage gates. */
export function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
