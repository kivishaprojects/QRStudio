import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { createOrder, cashfreeConfigured } from "../../../../lib/cashfree";

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

  const orderId = "qrs" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  await admin.from("qs_orders").insert({ id: orderId, user_id: user.id, kind, plan, qty, amount, status: "pending" });

  const origin = new URL(request.url).origin;
  try {
    const cf = await createOrder({
      orderId, amount,
      customer: { id: user.id, email: user.email, phone: "9999999999" },
      returnUrl: `${origin}/dashboard?order_id={order_id}`,
      notifyUrl: `${origin}/api/cashfree/webhook`,
    });
    return NextResponse.json({ configured: true, orderId, paymentSessionId: cf.payment_session_id, amount });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Cashfree error" }, { status: 502 });
  }
}
