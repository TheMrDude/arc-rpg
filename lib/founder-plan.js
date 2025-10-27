export const FOUNDER_PLAN_METADATA = Object.freeze({
  plan: 'founder_lifetime',
  transactionType: 'founder_purchase',
});

export const FOUNDER_PRICE = Object.freeze({
  amount: 4700, // $47.00 USD in cents
  currency: 'usd',
});

export const FOUNDER_PRODUCT = Object.freeze({
  name: 'ARC RPG Founder Access',
  description:
    'Lifetime access - recurring quests, weekly AI stories, archetype switching, and all future features. Limited to 25 people.',
});

export function buildFounderCheckoutMetadata(userId) {
  const normalizedUserId = userId ? String(userId) : '';

  return {
    plan: FOUNDER_PLAN_METADATA.plan,
    transaction_type: FOUNDER_PLAN_METADATA.transactionType,
    supabase_user_id: normalizedUserId,
    userId: normalizedUserId,
  };
}

export function buildFounderLineItem() {
  return {
    price_data: {
      currency: FOUNDER_PRICE.currency,
      product_data: {
        name: FOUNDER_PRODUCT.name,
        description: FOUNDER_PRODUCT.description,
      },
      unit_amount: FOUNDER_PRICE.amount,
    },
    quantity: 1,
  };
}

export function isFounderCheckoutSession(session) {
  if (!session) {
    return {
      metadataMatches: false,
      amountMatches: false,
      currencyMatches: false,
      metadata: {},
      amount: 0,
      currency: '',
    };
  }

  const metadata = session.metadata ?? {};
  const amount = session.amount_total ?? 0;
  const currency = session.currency?.toLowerCase?.() ?? '';

  const metadataMatches =
    metadata.plan === FOUNDER_PLAN_METADATA.plan ||
    metadata.transaction_type === FOUNDER_PLAN_METADATA.transactionType;

  const amountMatches = amount === FOUNDER_PRICE.amount;
  const currencyMatches = currency === FOUNDER_PRICE.currency;

  return {
    metadataMatches,
    amountMatches,
    currencyMatches,
    metadata,
    amount,
    currency,
  };
}
