import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Restore order respects foreign keys; conflict target per table.
const ORDER = [
  ["qs_settings", "id"], ["qs_coupons", "code"], ["qr_profiles", "id"],
  ["qs_codes", "id"], ["qs_orders", "id"], ["qr_transactions", "id"],
  ["qs_tickets", "id"], ["qs_ticket_messages", "id"], ["qs_scans", "id"],
  ["qs_admin_audit", "id"],
];

// Upsert a table; on batch failure, fall back to row-by-row so FK/edge issues
// skip individual rows rather than aborting the whole table.
async function restoreTable(admin, table, rows, conflict) {
  if (!Array.isArray(rows) || rows.length === 0) return { restored: 0, skipped: 0 };
  const { error } = await admin.from(table).upsert(rows, { onConflict: conflict });
  if (!error) return { restored: rows.length, skipped: 0 };
  let ok = 0, bad = 0;
  for (const r of rows) {
    const { error: e2 } = await admin.from(table).upsert(r, { onConflict: conflict });
    if (e2) bad++; else ok++;
  }
  return { restored: ok, skipped: bad };
}

// Restore (merge/upsert) from an uploaded backup file or a stored snapshot id.
export async function POST(request) {
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Service role key missing" }, { status: 503 });
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data: me } = await admin.from("qr_profiles").select("role").eq("id", user.id).single();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  let tables = body.tables || (body.data && body.data.tables) || null;

  if (!tables && body.snapshotId) {
    const { data: snap } = await admin.from("qs_backups").select("tables").eq("id", body.snapshotId).single();
    if (!snap) return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    tables = snap.tables;
  }
  if (!tables || typeof tables !== "object") return NextResponse.json({ error: "No backup data provided" }, { status: 400 });

  const report = {};
  for (const [table, conflict] of ORDER) {
    if (!tables[table]) continue;
    try {
      report[table] = await restoreTable(admin, table, tables[table], conflict);
    } catch (e) {
      report[table] = { restored: 0, skipped: (tables[table] || []).length, error: e.message };
    }
  }
  await admin.from("qs_admin_audit").insert({ admin_id: user.id, action: "data_restore", target: body.snapshotId || "uploaded file", detail: report });
  return NextResponse.json({ ok: true, report });
}
