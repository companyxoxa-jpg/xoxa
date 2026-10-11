export const normalizeBillingMonthlyPrice = (plan) => {
  const storedPrice = Number(plan?.monthly_price || 0);

  // The original Standard plan was seeded at 24.99, while the contracted and
  // Stripe-backed price is 24.95. Keep old records compatible and make every
  // internal view reflect the amount that is actually charged.
  return storedPrice === 2499 ? 2495 : storedPrice;
};
