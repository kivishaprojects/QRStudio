import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { normalizeCoupon, couponError, applyCoupon } from "../../../../lib/coupon";

export const dynamic = "force-dynamic";

// Preview a coupon's discount for a given amount (does not reserve/redeem it).
export async function POST(request) {
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ valid: false, error: "Unavailable" }, { status: 503 });
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ valid: false, error: "Not authenticated" }, { status: 401 });

  // Rate limit coupon guessing per user.
  const { data: ok } = await admin.rpc("qr_rate_limit", { p_key: "coupon:" + user.id, p_max: 20, p_window: 60 });
  if (ok === false) return NextResponse.json({ valid: false, error: "Too many attempts — please wait a moment." }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const code = normalizeCoupon(body.coupon);
  const amount = Number(body.amount) || 0;
  if (!code) return NextResponse.json({ valid: false, error: "Enter a coupon code" });

  const { data: coupon } = await admin.from("qs_coupons").select("*").eq("code", code).maybeSingle();
  const err = couponError(coupon);
  if (err) return NextResponse.json({ valid: false, error: err });

  const { discount, final } = applyCoupon(coupon, amount);
  return NextResponse.json({
    valid: true, code, kind: coupon.kind, value: coupon.value, discount, final,
    label: coupon.kind === "percent" ? `${coupon.value}% off` : `₹${coupon.value} off`,
  });
}
