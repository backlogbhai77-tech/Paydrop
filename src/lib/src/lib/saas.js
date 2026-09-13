// ReleaseDrop Core Business Engine

export const PLATFORM_CONFIG = {
  name: "ReleaseDrop",
  currencySymbol: "₹",
  currencyCode: "INR",
  standardTakeRate: 0.05, // 5% platform cut on Starter plan
  proTakeRate: 0.02,      // 2% cut on Studio Pro
  minFee: 50,             // Minimum ₹50 platform fee
};

export function calculateFinancials(amount, plan = 'starter') {
  const numAmount = Number(amount) || 0;
  const rate = plan === 'pro' ? PLATFORM_CONFIG.proTakeRate : PLATFORM_CONFIG.standardTakeRate;
  
  const platformFee = Math.max(Math.round(numAmount * rate), PLATFORM_CONFIG.minFee);
  const creatorPayout = Math.max(numAmount - platformFee, 0);

  return {
    grossAmount: numAmount,
    platformFee,
    creatorPayout,
    takeRatePercent: rate * 100
  };
}

export function generateInvoiceNumber(deliveryId) {
  const shortId = deliveryId ? deliveryId.slice(0, 6).toUpperCase() : '000000';
  return `INV-${new Date().getFullYear()}-${shortId}`;
}
