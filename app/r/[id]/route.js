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

const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function page(bodyInner) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>India QRCode</title>
<style>
:root{--brand:#152a63;--brand2:#25409a;--accent:#2ea24d;--saffron:#f47a1f;--txt:#16224c;--soft:#5b6685;--line:#e2e8f3}
*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;background:#f6f8fc;color:var(--txt);margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:22px}
.tri{position:fixed;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--saffron) 0 33.3%,#fff 33.3% 66.6%,var(--accent) 66.6% 100%)}
.card{background:#fff;border:1px solid var(--line);border-radius:18px;max-width:400px;width:100%;padding:26px;box-shadow:0 14px 44px rgba(21,42,99,.12)}
.brand{margin-bottom:18px;text-align:center}.brand img{height:60px}
h1{font-size:20px;margin:0 0 4px}.sub{color:var(--soft);font-size:13.5px;margin:0 0 18px}
.row{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);font-size:14px}
.row .k{color:var(--soft)}.row .v{font-weight:600;text-align:right;word-break:break-word}
.btn{display:block;text-align:center;text-decoration:none;background:linear-gradient(135deg,#f79024,var(--saffron));color:#fff;font-weight:700;padding:13px;border-radius:11px;margin-top:16px;font-size:15px;border:none;width:100%;cursor:pointer}
.txt{white-space:pre-wrap;line-height:1.6;font-size:15px}
.foot{color:var(--soft);font-size:11.5px;text-align:center;margin-top:20px}
</style></head><body><div class="tri"></div><div class="card">
<div class="brand"><img src="https://www.indiaqrcode.com/logo.png" alt="India QR Code"/></div>
${bodyInner}
<div class="foot">Powered by India QRCode · indiaqrcode.com</div>
</div></body></html>`;
}

// Hosted "smart page" renderers (Link Page, Menu, Google Review).
function smartPage(cfg) {
  if (cfg.kind === "linkbio") {
    const links = (cfg.links || []).map((l) => `<a class="btn" style="background:#fff;color:var(--brand);border:1px solid var(--line)" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || l.url)}</a>`).join("");
    return page(`<h1 style="text-align:center">${esc(cfg.title) || "Links"}</h1>${cfg.subtitle ? `<p class="sub" style="text-align:center">${esc(cfg.subtitle)}</p>` : ""}${links || '<p class="sub">No links yet.</p>'}`);
  }
  if (cfg.kind === "review") {
    return page(`<h1 style="text-align:center">${esc(cfg.business) || "Rate us"}</h1>
      <div style="text-align:center;font-size:30px;color:#f5b301;margin:6px 0 4px">★★★★★</div>
      <p class="sub" style="text-align:center">${esc(cfg.subtitle) || "We'd love your feedback on Google."}</p>
      ${cfg.url ? `<a class="btn" href="${esc(cfg.url)}" target="_blank" rel="noopener">Leave a Google review</a>` : ""}`);
  }
  if (cfg.kind === "menu") {
    const secs = (cfg.sections || []).map((s) => {
      const items = (s.items || []).map((it) => `<div class="row"><span class="v" style="font-weight:500;text-align:left">${esc(it.name)}${it.desc ? `<div style="font-size:12px;color:var(--soft);font-weight:400">${esc(it.desc)}</div>` : ""}</span><span class="k" style="white-space:nowrap">${it.price ? "₹" + esc(it.price) : ""}</span></div>`).join("");
      return `${s.name ? `<h2 style="font-size:15px;margin:16px 0 4px;color:var(--brand)">${esc(s.name)}</h2>` : ""}${items}`;
    }).join("");
    return page(`<h1>${esc(cfg.title) || "Menu"}</h1>${cfg.note ? `<p class="sub">${esc(cfg.note)}</p>` : ""}${secs || '<p class="sub">Menu coming soon.</p>'}`);
  }
  return page(`<h1>India QR Code</h1>`);
}

// Renders a friendly landing page for non-URL dynamic content.
function landing(content) {
  const c = content || "";
  // Hosted smart pages (stored as JSON config)
  try { const cfg = JSON.parse(c); if (cfg && cfg.kind) return smartPage(cfg); } catch (_) {}
  // WiFi
  if (/^WIFI:/i.test(c)) {
    const g = (re) => (c.match(re) || [, ""])[1];
    const ssid = g(/S:([^;]*)/i), pass = g(/P:([^;]*)/i), enc = g(/T:([^;]*)/i) || "WPA";
    return page(`<h1>WiFi network</h1><p class="sub">Connect using the details below.</p>
      <div class="row"><span class="k">Network (SSID)</span><span class="v">${esc(ssid)}</span></div>
      <div class="row"><span class="k">Password</span><span class="v" id="pw">${esc(pass)}</span></div>
      <div class="row"><span class="k">Security</span><span class="v">${esc(enc)}</span></div>
      <button class="btn" onclick="navigator.clipboard&&navigator.clipboard.writeText(document.getElementById('pw').textContent).then(()=>{this.textContent='✓ Password copied'})">Copy password</button>`);
  }
  // vCard
  if (/^BEGIN:VCARD/i.test(c)) {
    const g = (re) => (c.match(re) || [, ""])[1];
    const fn = g(/FN:(.*)/i), tel = g(/TEL:(.*)/i), email = g(/EMAIL:(.*)/i), org = g(/ORG:(.*)/i);
    const vcf = "data:text/vcard;charset=utf-8," + encodeURIComponent(c.replace(/\r?\n/g, "\r\n"));
    return page(`<h1>${esc(fn) || "Contact"}</h1>${org ? `<p class="sub">${esc(org)}</p>` : ""}
      ${tel ? `<div class="row"><span class="k">Phone</span><span class="v"><a href="tel:${esc(tel)}">${esc(tel)}</a></span></div>` : ""}
      ${email ? `<div class="row"><span class="k">Email</span><span class="v"><a href="mailto:${esc(email)}">${esc(email)}</a></span></div>` : ""}
      <a class="btn" href="${vcf}" download="contact.vcf">💾 Save contact</a>`);
  }
  // UPI
  if (/^upi:\/\//i.test(c)) {
    const q = c.split("?")[1] || ""; const p = new URLSearchParams(q);
    const pn = p.get("pn") || "Payee", am = p.get("am"), pa = p.get("pa") || "";
    return page(`<h1>Pay with UPI</h1><p class="sub">Pay ${pn}${am ? " ₹" + esc(am) : ""} using any UPI app.</p>
      <div class="row"><span class="k">Payee</span><span class="v">${esc(pn)}</span></div>
      <div class="row"><span class="k">UPI ID</span><span class="v">${esc(pa)}</span></div>
      ${am ? `<div class="row"><span class="k">Amount</span><span class="v">₹${esc(am)}</span></div>` : ""}
      <a class="btn" href="${esc(c)}">Pay now via UPI app</a>`);
  }
  // Calendar event
  if (/^BEGIN:VEVENT/i.test(c)) {
    const g = (re) => (c.match(re) || [, ""])[1];
    const title = g(/SUMMARY:(.*)/i), loc = g(/LOCATION:(.*)/i), st = g(/DTSTART:(.*)/i), en = g(/DTEND:(.*)/i);
    const ics = "data:text/calendar;charset=utf-8," + encodeURIComponent(`BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${c.replace(/\r?\n/g, "\r\n")}\r\nEND:VCALENDAR`);
    return page(`<h1>${esc(title) || "Event"}</h1>${loc ? `<p class="sub">📍 ${esc(loc)}</p>` : ""}
      ${st ? `<div class="row"><span class="k">Starts</span><span class="v">${esc(st)}</span></div>` : ""}
      ${en ? `<div class="row"><span class="k">Ends</span><span class="v">${esc(en)}</span></div>` : ""}
      <a class="btn" href="${ics}" download="event.ics">📅 Add to calendar</a>`);
  }
  // SMS (SMSTO:number:message)
  if (/^SMSTO:/i.test(c)) {
    const parts = c.slice(6).split(":"); const num = parts[0] || ""; const msg = parts.slice(1).join(":");
    const href = `sms:${num}${msg ? "?&body=" + encodeURIComponent(msg) : ""}`;
    return page(`<h1>Send an SMS</h1><p class="sub">Tap below to open your messaging app.</p>
      <div class="row"><span class="k">To</span><span class="v">${esc(num)}</span></div>
      ${msg ? `<div class="row"><span class="k">Message</span><span class="v">${esc(msg)}</span></div>` : ""}
      <a class="btn" href="${esc(href)}">Send SMS</a>`);
  }
  // Phone
  if (/^tel:/i.test(c)) {
    const num = c.slice(4);
    return page(`<h1>Call</h1><p class="sub">Tap to call this number.</p>
      <div class="row"><span class="k">Number</span><span class="v">${esc(num)}</span></div>
      <a class="btn" href="${esc(c)}">📞 Call ${esc(num)}</a>`);
  }
  // Email
  if (/^mailto:/i.test(c)) {
    const to = c.slice(7).split("?")[0];
    return page(`<h1>Send an email</h1><p class="sub">Tap to compose in your mail app.</p>
      <div class="row"><span class="k">To</span><span class="v">${esc(to)}</span></div>
      <a class="btn" href="${esc(c)}">✉️ Compose email</a>`);
  }
  // Plain text
  return page(`<h1>Message</h1><div class="txt">${esc(c)}</div>`);
}

// Dynamic QR redirect / landing: logs a scan, then forwards or renders.
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
    const html = page(`<h1>This QR code is paused</h1><p class="sub">The owner has temporarily put this code on hold. Please check back later.</p>`);
    return new NextResponse(html, { status: 403, headers: { "content-type": "text/html; charset=utf-8" } });
  }

  if (/^https?:\/\//i.test(content)) return NextResponse.redirect(content);
  return new NextResponse(landing(content), { headers: { "content-type": "text/html; charset=utf-8" } });
}
