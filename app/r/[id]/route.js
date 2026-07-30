import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../../lib/supabaseConfig";

// Dynamic QR redirect: increments the scan counter, then forwards to the target.
export async function GET(_req, { params }) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  let content = "/";
  try {
    const { data } = await supabase.rpc("qr_track_scan", { p_key: params.id });
    if (data) content = data;
  } catch (_) {}
  if (/^https?:\/\//i.test(content)) {
    return NextResponse.redirect(content);
  }
  // Non-URL payloads (WiFi, vCard, text…) — show the raw content.
  return new NextResponse(content, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
