// DEPRECATED: Founder lifetime plan removed. Pricing now uses Stripe Payment Links.
// See app/pricing/page.js for current plans: Pro Monthly ($5/mo) and Early Bird ($29/yr).
// Keeping file for reference only — not used in active checkout flow.
export function buildFounderLineItem() {
  return {
    price_data: {
      currency: 'usd',
      product_data: { name: 'Founder Lifetime Access' },
      unit_amount: 4700, // $47.00 in cents (4700 cents = $47.00)
    },
    quantity: 1,
  };
}

export function buildFounderCheckoutMetadata(userId) {
  return {
    userId,
    plan: 'founder_lifetime',
    created_at: new Date().toISOString(),
  };
}
