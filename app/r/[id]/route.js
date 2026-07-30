import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../../lib/supabaseConfig";

export const dynamic = "force-dynamic";

function parseUA(ua) {
  ua = ua || "";
  const isTablet = /iPad|Tablet/i.test(ua);
  const isMobile = /Mobile|Android|iPhone|iPod/i.test(ua);
  const device = isTablet ? "Tablet" : isMobile ? "Mobile" : "Desktop";
  let os = "Other";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iOS/i.test(ua)) os = "iOS";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  let browser = "Other";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  return { device, os, browser };
}

// Dynamic QR redirect: logs a scan event (time, device, country), then forwards.
export async function GET(request, { params }) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const h = request.headers;
  const ua = h.get("user-agent") || "";
  const ref = h.get("referer") || "";
  const country = h.get("x-vercel-ip-country") || "";
  const { device, os, browser } = parseUA(ua);

  let content = "/";
  try {
    const { data } = await supabase.rpc("qr_log_scan", {
      p_key: params.id, p_device: device, p_os: os, p_browser: browser, p_referrer: ref, p_country: country,
    });
    if (data) content = data;
  } catch (_) {}

  if (content === "::held::") {
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QR paused</title></head>
      <body style="font-family:Arial,sans-serif;background:#f5f7fc;color:#1b2138;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center">
        <div style="max-width:360px;padding:24px">
          <div style="font-size:40px">⏸️</div>
          <h2 style="margin:10px 0 6px">This QR code is temporarily paused</h2>
          <p style="color:#5f6982;font-size:14px">The owner has put this code on hold. Please check back later.</p>
        </div></body></html>`;
    return new NextResponse(html, { status: 403, headers: { "content-type": "text/html; charset=utf-8" } });
  }

  if (/^https?:\/\//i.test(content)) return NextResponse.redirect(content);
  return new NextResponse(content, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
