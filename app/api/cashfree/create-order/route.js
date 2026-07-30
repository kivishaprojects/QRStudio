import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { createOrder, cashfreeConfigured } from "../../../../lib/cashfree";
import { isValidGstin, isValidPincode, normalizeGstin, stateFromGstin, taxTypeFor } from "../../../../lib/gst";

export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!cashfreeConfigured()) return NextResponse.json({ configured: false, error: "Cashfree not configured" }, { status: 503 });
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ configured: false, error: "Service role key missing" }, { status: 503 });

  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const kind = body.kind;
  const phone = String(body.phone || "").replace(/[^0-9]/g, "").slice(-10);

  // Amounts are computed from the DB — never trusted from the client.
  let amount = 0, plan = null, qty = null;
  if (kind === "plan") {
    const { data: pl } = await admin.from("qr_plans").select("*").eq("id", body.planId).single();
    if (!pl || pl.id === "free") return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    amount = pl.price; plan = pl.id;
  } else if (kind === "addon") {
    qty = Math.max(1, parseInt(body.qty, 10) || 0);
    const { data: prof } = await admin.from("qr_profiles").select("plan").eq("id", user.id).single();
    const { data: pl } = await admin.from("qr_plans").select("addon_rate").eq("id", prof?.plan || "free").single();
    amount = (pl?.addon_rate || 100) * qty;
  } else {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }
  if (amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

  // ---- Mandatory GST declaration (before a payment link is issued) ----
  const gst = body.gst || {};
  const gstApplicable = gst.applicable === true || gst.applicable === "yes";
  let gstFields = { gst_applicable: false, buyer_gstin: null, buyer_name: null, buyer_state: null, buyer_city: null, buyer_pincode: null, tax_type: "cgst_sgst" };
  if (gst.applicable === undefined || gst.applicable === null || gst.applicable === "") {
    return NextResponse.json({ error: "Please declare whether GST is applicable before proceeding." }, { status: 400 });
  }
  if (gstApplicable) {
    const gstin = normalizeGstin(gst.gstin);
    const city = String(gst.city || "").trim();
    const pincode = String(gst.pincode || "").trim();
    if (!isValidGstin(gstin)) return NextResponse.json({ error: "Enter a valid 15-character GSTIN." }, { status: 400 });
    if (!city) return NextResponse.json({ error: "City is required for a GST invoice." }, { status: 400 });
    if (!isValidPincode(pincode)) return NextResponse.json({ error: "Enter a valid 6-digit pincode." }, { status: 400 });
    const state = stateFromGstin(gstin);
    if (!state) return NextResponse.json({ error: "Could not read the state from that GSTIN." }, { status: 400 });
    // seller state comes from the business GSTIN in settings (defaults to Gujarat)
    const { data: st } = await admin.from("qs_settings").select("gstin").eq("id", 1).single();
    const taxType = taxTypeFor(gstin, st && st.gstin);
    const name = String(gst.name || "").trim().slice(0, 200) || null;
    gstFields = { gst_applicable: true, buyer_gstin: gstin, buyer_name: name, buyer_state: state, buyer_city: city, buyer_pincode: pincode, tax_type: taxType };
  }

  const orderId = "qrs" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  await admin.from("qs_orders").insert({ id: orderId, user_id: user.id, kind, plan, qty, amount, status: "pending", ...gstFields });
  if (phone && phone.length >= 10) { await admin.from("qr_profiles").update({ phone }).eq("id", user.id); }

  const origin = new URL(request.url).origin;
  try {
    const cf = await createOrder({
      orderId, amount,
      customer: { id: user.id, email: user.email, phone: phone && phone.length >= 10 ? phone : "9999999999" },
      returnUrl: `${origin}/dashboard?order_id={order_id}`,
      notifyUrl: `${origin}/api/cashfree/webhook`,
    });
    return NextResponse.json({ configured: true, orderId, paymentSessionId: cf.payment_session_id, amount });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Cashfree error" }, { status: 502 });
  }
}
