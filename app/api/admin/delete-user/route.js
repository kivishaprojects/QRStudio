import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Admin-only: permanently delete a user and all their data.
// Requires the service role key (Supabase Auth Admin API).
export async function POST(request) {
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Service role key missing on server" }, { status: 503 });

  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // caller must be an admin
  const { data: me } = await admin.from("qr_profiles").select("role").eq("id", user.id).single();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const targetId = String(body.userId || "");
  if (!targetId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  if (targetId === user.id) return NextResponse.json({ error: "You cannot delete your own admin account" }, { status: 400 });

  const { data: target } = await admin.from("qr_profiles").select("role").eq("id", targetId).single();
  if (target && target.role === "admin") return NextResponse.json({ error: "Cannot delete another admin" }, { status: 400 });

  // Remove dependent rows first (defensive — in case FKs aren't cascading).
  await admin.from("qs_scans").delete().eq("user_id", targetId);
  await admin.from("qs_codes").delete().eq("user_id", targetId);
  await admin.from("qs_orders").delete().eq("user_id", targetId);
  await admin.from("qr_transactions").delete().eq("user_id", targetId);
  await admin.from("qr_profiles").delete().eq("id", targetId);

  const { error } = await admin.auth.admin.deleteUser(targetId);
  // If the auth user is already gone, treat as success.
  if (error && !/not.*found/i.test(error.message || "")) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await admin.from("qs_admin_audit").insert({ admin_id: user.id, action: "user_delete", target: targetId, detail: {} });
  return NextResponse.json({ ok: true });
}
