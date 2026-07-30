import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { gstVerifyConfigured, verifyGstin } from "../../../../lib/cashfree";
import { isValidGstin, normalizeGstin, stateFromGstin } from "../../../../lib/gst";

export const dynamic = "force-dynamic";

// Auto-fetch business details from a GSTIN via Cashfree Verification Suite.
// Requires a logged-in user (prevents anonymous abuse of the paid API).
export async function POST(request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Rate limit: this route calls a paid third-party API — cap per user.
  const admin = supabaseAdmin();
  if (admin) {
    const { data: ok } = await admin.rpc("qr_rate_limit", { p_key: "gst:" + user.id, p_max: 20, p_window: 3600 });
    if (ok === false) return NextResponse.json({ error: "Too many lookups — please try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const gstin = normalizeGstin(body.gstin);
  if (!isValidGstin(gstin)) return NextResponse.json({ error: "Invalid GSTIN format" }, { status: 400 });

  if (!gstVerifyConfigured()) {
    // No verification credentials — let the client fall back to state-only derivation.
    return NextResponse.json({ configured: false, state: stateFromGstin(gstin) });
  }

  try {
    const r = await verifyGstin(gstin);
    if (!r.valid || (r.status && /cancel|inactive|suspend/i.test(r.status))) {
      return NextResponse.json({ configured: true, valid: false, status: r.status || "invalid", state: r.state || stateFromGstin(gstin) });
    }
    return NextResponse.json({
      configured: true,
      valid: true,
      legalName: r.legalName,
      tradeName: r.tradeName,
      state: r.state || stateFromGstin(gstin),
      city: r.city,
      pincode: r.pincode,
      address: r.address,
      status: r.status,
    });
  } catch (e) {
    return NextResponse.json({ configured: true, error: e.message || "Lookup failed", state: stateFromGstin(gstin) }, { status: 502 });
  }
}
