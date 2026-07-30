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
