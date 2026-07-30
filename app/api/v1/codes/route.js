import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { SITE_URL } from "../../../../lib/supabaseConfig";
import { hasFeature } from "../../../../lib/features";

export const dynamic = "force-dynamic";

// Resolve the caller from their API key (matched against the stored SHA-256 hash).
async function authKey(request, admin) {
  const hdr = request.headers.get("authorization") || "";
  const key = hdr.replace(/^Bearer\s+/i, "").trim() || request.headers.get("x-api-key") || "";
  if (!key) return { error: NextResponse.json({ error: "Missing API key" }, { status: 401 }) };
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  const { data: prof } = await admin.from("qr_profiles").select("*").eq("api_key_hash", hash).single();
  if (!prof) return { error: NextResponse.json({ error: "Invalid API key" }, { status: 401 }) };
  if (!hasFeature(prof, "api")) return { error: NextResponse.json({ error: "API access is not enabled on this account" }, { status: 403 }) };
  return { prof };
}

const shape = (c) => ({
  id: c.id, name: c.name, type: c.type, content: c.content, dynamic: c.dynamic,
  scans: c.scans, status: c.status,
  short_link: c.dynamic && c.slug ? `${SITE_URL}/r/${c.slug}` : null,
  created_at: c.created_at,
});

export async function GET(request) {
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  const a = await authKey(request, admin);
  if (a.error) return a.error;
  const { data } = await admin.from("qs_codes").select("*").eq("user_id", a.prof.id).order("created_at", { ascending: false });
  return NextResponse.json({ count: (data || []).length, codes: (data || []).map(shape) });
}

export async function POST(request) {
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  const a = await authKey(request, admin);
  if (a.error) return a.error;
  const prof = a.prof;

  const body = await request.json().catch(() => ({}));
  const url = String(body.url || "").trim();
  const content = String(body.content || url).trim();
  const type = String(body.type || (url ? "URL" : "Text")).trim();
  const name = String(body.name || "API QR").trim().slice(0, 120);
  const dyn = body.dynamic === undefined ? true : !!body.dynamic;
  if (!content) return NextResponse.json({ error: "Provide a 'url' or 'content'" }, { status: 400 });

  // Credit check
  if ((prof.credits ?? 0) <= 0) return NextResponse.json({ error: "No credits remaining" }, { status: 402 });

  // Unique slug
  let slug = "";
  for (let i = 0; i < 6; i++) {
    slug = Math.random().toString(36).slice(2, 9);
    const { data: hit } = await admin.from("qs_codes").select("id").eq("slug", slug).maybeSingle();
    if (!hit) break;
  }

  const { data: code, error } = await admin.from("qs_codes")
    .insert({ user_id: prof.id, name, type, content, style: {}, dynamic: dyn, slug })
    .select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("qr_profiles").update({ credits: (prof.credits || 0) - 1 }).eq("id", prof.id);
  await admin.from("qr_transactions").insert({ user_id: prof.id, description: "QR code created (API) — 1 credit used", amount: 0, kind: "usage" });

  return NextResponse.json({ ok: true, code: shape(code) }, { status: 201 });
}
