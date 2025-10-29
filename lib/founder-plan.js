export function buildFounderLineItem() {
  return {
    price_data: {
      currency: 'usd',
      product_data: { name: 'Founder Lifetime Access' },
      unit_amount: 250000, // integer cents
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
