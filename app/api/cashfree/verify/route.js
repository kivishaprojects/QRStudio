import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { getOrder, cashfreeConfigured } from "../../../../lib/cashfree";
import { sendOrderReceipt } from "../../../../lib/email";

export const dynamic = "force-dynamic";

// Called on return from checkout to confirm payment and grant credits immediately.
export async function GET(request) {
  const orderId = new URL(request.url).searchParams.get("order_id");
  if (!orderId) return NextResponse.json({ error: "order_id required" }, { status: 400 });
  if (!cashfreeConfigured()) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "service key missing" }, { status: 503 });
  try {
    const order = await getOrder(orderId);
    if (order.order_status === "PAID") {
      const { data } = await admin.rpc("qr_fulfill_order", { p_order_id: orderId });
      if (data === "fulfilled") await sendOrderReceipt(admin, orderId);
      return NextResponse.json({ status: "paid", fulfilled: data });
    }
    return NextResponse.json({ status: order.order_status || "PENDING" });
  } catch (e) {
    return NextResponse.json({ error: e.message || "verify failed" }, { status: 502 });
  }
}
