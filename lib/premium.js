/**
 * The one place "is this user Pro?" is decided.
 *
 * Before this helper there were four different answers in the codebase and the
 * same account could resolve differently depending on which one ran:
 *   - checkPremiumStatus()            is_premium OR status active OR tier pro
 *   - transform-quest                 status active ONLY
 *   - dashboard                       is_premium OR status active OR tier pro
 *   - /shop                           no check at all
 * An account with is_premium = true and subscription_status = 'inactive' -- the
 * shape every comped account has -- was Pro on the dashboard and free in
 * transform-quest.
 *
 * The rule:
 *
 *   is_premium = true            -> Pro. This is the comp/founder flag. It is
 *                                  set by hand and by verify-checkout, and it
 *                                  is deliberately independent of Stripe so a
 *                                  granted account survives having no
 *                                  subscription behind it.
 *   subscription_status='active' -> Pro. This is what the Stripe webhook
 *                                  maintains, so a real subscriber is Pro even
 *                                  if is_premium was never written.
 *
 * subscription_tier is deliberately NOT consulted. It is a label, not an
 * entitlement: nothing resets it when a subscription lapses, so trusting it
 * would keep a cancelled subscriber Pro forever. Verified against live data
 * before excluding it -- zero accounts have tier='pro' without one of the two
 * signals above, so no one is demoted by ignoring it.
 *
 * Read-only. This never writes, so Stripe reconciliation is unaffected: the
 * webhook keeps owning subscription_status and this helper just reads it.
 */
export function isPremium(profile) {
  if (!profile) return false;
  return profile.is_premium === true || profile.subscription_status === 'active';
}

/** Columns any query must select for isPremium() to be able to decide. */
export const PREMIUM_COLUMNS = 'is_premium, subscription_status';
