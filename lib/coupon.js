// Shared coupon helpers used by the validate endpoint and order creation.
export function normalizeCoupon(c) {
  return String(c || "").toUpperCase().trim();
}

// Returns an error message if the coupon can't be used, else null.
export function couponError(coupon) {
  if (!coupon) return "Coupon not found";
  if (!coupon.active) return "This coupon is not active";
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return "This coupon has expired";
  if (coupon.max_redemptions != null && coupon.redeemed >= coupon.max_redemptions) return "This coupon has reached its usage limit";
  return null;
}

// Computes the discount and final payable amount (final is capped at a ₹1 minimum
// so the payment gateway always has a chargeable amount).
export function applyCoupon(coupon, amount) {
  const a = Number(amount) || 0;
  let d = coupon.kind === "percent" ? a * (Number(coupon.value) / 100) : Number(coupon.value);
  if (d > a) d = a;
  const final = Math.max(1, +(a - d).toFixed(2));
  return { discount: +(a - final).toFixed(2), final };
}
