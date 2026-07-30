"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "../../lib/supabaseBrowser";

export default function Admin() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [me, setMe] = useState(null);
  const [data, setData] = useState({ users: [], codes: [], txns: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    await supabase.rpc("qr_ensure_profile", { p_name: null });
    const { data: prof } = await supabase.from("qr_profiles").select("*").eq("id", user.id).single();
    setMe(prof);
    if (prof?.role === "admin") {
      const [{ data: users }, { data: codes }, { data: txns }] = await Promise.all([
        supabase.from("qr_profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("qr_codes").select("*"),
        supabase.from("qr_transactions").select("*").order("created_at", { ascending: false }),
      ]);
      setData({ users: users || [], codes: codes || [], txns: txns || [] });
    }
    setLoading(false);
  }, [router, supabase]);
  useEffect(() => { load(); }, [load]);

  async function claimAdmin() {
    const { error } = await supabase.rpc("qr_claim_admin");
    if (error) setMsg(error.message === "admin_exists" ? "An admin already exists." : error.message);
    else load();
  }

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--soft)" }}>Loading…</div>;

  if (me?.role !== "admin") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="card" style={{ maxWidth: 440, textAlign: "center" }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🛡</div>
          <h2 style={{ fontSize: 20 }}>Admin access required</h2>
          <p style={{ color: "var(--soft)", fontSize: 14, margin: "10px 0 18px" }}>This account is not an admin. If you're the first user, you can claim admin access below (works only while no admin exists).</p>
          {msg && <div style={{ color: "var(--gold)", fontSize: 13, marginBottom: 12 }}>{msg}</div>}
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={claimAdmin}>Claim admin (first user)</button>
          <Link href="/dashboard" style={{ display: "block", marginTop: 14, fontSize: 13, color: "var(--soft)" }}>← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const { users, codes, txns } = data;
  const paying = users.filter((u) => u.plan !== "free").length;
  const totalScans = codes.reduce((a, c) => a + (c.scans || 0), 0);
  const revenue = txns.reduce((a, t) => a + (t.amount || 0), 0);
  const dist = ["starter", "growth", "pro"].map((id) => ({ id, n: users.filter((u) => u.plan === id).length }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", minHeight: "100vh" }}>
      <aside style={{ background: "var(--bg2)", borderRight: "1px solid var(--line)", padding: "20px 15px", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 17, padding: "6px 8px 18px" }}><span className="logo">▦</span> Admin</div>
        {[["overview", "▨ Overview"], ["users", "👥 Users"], ["revenue", "₹ Revenue"], ["codes", "▤ QR Codes"]].map(([id, l]) => (
          <div key={id} onClick={() => setTab(id)} style={{ padding: "11px 13px", borderRadius: 11, marginBottom: 3, fontSize: 14, cursor: "pointer", color: tab === id ? "#fff" : "var(--soft)", background: tab === id ? "linear-gradient(135deg,var(--brand),var(--brand2))" : "transparent" }}>{l}</div>
        ))}
        <Link href="/dashboard" style={{ padding: "11px 13px", display: "block", fontSize: 14, color: "var(--soft)", marginTop: 8 }}>← User dashboard</Link>
      </aside>
      <div style={{ padding: "26px 28px 60px" }}>
        <h2 style={{ fontSize: 22, marginBottom: 20, textTransform: "capitalize" }}>{tab}</h2>
        {tab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 20 }}>
              <K label="Total users" v={users.length} />
              <K label="Paying users" v={paying} />
              <K label="Total revenue" v={"₹" + revenue.toLocaleString()} />
              <K label="QR codes" v={codes.length} />
            </div>
            <div className="card">
              <h3 style={{ fontSize: 16, marginBottom: 14 }}>Plan distribution</h3>
              {dist.map((d) => (
                <div key={d.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 5, textTransform: "capitalize" }}><span>{d.id}</span><b>{d.n}</b></div>
                  <div style={{ background: "var(--card2)", borderRadius: 6, height: 10 }}><div style={{ width: (d.n / Math.max(1, paying) * 100) + "%", height: "100%", borderRadius: 6, background: "linear-gradient(90deg,var(--brand),var(--accent))" }} /></div>
                </div>
              ))}
            </div>
          </>
        )}
        {tab === "users" && (
          <div className="card">
            <h3 style={{ fontSize: 16, marginBottom: 14 }}>All users ({users.length})</h3>
            <table><thead><tr><th>Email</th><th>Name</th><th>Plan</th><th>Credits</th><th>Role</th><th>Joined</th></tr></thead>
              <tbody>{users.map((u) => <tr key={u.id}><td>{u.email}</td><td>{u.full_name || "—"}</td><td><span className={"pill " + u.plan}>{u.plan}</span></td><td>{u.credits}</td><td>{u.role}</td><td style={{ color: "var(--soft)" }}>{new Date(u.created_at).toLocaleDateString()}</td></tr>)}</tbody>
            </table>
          </div>
        )}
        {tab === "revenue" && (
          <div className="card">
            <h3 style={{ fontSize: 16, marginBottom: 14 }}>Transactions — ₹{revenue.toLocaleString()} total</h3>
            <table><thead><tr><th>Date</th><th>Description</th><th>Kind</th><th>Amount</th></tr></thead>
              <tbody>{txns.map((t) => <tr key={t.id}><td style={{ color: "var(--soft)" }}>{new Date(t.created_at).toLocaleDateString()}</td><td>{t.description}</td><td>{t.kind}</td><td><b>₹{t.amount}</b></td></tr>)}</tbody>
            </table>
          </div>
        )}
        {tab === "codes" && (
          <div className="card">
            <h3 style={{ fontSize: 16, marginBottom: 14 }}>All QR codes ({codes.length}) · {totalScans.toLocaleString()} scans</h3>
            <table><thead><tr><th>Name</th><th>Type</th><th>Scans</th><th>Status</th></tr></thead>
              <tbody>{codes.map((c) => <tr key={c.id}><td><b>{c.name}</b></td><td>{c.type}</td><td>{c.scans}</td><td><span className={"pill " + (c.dynamic ? "dyn" : "stat")}>{c.dynamic ? "Dynamic" : "Static"}</span></td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function K({ label, v }) {
  return <div className="card"><div style={{ fontSize: 13, color: "var(--soft)" }}>{label}</div><div style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 28, fontWeight: 800, marginTop: 8 }}>{v}</div></div>;
}
