export function buildFounderLineItem() {
  return {
    price_data: {
      currency: 'usd',
      product_data: { name: 'Founder Lifetime Access' },
      unit_amount: 4700, // $47.00
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
