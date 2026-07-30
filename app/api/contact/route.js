import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { sendEnquiry } from "../../../lib/email";

export const dynamic = "force-dynamic";

// Public contact form. Stores the enquiry and emails the business inbox.
export async function POST(request) {
  const admin = supabaseAdmin();
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().slice(0, 160);
  const phone = String(body.phone || "").trim().slice(0, 20);
  const subject = String(body.subject || "").trim().slice(0, 160);
  const message = String(body.message || "").trim().slice(0, 4000);

  if (!name || !message) return NextResponse.json({ error: "Please add your name and a message." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });

  if (admin) {
    // basic per-IP rate limit (5 / hour)
    const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
    try {
      const { data: ok } = await admin.rpc("qr_rate_limit", { p_key: "contact:" + ip, p_max: 5, p_window: 3600 });
      if (ok === false) return NextResponse.json({ error: "Too many messages — please try again later." }, { status: 429 });
    } catch (_) {}
    await admin.from("qs_enquiries").insert({ name, email, phone, subject, message });
  }

  try { await sendEnquiry({ name, email, phone, subject, message }); } catch (_) {}
  return NextResponse.json({ ok: true });
}
