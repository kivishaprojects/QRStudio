import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const TABLES = [
  { name: "qr_profiles" }, { name: "qs_codes" }, { name: "qs_scans" },
  { name: "qr_transactions" }, { name: "qs_orders" }, { name: "qs_tickets" },
  { name: "qs_ticket_messages" }, { name: "qs_coupons" }, { name: "qs_settings" },
  { name: "qs_admin_audit" },
];

async function fetchAll(admin, table) {
  const rows = [];
  const step = 1000;
  for (let from = 0; ; from += step) {
    const { data, error } = await admin.from(table).select("*").range(from, from + step - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < step) break;
  }
  return rows;
}

// Full off-line backup of every app table (admin only). Downloads as JSON.
export async function GET() {
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Service role key missing" }, { status: 503 });
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data: me } = await admin.from("qr_profiles").select("role").eq("id", user.id).single();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const tables = {};
  const counts = {};
  try {
    for (const t of TABLES) {
      const rows = await fetchAll(admin, t.name);
      tables[t.name] = rows;
      counts[t.name] = rows.length;
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const payload = { app: "India QRCode", version: 1, generated_at: new Date().toISOString(), row_counts: counts, tables };
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return new NextResponse(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="indiaqrcode-backup-${stamp}.json"`,
    },
  });
}
