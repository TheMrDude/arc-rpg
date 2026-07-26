/**
 * The last thing between raw model output and a child's screen.
 *
 * This was private to app/api/transform-quest, which meant the landing-page
 * demo -- the one route with no login in front of it -- passed
 * `message.content[0].text` straight to the page with no checking at all. Two
 * routes generating quest prose for children had two different amounts of
 * safety, and the unauthenticated one had none.
 *
 * Extracted so both use the same path, and so it can be unit-tested. It could
 * not be before: it was an unexported function inside a route module.
 */

/**
 * Words that mean the model leaked its own instructions rather than answering.
 * If any survive into the text, it is not a quest and must not be shown.
 */
export const FORMAT_MARKERS = [
  'QUEST:', 'DIFFICULTY:', 'STORY_THREAD:', 'NARRATIVE_IMPACT:', 'TASK:',
  'AUDIENCE AND TONE', 'NEVER WRITE', 'THE STEALTH RULE', 'OUTPUT FORMAT',
  'ALWAYS FINE', 'WORST CASE', 'CRAFT:',
];

export const MAX_FALLBACK_WORDS = 40;

/**
 * Try to rescue a usable quest sentence from a response that missed the format.
 *
 * Returns null rather than guessing. The caller then falls back to the player's
 * own task text, which is always safe because the player wrote it -- there is no
 * path where unvalidated model output reaches the page.
 */
export function salvageQuestText(response) {
  if (!response || typeof response !== 'string') return null;

  // Prefer the first one or two sentences of prose before any JSON or fence.
  const beforeStructure = response.split(/```|\{/)[0] || '';
  const sentences = beforeStructure.match(/[^.!?]+[.!?]+/g);
  const candidate = (sentences ? sentences.slice(0, 2).join(' ') : beforeStructure).trim();

  if (!candidate) return null;
  if (candidate.split(/\s+/).length > MAX_FALLBACK_WORDS) return null;
  if (candidate.length < 12) return null;
  const upper = candidate.toUpperCase();
  if (FORMAT_MARKERS.some((m) => upper.includes(m))) return null;

  return candidate;
}

/**
 * Pull the quest line out of a `QUEST: ...` response, salvaging if the format
 * was missed, and returning null if nothing usable survives.
 *
 * Kept next to salvageQuestText so a caller cannot accidentally use the raw
 * response when parsing fails -- the only two outcomes are a checked string or
 * null.
 */
export function parseQuestLine(response) {
  if (!response || typeof response !== 'string') return null;

  const line = response.match(/^\s*QUEST:\s*(.+)$/im);
  if (line) {
    const text = line[1].trim();
    // Still bounded and still marker-checked: a model that emits
    // "QUEST: OUTPUT FORMAT ..." has leaked, format compliance notwithstanding.
    if (
      text.length >= 12 &&
      text.split(/\s+/).length <= MAX_FALLBACK_WORDS &&
      !FORMAT_MARKERS.some((m) => text.toUpperCase().includes(m))
    ) {
      return text;
    }
    return null;
  }

  return salvageQuestText(response);
}
