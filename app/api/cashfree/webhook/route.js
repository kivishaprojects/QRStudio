import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { getOrder } from "../../../../lib/cashfree";
import { sendOrderReceipt } from "../../../../lib/email";

export const dynamic = "force-dynamic";

// Cashfree server-to-server webhook — the reliable path (fires even if the user closes the tab).
export async function POST(request) {
  const raw = await request.text();
  const signature = request.headers.get("x-webhook-signature") || "";
  const timestamp = request.headers.get("x-webhook-timestamp") || "";
  const secret = process.env.CASHFREE_SECRET_KEY || "";

  // Verify signature: base64(HMAC-SHA256(timestamp + rawBody, secret))
  if (secret && signature) {
    const expected = crypto.createHmac("sha256", secret).update(timestamp + raw).digest("base64");
    if (expected !== signature) return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const orderId = payload && payload.data && payload.data.order && payload.data.order.order_id;
  if (orderId) {
    const admin = supabaseAdmin();
    try {
      const order = await getOrder(orderId); // re-confirm with Cashfree before granting
      if (order.order_status === "PAID" && admin) {
        const { data } = await admin.rpc("qr_fulfill_order", { p_order_id: orderId });
        if (data === "fulfilled") await sendOrderReceipt(admin, orderId);
      }
    } catch (_) {}
  }
  return NextResponse.json({ ok: true });
}
