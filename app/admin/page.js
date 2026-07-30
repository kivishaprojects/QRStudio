"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "../../lib/supabaseBrowser";
import { SITE_URL } from "../../lib/supabaseConfig";
import { taxBreakup } from "../../lib/gst";
import { FEATURES, featureState } from "../../lib/features";

export default function Admin() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [me, setMe] = useState(null);
  const [data, setData] = useState({ users: [], codes: [], txns: [], orders: [], settings: null, tickets: [], coupons: [], audit: [], backups: [], enquiries: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [msg, setMsg] = useState("");
  const [sform, setSform] = useState({ gst_rate: "18", gstin: "", biz_name: "", biz_address: "", hsn: "", logo_url: "" });
  const [savingSet, setSavingSet] = useState(false);
  const [busy, setBusy] = useState("");        // id of the row currently acting
  const [needs2fa, setNeeds2fa] = useState(false);
  const [userView, setUserView] = useState(null); // selected user for detail modal
  const [codeView, setCodeView] = useState(null); // selected code for detail modal
  const [aform, setAform] = useState({ phone: "" });

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3500); };

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    await supabase.rpc("qr_ensure_profile", { p_name: null });
    const { data: prof } = await supabase.from("qr_profiles").select("*").eq("id", user.id).single();
    setMe(prof);
    if (prof?.role === "admin") {
      // 2FA step-up: if an MFA factor is enrolled, require an AAL2 session.
      try {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
          setNeeds2fa(true); setLoading(false); return;
        }
      } catch (_) {}
      setNeeds2fa(false);
      const [{ data: users }, { data: codes }, { data: txns }, { data: orders }, { data: settings }, { data: tickets }, { data: coupons }, { data: audit }] = await Promise.all([
        supabase.from("qr_profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("qs_codes").select("*").order("created_at", { ascending: false }),
        supabase.from("qr_transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("qs_orders").select("*").order("created_at", { ascending: false }),
        supabase.from("qs_settings").select("*").eq("id", 1).single(),
        supabase.from("qs_tickets").select("*").order("updated_at", { ascending: false }),
        supabase.from("qs_coupons").select("*").order("created_at", { ascending: false }),
        supabase.from("qs_admin_audit").select("*").order("created_at", { ascending: false }).limit(200),
      ]);
      const { data: backups } = await supabase.from("qs_backups").select("id,created_at,kind,row_counts,size_bytes").order("created_at", { ascending: false }).limit(50);
      const { data: enquiries } = await supabase.from("qs_enquiries").select("*").order("created_at", { ascending: false }).limit(200);
      setData({ users: users || [], codes: codes || [], txns: txns || [], orders: orders || [], settings: settings || null, tickets: tickets || [], coupons: coupons || [], audit: audit || [], backups: backups || [], enquiries: enquiries || [] });
      if (settings) setSform({ gst_rate: String(settings.gst_rate ?? 18), gstin: settings.gstin || "", biz_name: settings.biz_name || "", biz_address: settings.biz_address || "", hsn: settings.hsn || "", logo_url: settings.logo_url || "" });
      setAform({ phone: prof.phone || "" });
    }
    setLoading(false);
  }, [router, supabase]);
  useEffect(() => { load(); }, [load]);

  async function saveSettings() {
    setSavingSet(true);
    const { error } = await supabase.rpc("qr_save_settings", {
      p_gst_rate: Number(sform.gst_rate) || 0, p_gstin: sform.gstin || null,
      p_biz_name: sform.biz_name || null, p_biz_address: sform.biz_address || null, p_hsn: sform.hsn || null,
      p_logo_url: sform.logo_url || null,
    });
    setSavingSet(false);
    if (error) flash("Error: " + error.message);
    else { flash("✅ Settings saved"); load(); }
  }

  function onLogoPick(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 400 * 1024) { flash("Logo too large — please use an image under 400 KB."); return; }
    const rd = new FileReader();
    rd.onload = () => setSform((s) => ({ ...s, logo_url: String(rd.result) }));
    rd.readAsDataURL(f);
  }

  async function saveAdminPhone() {
    const { error } = await supabase.rpc("qr_set_phone", { p_phone: aform.phone || null });
    if (error) flash("Error: " + error.message); else { flash("✅ Mobile number updated"); load(); }
  }

  async function sendMyReset() {
    if (!me?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(me.email, { redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset` });
    if (error) flash("Error: " + error.message); else flash("✅ Password-reset link sent to " + me.email);
  }

  async function holdUser(u, hold) {
    setBusy(u.id);
    const { error } = await supabase.rpc("qr_admin_set_user_hold", { p_user: u.id, p_hold: hold });
    setBusy("");
    if (error) flash("Error: " + error.message);
    else { flash(hold ? "⏸ User put on hold" : "▶ User re-activated"); load(); }
  }

  async function resetUserPw(u) {
    const { error } = await supabase.auth.resetPasswordForEmail(u.email, { redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset` });
    if (error) flash("Error: " + error.message); else flash("✅ Reset link sent to " + u.email);
  }

  async function deleteUser(u) {
    if (!window.confirm(`Permanently delete ${u.email} and ALL their QR codes, scans and payment history? This cannot be undone.`)) return;
    setBusy(u.id);
    try {
      const res = await fetch("/api/admin/delete-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Delete failed");
      flash("🗑 User deleted"); setUserView(null); load();
    } catch (e) { flash("Error: " + e.message); }
    setBusy("");
  }

  async function setCodeStatus(c, status) {
    setBusy(c.id);
    const { error } = await supabase.rpc("qr_admin_set_code_status", { p_id: c.id, p_status: status });
    setBusy("");
    if (error) flash("Error: " + error.message);
    else { flash(status === "hold" ? "⏸ QR put on hold" : "▶ QR activated"); load(); }
  }

  async function deleteCode(c) {
    if (!window.confirm(`Delete QR "${c.name}"? Its scan history will be removed and the short link will stop working.`)) return;
    setBusy(c.id);
    const { error } = await supabase.rpc("qr_admin_delete_code", { p_id: c.id });
    setBusy("");
    if (error) flash("Error: " + error.message);
    else { flash("🗑 QR deleted"); setCodeView(null); load(); }
  }

  async function claimAdmin() {
    const { error } = await supabase.rpc("qr_claim_admin");
    if (error) setMsg(error.message === "admin_exists" ? "An admin already exists." : error.message);
    else load();
  }

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--soft)" }}>Loading…</div>;

  if (needs2fa) return <TwoFAChallenge supabase={supabase} onVerified={() => { setLoading(true); load(); }} onSignOut={async () => { await supabase.auth.signOut(); router.push("/login"); }} />;

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

  const { users, codes, txns, orders, tickets, coupons, audit, backups, enquiries } = data;
  const paying = users.filter((u) => u.plan !== "free").length;
  const totalScans = codes.reduce((a, c) => a + (c.scans || 0), 0);
  const revenue = txns.reduce((a, t) => a + (t.amount || 0), 0);
  const paidOrders = (orders || []).filter((o) => o.status === "paid");
  const paidRevenue = paidOrders.reduce((a, o) => a + (o.amount || 0), 0);
  const emailById = {}; users.forEach((u) => (emailById[u.id] = u.email));
  const nameById = {}; users.forEach((u) => (nameById[u.id] = u.full_name || u.email));
  // last 12 months of paid revenue
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: d.getFullYear() + "-" + (d.getMonth() + 1), label: MON[d.getMonth()], yr: String(d.getFullYear()).slice(2), n: 0 }); }
  const mmap = {}; months.forEach((m) => (mmap[m.key] = m));
  paidOrders.forEach((o) => { const d = new Date(o.paid_at || o.created_at); const k = d.getFullYear() + "-" + (d.getMonth() + 1); if (mmap[k]) mmap[k].n += o.amount || 0; });
  const maxM = Math.max(1, ...months.map((m) => m.n));

  const RATE = Number((data.settings && data.settings.gst_rate) != null ? data.settings.gst_rate : 18);
  const bill = (o) => taxBreakup(o.amount, RATE, o && o.tax_type);
  const itemLabel = (o) => (o.kind === "plan" ? (o.plan || "plan") + " package" : (o.qty || "") + " addon credits");

  function exportGstCsv() {
    const head = ["Invoice No", "Invoice Date", "Customer", "GSTIN", "Place of supply", "Item", "GST Rate %", "Taxable Value", "IGST", "CGST", "SGST", "Total (incl GST)", "Order ID"];
    const rows = paidOrders.map((o) => {
      const b = bill(o);
      return [o.invoice_no || "", new Date(o.paid_at || o.created_at).toISOString().slice(0, 10), emailById[o.user_id] || "", o.buyer_gstin || "", o.buyer_state || "", itemLabel(o), RATE, b.taxable, b.igstAmt, b.cgst, b.sgst, b.gross, o.id];
    });
    const csv = [head, ...rows].map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "gst-report.csv"; a.click();
  }
  // Generate & print a single bill / tax invoice (same layout as the customer copy).
  function downloadBill(o) {
    const w = window.open("", "_blank"); if (!w) return;
    const s = data.settings || {};
    const b = bill(o);
    const item = itemLabel(o);
    const date = new Date(o.paid_at || o.created_at).toLocaleString();
    const HSN = s.hsn || "998314";
    const BIZ = s.biz_name || "India QRCode";
    const ADDR = s.biz_address || "";
    const GSTIN = s.gstin ? "GSTIN: " + s.gstin : "GSTIN: __________";
    const LOGO = s.logo_url ? '<img src="' + s.logo_url + '" alt="logo" style="max-height:56px;max-width:180px;margin-bottom:8px"/><br/>' : "";
    const party = (o.buyer_name ? '<b>' + o.buyer_name + '</b><br/>' : '') + (nameById[o.user_id] || emailById[o.user_id] || "Customer") +
      (o.buyer_gstin ? '<div class="muted">GSTIN: ' + o.buyer_gstin + '</div>' : '') +
      (o.buyer_city || o.buyer_state ? '<div class="muted">' + [o.buyer_city, o.buyer_state, o.buyer_pincode].filter(Boolean).join(", ") + '</div>' : '') +
      (o.buyer_state ? '<div class="muted">Place of supply: ' + o.buyer_state + '</div>' : '');
    const taxRows = b.igst
      ? '<div><span>IGST @ ' + RATE + '%</span><span>₹' + b.igstAmt.toLocaleString() + '</span></div>'
      : '<div><span>CGST @ ' + (RATE / 2) + '%</span><span>₹' + b.cgst.toLocaleString() + '</span></div>' +
        '<div><span>SGST @ ' + (RATE / 2) + '%</span><span>₹' + b.sgst.toLocaleString() + '</span></div>';
    w.document.write(
      '<html><head><title>Invoice ' + (o.invoice_no || o.id) + '</title><style>' +
      'body{font-family:Arial,sans-serif;color:#1b2138;max-width:720px;margin:auto;padding:32px}' +
      '.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #5566f2;padding-bottom:14px}' +
      '.brand{font-size:22px;font-weight:800}.muted{color:#5f6982;font-size:12px}' +
      'table{width:100%;border-collapse:collapse;margin-top:22px;font-size:13px}' +
      'th,td{border-bottom:1px solid #e2e7f1;padding:8px}th{color:#5f6982;font-size:11px;text-transform:uppercase;text-align:left}' +
      'td.r,th.r{text-align:right}.summary{width:280px;margin-left:auto;margin-top:14px;font-size:13px}' +
      '.summary div{display:flex;justify-content:space-between;padding:5px 0}.summary .tot{border-top:2px solid #1b2138;margin-top:6px;padding-top:8px;font-size:17px;font-weight:800}' +
      '.tag{color:#5f6982;font-size:11px;margin-top:30px;line-height:1.6}' +
      '</style></head><body>' +
      '<div class="head"><div>' + LOGO + '<div class="brand">' + BIZ + '</div>' + (ADDR ? '<div class="muted">' + ADDR + '</div>' : '<div class="muted">Developed by Jupiter Technologies · Made in India</div>') + '<div class="muted">' + GSTIN + '</div></div>' +
      '<div style="text-align:right"><div style="font-size:18px;font-weight:700">TAX INVOICE</div><div class="muted">' + (o.invoice_no || o.id) + '</div><div class="muted">' + date + '</div></div></div>' +
      '<div style="margin-top:18px"><div class="muted">BILLED TO</div><div>' + party + '</div></div>' +
      '<table><thead><tr><th>Description</th><th class="r">HSN/SAC</th><th class="r">Taxable value</th></tr></thead>' +
      '<tbody><tr><td>' + item + '</td><td class="r">' + HSN + '</td><td class="r">₹' + b.taxable.toLocaleString() + '</td></tr></tbody></table>' +
      '<div class="summary">' +
      '<div><span>Taxable value</span><span>₹' + b.taxable.toLocaleString() + '</span></div>' +
      taxRows +
      '<div class="tot"><span>Total (incl. GST)</span><span>₹' + b.gross.toLocaleString() + '</span></div>' +
      '</div>' +
      '<div class="tag">Order ID: ' + o.id + ' · Payment mode: ' + (o.payment_mode || "Online (Cashfree)") + ' · Status: Received.<br/>Prices are inclusive of GST @ ' + RATE + '%. This is a system-generated invoice.</div>' +
      '<scr' + 'ipt>window.onload=function(){window.print()}</scr' + 'ipt></body></html>'
    );
    w.document.close();
  }
  const inp = { width: "100%", background: "#ffffff", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", color: "var(--txt)", fontFamily: "inherit", fontSize: 14 };
  // Plan distribution now includes Free-plan (free login) users.
  const dist = ["free", "starter", "growth", "pro"].map((id) => ({ id, n: users.filter((u) => u.plan === id).length }));
  const distMax = Math.max(1, ...dist.map((d) => d.n));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", minHeight: "100vh" }}>
      <aside style={{ background: "var(--bg2)", borderRight: "1px solid var(--line)", padding: "20px 15px", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "6px 8px 16px", textAlign: "center" }}>
          <img src="/logo.png" alt="India QR Code" style={{ height: 66 }} />
          <div style={{ fontSize: 12, color: "var(--soft)", fontWeight: 700, letterSpacing: ".12em", marginTop: 6 }}>ADMIN PANEL</div>
        </div>
        {[["overview", "▨ Overview"], ["users", "👥 Users"], ["revenue", "₹ Revenue"], ["bills", "🧾 Bills Generated"], ["codes", "▤ QR Codes"], ["coupons", "🎟 Coupons"], ["support", "🛟 Support"], ["enquiries", "✉️ Enquiries"], ["audit", "📜 Audit Log"], ["backup", "💾 Backup"], ["settings", "⚙ Settings"]].map(([id, l]) => {
          const openCount = id === "support" ? (data.tickets || []).filter((t) => t.status === "open" || t.status === "in_progress").length
            : id === "enquiries" ? (data.enquiries || []).filter((e) => !e.handled).length : 0;
          return (
          <div key={id} onClick={() => setTab(id)} style={{ padding: "11px 13px", borderRadius: 11, marginBottom: 3, fontSize: 14, cursor: "pointer", color: tab === id ? "#fff" : "var(--soft)", background: tab === id ? "linear-gradient(135deg,var(--brand),var(--brand2))" : "transparent", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{l}</span>
            {openCount > 0 && <span style={{ background: tab === id ? "rgba(255,255,255,.25)" : "var(--gold)", color: "#fff", borderRadius: 20, fontSize: 11, fontWeight: 700, padding: "1px 7px" }}>{openCount}</span>}
          </div>
          );
        })}
        <Link href="/dashboard" style={{ padding: "11px 13px", display: "block", fontSize: 14, color: "var(--soft)", marginTop: 8 }}>← User dashboard</Link>
      </aside>
      <div style={{ padding: "26px 28px 60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ fontSize: 22, textTransform: "capitalize" }}>{tab === "bills" ? "Bills Generated" : tab}</h2>
          {msg && <div style={{ background: "var(--card2)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "var(--accent)" }}>{msg}</div>}
        </div>

        {tab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 20 }}>
              <K label="Total users" v={users.length} />
              <K label="Paying users" v={paying} />
              <K label="Free-plan users" v={users.filter((u) => u.plan === "free").length} />
              <K label="Revenue (Cashfree)" v={"₹" + paidRevenue.toLocaleString()} />
              <K label="QR codes" v={codes.length} />
            </div>
            <div className="card">
              <h3 style={{ fontSize: 16, marginBottom: 14 }}>Plan distribution</h3>
              {dist.map((d) => (
                <div key={d.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 5, textTransform: "capitalize" }}><span>{d.id === "free" ? "Free (free login)" : d.id}</span><b>{d.n}</b></div>
                  <div style={{ background: "var(--card2)", borderRadius: 6, height: 10 }}><div style={{ width: (d.n / distMax * 100) + "%", height: "100%", borderRadius: 6, background: d.id === "free" ? "linear-gradient(90deg,var(--gold),#d69e2e)" : "linear-gradient(90deg,var(--brand),var(--accent))" }} /></div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "users" && (
          <div className="card">
            <h3 style={{ fontSize: 16, marginBottom: 14 }}>All users ({users.length})</h3>
            <div style={{ overflowX: "auto" }}>
              <table><thead><tr><th>Email</th><th>Name</th><th>Plan</th><th>Credits</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                <tbody>{users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.full_name || "—"}</td>
                    <td><span className={"pill " + u.plan}>{u.plan}</span></td>
                    <td>{u.credits}</td>
                    <td>{u.role === "admin" ? <span className="pill pro">admin</span> : u.status === "hold" ? <span className="pill free">on hold</span> : <span className="pill starter">active</span>}</td>
                    <td style={{ color: "var(--soft)" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        <button className="btn btn-ghost btn-sm" title="View profile" onClick={() => setUserView(u)}>👁 View</button>
                        {u.role !== "admin" && (u.status === "hold"
                          ? <button className="btn btn-ghost btn-sm" disabled={busy === u.id} onClick={() => holdUser(u, false)}>▶ Unhold</button>
                          : <button className="btn btn-ghost btn-sm" disabled={busy === u.id} onClick={() => holdUser(u, true)}>⏸ Hold</button>)}
                        <button className="btn btn-ghost btn-sm" title="Send password reset" onClick={() => resetUserPw(u)}>🔑 Reset</button>
                        {u.role !== "admin" && <button className="btn btn-ghost btn-sm" style={{ color: "#c0392b" }} disabled={busy === u.id} onClick={() => deleteUser(u)}>🗑 Delete</button>}
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "revenue" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 18 }}>
              <K label="Revenue collected (paid)" v={"₹" + paidRevenue.toLocaleString()} />
              <K label="Paid orders" v={paidOrders.length} />
              <K label="All orders" v={(orders || []).length} />
              <K label="Pending / failed" v={(orders || []).filter((o) => o.status !== "paid").length} />
            </div>
            <div className="card" style={{ marginBottom: 18 }}>
              <h3 style={{ fontSize: 16, marginBottom: 4 }}>Monthly revenue</h3>
              <div style={{ fontSize: 12, color: "var(--soft)", marginBottom: 12 }}>Paid orders, last 12 months</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 150 }}>
                {months.map((m, i) => (
                  <div key={i} title={"₹" + m.n.toLocaleString()} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: 9.5, color: "var(--soft)" }}>{m.n ? "₹" + (m.n >= 1000 ? (m.n / 1000).toFixed(1) + "k" : m.n) : ""}</div>
                    <div style={{ width: "100%", height: Math.max(3, (m.n / maxM) * 110), background: "linear-gradient(180deg,var(--accent),#12a583)", borderRadius: "5px 5px 0 0" }} />
                    <span style={{ fontSize: 9.5, color: "var(--soft)" }}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card" style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 16 }}>Cashfree payments</h3>
                <button className="btn btn-primary btn-sm" onClick={exportGstCsv}>⬇ GST report (CSV)</button>
              </div>
              {(!orders || orders.length === 0) ? <p style={{ color: "var(--soft)" }}>No payment orders yet.</p> : (
                <table><thead><tr><th>Date</th><th>Invoice</th><th>User</th><th>Item</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>{orders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ color: "var(--soft)" }}>{new Date(o.created_at).toLocaleString()}</td>
                      <td style={{ color: "var(--soft)", fontSize: 12 }}>{o.invoice_no || "—"}</td>
                      <td>{emailById[o.user_id] || "—"}</td>
                      <td>{itemLabel(o)}</td>
                      <td><b>₹{o.amount}</b></td>
                      <td><span className={"pill " + (o.status === "paid" ? "pro" : o.status === "failed" ? "free" : "starter")}>{o.status}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
            <div className="card">
              <h3 style={{ fontSize: 16, marginBottom: 14 }}>Account activity (credit grants) — ₹{revenue.toLocaleString()}</h3>
              <table><thead><tr><th>Date</th><th>Description</th><th>Kind</th><th>Amount</th></tr></thead>
                <tbody>{txns.map((t) => <tr key={t.id}><td style={{ color: "var(--soft)" }}>{new Date(t.created_at).toLocaleDateString()}</td><td>{t.description}</td><td>{t.kind}</td><td><b>₹{t.amount}</b></td></tr>)}</tbody>
              </table>
            </div>
          </>
        )}

        {tab === "bills" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 18 }}>
              <K label="Bills generated" v={paidOrders.length} />
              <K label="Total billed (incl GST)" v={"₹" + paidRevenue.toLocaleString()} />
              <K label="Total tax (GST)" v={"₹" + paidOrders.reduce((a, o) => a + bill(o).tax, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} />
            </div>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <h3 style={{ fontSize: 16 }}>Bills / tax invoices ({paidOrders.length})</h3>
                <button className="btn btn-primary btn-sm" onClick={exportGstCsv}>⬇ Export (CSV)</button>
              </div>
              {paidOrders.length === 0 ? <p style={{ color: "var(--soft)" }}>No bills generated yet. Bills appear here once a payment is received.</p> : (
                <div style={{ overflowX: "auto" }}>
                  <table><thead><tr><th>Date</th><th>Invoice No</th><th>Party name</th><th>GSTIN</th><th>Item</th><th>Amount</th><th>Tax (GST)</th><th>Payment mode</th><th>Total</th><th>Received</th><th>Bill</th></tr></thead>
                    <tbody>{paidOrders.map((o) => {
                      const b = bill(o);
                      return (
                        <tr key={o.id}>
                          <td style={{ color: "var(--soft)" }}>{new Date(o.paid_at || o.created_at).toLocaleDateString()}</td>
                          <td style={{ fontSize: 12 }}>{o.invoice_no || "—"}</td>
                          <td>{nameById[o.user_id] || emailById[o.user_id] || "—"}<div style={{ fontSize: 11, color: "var(--soft)" }}>{o.buyer_state || ""}</div></td>
                          <td style={{ fontSize: 11.5 }}>{o.buyer_gstin || "—"}</td>
                          <td>{itemLabel(o)}</td>
                          <td>₹{b.taxable.toLocaleString()}</td>
                          <td>₹{b.tax.toLocaleString()}<div style={{ fontSize: 10.5, color: "var(--soft)" }}>{b.igst ? "IGST" : "CGST+SGST"}</div></td>
                          <td>{o.payment_mode || "Online (Cashfree)"}</td>
                          <td><b>₹{b.gross.toLocaleString()}</b></td>
                          <td><span className="pill pro">✓ Received</span></td>
                          <td><button className="btn btn-ghost btn-sm" title="Download / print bill" onClick={() => downloadBill(o)}>🧾 Download</button></td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {tab === "coupons" && (
          <AdminCoupons supabase={supabase} coupons={coupons || []} onChange={load} flash={flash} />
        )}

        {tab === "audit" && (
          <div className="card">
            <h3 style={{ fontSize: 16, marginBottom: 14 }}>Admin activity ({(audit || []).length})</h3>
            {(!audit || audit.length === 0) ? <p style={{ color: "var(--soft)" }}>No admin actions recorded yet.</p> : (
              <div style={{ overflowX: "auto" }}>
                <table><thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Target</th></tr></thead>
                  <tbody>{audit.map((a) => (
                    <tr key={a.id}>
                      <td style={{ color: "var(--soft)", fontSize: 12 }}>{new Date(a.created_at).toLocaleString()}</td>
                      <td style={{ fontSize: 12.5 }}>{emailById[a.admin_id] || "—"}</td>
                      <td><span className="pill starter">{a.action.replace(/_/g, " ")}</span></td>
                      <td style={{ fontSize: 12.5 }}>{a.target || "—"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "backup" && (
          <AdminBackup supabase={supabase} backups={backups || []} onChange={load} flash={flash} />
        )}

        {tab === "enquiries" && (
          <div className="card">
            <h3 style={{ fontSize: 16, marginBottom: 14 }}>Contact enquiries ({(enquiries || []).length})</h3>
            {(!enquiries || enquiries.length === 0) ? <p style={{ color: "var(--soft)" }}>No enquiries yet. Submissions from the Contact page appear here.</p> : (
              <div style={{ overflowX: "auto" }}>
                <table><thead><tr><th>Date</th><th>Name</th><th>Email</th><th>Phone</th><th>Subject</th><th>Message</th><th>Status</th></tr></thead>
                  <tbody>{enquiries.map((e) => (
                    <tr key={e.id}>
                      <td style={{ color: "var(--soft)", fontSize: 12 }}>{new Date(e.created_at).toLocaleString()}</td>
                      <td>{e.name || "—"}</td>
                      <td style={{ fontSize: 12.5 }}><a href={"mailto:" + e.email} style={{ color: "var(--brand2)" }}>{e.email}</a></td>
                      <td style={{ fontSize: 12.5 }}>{e.phone || "—"}</td>
                      <td style={{ fontSize: 12.5 }}>{e.subject || "—"}</td>
                      <td style={{ fontSize: 12.5, maxWidth: 320, whiteSpace: "pre-wrap" }}>{e.message}</td>
                      <td>
                        {e.handled
                          ? <button className="btn btn-ghost btn-sm" onClick={async () => { await supabase.rpc("qr_admin_set_enquiry_handled", { p_id: e.id, p_handled: false }); load(); }}>Reopen</button>
                          : <button className="btn btn-ghost btn-sm" style={{ color: "var(--accent)" }} onClick={async () => { await supabase.rpc("qr_admin_set_enquiry_handled", { p_id: e.id, p_handled: true }); flash("Marked handled"); load(); }}>✓ Mark done</button>}
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "support" && (
          <AdminSupport supabase={supabase} tickets={tickets || []} emailById={emailById} nameById={nameById} onChange={load} flash={flash} />
        )}

        {tab === "codes" && (
          <div className="card">
            <h3 style={{ fontSize: 16, marginBottom: 14 }}>All QR codes ({codes.length}) · {totalScans.toLocaleString()} scans</h3>
            <div style={{ overflowX: "auto" }}>
              <table><thead><tr><th>Name</th><th>Owner</th><th>Type</th><th>Scans</th><th>Kind</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>{codes.map((c) => (
                  <tr key={c.id}>
                    <td><b>{c.name}</b></td>
                    <td style={{ color: "var(--soft)", fontSize: 12 }}>{emailById[c.user_id] || "—"}</td>
                    <td>{c.type}</td>
                    <td>{c.scans}</td>
                    <td><span className={"pill " + (c.dynamic ? "dyn" : "stat")}>{c.dynamic ? "Dynamic" : "Static"}</span></td>
                    <td>{c.status === "hold" ? <span className="pill free">on hold</span> : <span className="pill starter">active</span>}</td>
                    <td>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setCodeView(c)}>👁 View</button>
                        {c.status === "hold"
                          ? <button className="btn btn-ghost btn-sm" disabled={busy === c.id} onClick={() => setCodeStatus(c, "active")}>▶ Activate</button>
                          : <button className="btn btn-ghost btn-sm" disabled={busy === c.id} onClick={() => setCodeStatus(c, "hold")}>⏸ Hold</button>}
                        <button className="btn btn-ghost btn-sm" style={{ color: "#c0392b" }} disabled={busy === c.id} onClick={() => deleteCode(c)}>🗑 Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div style={{ display: "grid", gap: 18, maxWidth: 640 }}>
            <div className="card">
              <h3 style={{ fontSize: 16, marginBottom: 4 }}>Tax &amp; business settings</h3>
              <p style={{ fontSize: 13, color: "var(--soft)", marginBottom: 16 }}>These appear on customer invoices, receipts, and the GST report.</p>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12.5, color: "var(--soft)", marginBottom: 6 }}>Logo on bill / invoice</label>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ width: 88, height: 88, border: "1px dashed var(--line)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", overflow: "hidden" }}>
                    {sform.logo_url ? <img src={sform.logo_url} alt="logo" style={{ maxWidth: "100%", maxHeight: "100%" }} /> : <span style={{ fontSize: 11, color: "var(--soft)" }}>No logo</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>
                      ⬆ Upload logo
                      <input type="file" accept="image/*" onChange={onLogoPick} style={{ display: "none" }} />
                    </label>
                    {sform.logo_url && <button className="btn btn-ghost btn-sm" onClick={() => setSform((s) => ({ ...s, logo_url: "" }))}>Remove</button>}
                    <span style={{ fontSize: 11.5, color: "var(--soft)" }}>PNG/JPG, under 400 KB. Shown at the top of every invoice.</span>
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12.5, color: "var(--soft)", marginBottom: 5 }}>GST rate (%)</label>
                  <input type="number" step="0.1" value={sform.gst_rate} onChange={(e) => setSform({ ...sform, gst_rate: e.target.value })} style={inp} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12.5, color: "var(--soft)", marginBottom: 5 }}>GSTIN</label>
                  <input value={sform.gstin} onChange={(e) => setSform({ ...sform, gstin: e.target.value })} placeholder="e.g. 24ABCDE1234F1Z5" style={inp} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12.5, color: "var(--soft)", marginBottom: 5 }}>Business name (on invoice)</label>
                <input value={sform.biz_name} onChange={(e) => setSform({ ...sform, biz_name: e.target.value })} placeholder="India QRCode" style={inp} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12.5, color: "var(--soft)", marginBottom: 5 }}>Business address</label>
                <input value={sform.biz_address} onChange={(e) => setSform({ ...sform, biz_address: e.target.value })} placeholder="Street, City, State, PIN" style={inp} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12.5, color: "var(--soft)", marginBottom: 5 }}>HSN / SAC code</label>
                <input value={sform.hsn} onChange={(e) => setSform({ ...sform, hsn: e.target.value })} placeholder="998314" style={inp} />
              </div>
              <button className="btn btn-primary" onClick={saveSettings} disabled={savingSet}>{savingSet ? "Saving…" : "Save settings"}</button>
            </div>

            <div className="card">
              <h3 style={{ fontSize: 16, marginBottom: 4 }}>Admin account</h3>
              <p style={{ fontSize: 13, color: "var(--soft)", marginBottom: 16 }}>Your login credentials and recovery.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12.5, color: "var(--soft)", marginBottom: 5 }}>Username / login email</label>
                  <input value={me.email} readOnly style={{ ...inp, background: "var(--card2)", color: "var(--soft)" }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12.5, color: "var(--soft)", marginBottom: 5 }}>Mobile number</label>
                  <input value={aform.phone} onChange={(e) => setAform({ phone: e.target.value })} placeholder="10-digit mobile" style={inp} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn btn-ghost btn-sm" onClick={saveAdminPhone}>Save mobile</button>
                <button className="btn btn-primary btn-sm" onClick={sendMyReset}>🔑 Change / reset password</button>
              </div>
              <p style={{ fontSize: 11.5, color: "var(--soft)", marginTop: 12 }}>Password changes go through a secure email link. To recover a forgotten password from the login screen, use “Forgot password?”.</p>
            </div>

            <TwoFAEnroll supabase={supabase} flash={flash} />
          </div>
        )}

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--line)", textAlign: "center" }}>
          <img src="/logo.png" alt="India QR Code" style={{ height: 72, marginBottom: 8 }} />
          <div style={{ fontSize: 12, color: "var(--soft)" }}>© 2026 India QR Code · Admin · Made in India 🇮🇳</div>
        </div>
      </div>

      {userView && <UserModal u={userView} codes={codes} orders={orders} txns={txns} itemLabel={itemLabel} supabase={supabase} flash={flash} onChange={load} onClose={() => setUserView(null)} />}
      {codeView && <CodeModal c={codeView} email={emailById[codeView.user_id]} onClose={() => setCodeView(null)} />}
    </div>
  );
}

function K({ label, v }) {
  return <div className="card"><div style={{ fontSize: 13, color: "var(--soft)" }}>{label}</div><div style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 28, fontWeight: 800, marginTop: 8 }}>{v}</div></div>;
}

// Step-up challenge shown when an admin with 2FA hasn't verified this session.
function TwoFAChallenge({ supabase, onVerified, onSignOut }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function verify(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = (factors?.totp || [])[0] || (factors?.all || []).find((f) => f.factor_type === "totp" && f.status === "verified");
      if (!totp) { setErr("No authenticator found."); setBusy(false); return; }
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: totp.id, code: code.trim() });
      if (error) { setErr(error.message); setBusy(false); return; }
      onVerified();
    } catch (e2) { setErr(e2.message); setBusy(false); }
  }
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <form onSubmit={verify} className="card" style={{ maxWidth: 380, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
        <h2 style={{ fontSize: 20 }}>Two-factor verification</h2>
        <p style={{ color: "var(--soft)", fontSize: 13.5, margin: "8px 0 16px" }}>Enter the 6-digit code from your authenticator app to access the admin panel.</p>
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" maxLength={6} style={{ width: "100%", textAlign: "center", letterSpacing: 6, fontSize: 22, background: "#fff", border: "1px solid var(--line)", borderRadius: 10, padding: "12px", marginBottom: 12 }} autoFocus />
        {err && <div style={{ color: "#c0392b", fontSize: 13, marginBottom: 10 }}>{err}</div>}
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={busy || code.length < 6}>{busy ? "Verifying…" : "Verify"}</button>
        <button type="button" onClick={onSignOut} style={{ marginTop: 12, fontSize: 12.5, color: "var(--soft)", background: "none", border: "none", cursor: "pointer" }}>Sign out</button>
      </form>
    </div>
  );
}

// Admin 2FA enrollment / management (TOTP).
function TwoFAEnroll({ supabase, flash }) {
  const [factors, setFactors] = useState([]);
  const [enroll, setEnroll] = useState(null); // { id, qr, secret }
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp || []).filter((f) => f.status === "verified"));
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  async function start() {
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Admin " + Date.now() });
    setBusy(false);
    if (error) { flash("Error: " + error.message); return; }
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }
  async function confirm() {
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.trim() });
    setBusy(false);
    if (error) { flash("Error: " + error.message); return; }
    setEnroll(null); setCode(""); flash("✅ Two-factor authentication enabled"); refresh();
  }
  async function remove(id) {
    if (!window.confirm("Disable two-factor authentication?")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) flash("Error: " + error.message); else { flash("Two-factor disabled"); refresh(); }
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: 16, marginBottom: 4 }}>Two-factor authentication (2FA)</h3>
      <p style={{ fontSize: 13, color: "var(--soft)", marginBottom: 14 }}>Protect the admin panel with a time-based code from an authenticator app (Google Authenticator, Authy, etc.).</p>

      {factors.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {factors.map((f) => (
            <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <span style={{ fontSize: 13.5 }}>🔐 Authenticator enabled <span className="pill pro" style={{ marginLeft: 6 }}>active</span></span>
              <button className="btn btn-ghost btn-sm" style={{ color: "#c0392b" }} onClick={() => remove(f.id)}>Disable</button>
            </div>
          ))}
        </div>
      )}

      {!enroll ? (
        factors.length === 0 && <button className="btn btn-primary btn-sm" onClick={start} disabled={busy}>{busy ? "…" : "Enable 2FA"}</button>
      ) : (
        <div style={{ background: "var(--card2)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
          <p style={{ fontSize: 13, marginBottom: 10 }}>1. Scan this QR code in your authenticator app:</p>
          <div style={{ background: "#fff", padding: 10, borderRadius: 8, display: "inline-block" }} dangerouslySetInnerHTML={{ __html: enroll.qr }} />
          <p style={{ fontSize: 12, color: "var(--soft)", margin: "10px 0" }}>Or enter this key manually: <code style={{ wordBreak: "break-all" }}>{enroll.secret}</code></p>
          <p style={{ fontSize: 13, marginBottom: 6 }}>2. Enter the 6-digit code to confirm:</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" maxLength={6} style={{ flex: 1, background: "#fff", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", fontSize: 16, letterSpacing: 4, textAlign: "center" }} />
            <button className="btn btn-primary btn-sm" onClick={confirm} disabled={busy || code.length < 6}>{busy ? "…" : "Confirm"}</button>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setEnroll(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

const TICKET_STATUS = {
  open: { label: "Open", cls: "starter" },
  in_progress: { label: "In progress", cls: "dyn" },
  resolved: { label: "Resolved", cls: "pro" },
  closed: { label: "Closed", cls: "free" },
};
function TStatus({ s }) {
  const m = TICKET_STATUS[s] || { label: s, cls: "starter" };
  return <span className={"pill " + m.cls}>{m.label}</span>;
}

function fmtBytes(n) {
  n = Number(n) || 0;
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  return (n / 1048576).toFixed(2) + " MB";
}

function AdminBackup({ supabase, backups, onChange, flash }) {
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState(null);

  async function snapshotNow() {
    setBusy("snap");
    const { error } = await supabase.rpc("qr_admin_create_backup");
    setBusy("");
    if (error) flash("Error: " + error.message);
    else { flash("✅ Snapshot created"); onChange(); }
  }
  async function downloadSnapshot(b) {
    setBusy(b.id);
    const { data, error } = await supabase.from("qs_backups").select("tables,created_at").eq("id", b.id).single();
    setBusy("");
    if (error) { flash("Error: " + error.message); return; }
    const payload = { app: "India QRCode", version: 1, generated_at: data.created_at, tables: data.tables };
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "indiaqrcode-snapshot-" + new Date(b.created_at).toISOString().slice(0, 10) + ".json"; a.click();
  }
  async function restore(payload, label) {
    if (!window.confirm(`Restore data from ${label}? Existing records with matching IDs will be overwritten with the backup values. This does not delete newer records.`)) return;
    setBusy("restore"); setResult(null);
    try {
      const res = await fetch("/api/admin/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Restore failed");
      setResult(j.report); flash("✅ Restore complete"); onChange();
    } catch (e) { flash("Error: " + e.message); }
    setBusy("");
  }
  function restoreFromFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const parsed = JSON.parse(String(rd.result));
        const tables = parsed.tables || parsed;
        restore({ tables }, "the uploaded file");
      } catch (_) { flash("That file isn't a valid backup JSON."); }
    };
    rd.readAsText(f);
    e.target.value = "";
  }

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 820 }}>
      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 4 }}>Backup</h3>
        <p style={{ fontSize: 13, color: "var(--soft)", marginBottom: 14 }}>Automatic snapshots run daily. You can also take one now, or download a complete backup (including scan analytics) to keep off-site.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="btn btn-primary btn-sm" href="/api/admin/backup">⬇ Download full backup (JSON)</a>
          <button className="btn btn-ghost btn-sm" onClick={snapshotNow} disabled={busy === "snap"}>{busy === "snap" ? "…" : "📸 Create snapshot now"}</button>
          <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>
            ⬆ Restore from file
            <input type="file" accept="application/json,.json" onChange={restoreFromFile} style={{ display: "none" }} />
          </label>
        </div>
      </div>

      {result && (
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Restore result</h3>
          <table><thead><tr><th>Table</th><th>Restored</th><th>Skipped</th></tr></thead>
            <tbody>{Object.entries(result).map(([t, r]) => (
              <tr key={t}><td>{t}</td><td>{r.restored}</td><td style={{ color: r.skipped ? "#c0392b" : "var(--soft)" }}>{r.skipped}{r.error ? " (" + r.error + ")" : ""}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 14 }}>Snapshots ({backups.length})</h3>
        {backups.length === 0 ? <p style={{ color: "var(--soft)" }}>No snapshots yet. One is created automatically each day.</p> : (
          <div style={{ overflowX: "auto" }}>
            <table><thead><tr><th>When</th><th>Type</th><th>Records</th><th>Size</th><th></th></tr></thead>
              <tbody>{backups.map((b) => {
                const total = b.row_counts ? Object.values(b.row_counts).reduce((a, n) => a + Number(n || 0), 0) : 0;
                return (
                  <tr key={b.id}>
                    <td style={{ fontSize: 12.5 }}>{new Date(b.created_at).toLocaleString()}</td>
                    <td><span className={"pill " + (b.kind === "manual" ? "pro" : "starter")}>{b.kind}</span></td>
                    <td style={{ fontSize: 12.5 }}>{total} rows</td>
                    <td style={{ fontSize: 12.5, color: "var(--soft)" }}>{fmtBytes(b.size_bytes)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 5 }}>
                        <button className="btn btn-ghost btn-sm" disabled={busy === b.id} onClick={() => downloadSnapshot(b)}>Download</button>
                        <button className="btn btn-ghost btn-sm" disabled={busy === "restore"} onClick={() => restore({ snapshotId: b.id }, "this snapshot")}>Restore</button>
                      </div>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ background: "var(--card2)" }}>
        <p style={{ fontSize: 12.5, color: "var(--soft)", margin: 0, lineHeight: 1.6 }}>
          <b>Tip:</b> these logical snapshots protect against accidental deletion or bad edits. For full protection against a database failure, also enable <b>Point-in-Time Recovery</b> in your Supabase dashboard (Database → Backups) and download a full backup here periodically to store off-site.
        </p>
      </div>
    </div>
  );
}

function AdminCoupons({ supabase, coupons, onChange, flash }) {
  const [f, setF] = useState({ code: "", kind: "percent", value: "", max: "", expires: "", active: true });
  const [busy, setBusy] = useState(false);
  const inp = { width: "100%", background: "#fff", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", color: "var(--txt)", fontFamily: "inherit", fontSize: 14 };

  async function save() {
    if (!f.code.trim() || !f.value) { flash("Enter a code and value"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("qr_save_coupon", {
      p_code: f.code.trim().toUpperCase(), p_kind: f.kind, p_value: Number(f.value),
      p_max: f.max ? parseInt(f.max, 10) : null, p_expires: f.expires ? new Date(f.expires).toISOString() : null, p_active: f.active,
    });
    setBusy(false);
    if (error) flash("Error: " + error.message);
    else { flash("✅ Coupon saved"); setF({ code: "", kind: "percent", value: "", max: "", expires: "", active: true }); onChange(); }
  }
  async function toggle(c) {
    const { error } = await supabase.rpc("qr_save_coupon", { p_code: c.code, p_kind: c.kind, p_value: c.value, p_max: c.max_redemptions, p_expires: c.expires_at, p_active: !c.active });
    if (error) flash("Error: " + error.message); else onChange();
  }
  async function del(c) {
    if (!window.confirm("Delete coupon " + c.code + "?")) return;
    const { error } = await supabase.rpc("qr_delete_coupon", { p_code: c.code });
    if (error) flash("Error: " + error.message); else { flash("Coupon deleted"); onChange(); }
  }

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 820 }}>
      <div className="card" style={{ maxWidth: 560 }}>
        <h3 style={{ fontSize: 16, marginBottom: 14 }}>Create / update coupon</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field"><label>Code</label><input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="LAUNCH20" style={{ ...inp, textTransform: "uppercase" }} /></div>
          <div className="field"><label>Type</label><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} style={inp}><option value="percent">Percent (%)</option><option value="flat">Flat (₹)</option></select></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field"><label>{f.kind === "percent" ? "Discount %" : "Discount ₹"}</label><input type="number" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} placeholder={f.kind === "percent" ? "20" : "100"} style={inp} /></div>
          <div className="field"><label>Max redemptions (optional)</label><input type="number" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} placeholder="Unlimited" style={inp} /></div>
        </div>
        <div className="field"><label>Expires (optional)</label><input type="date" value={f.expires} onChange={(e) => setF({ ...f, expires: e.target.value })} style={inp} /></div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, marginBottom: 14 }}><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Active</label>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save coupon"}</button>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 14 }}>Coupons ({coupons.length})</h3>
        {coupons.length === 0 ? <p style={{ color: "var(--soft)" }}>No coupons yet.</p> : (
          <div style={{ overflowX: "auto" }}>
            <table><thead><tr><th>Code</th><th>Discount</th><th>Used</th><th>Expires</th><th>Status</th><th></th></tr></thead>
              <tbody>{coupons.map((c) => (
                <tr key={c.code}>
                  <td><b>{c.code}</b></td>
                  <td>{c.kind === "percent" ? c.value + "%" : "₹" + c.value}</td>
                  <td>{c.redeemed}{c.max_redemptions != null ? " / " + c.max_redemptions : ""}</td>
                  <td style={{ color: "var(--soft)", fontSize: 12.5 }}>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}</td>
                  <td>{c.active ? <span className="pill pro">active</span> : <span className="pill free">off</span>}</td>
                  <td>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggle(c)}>{c.active ? "Disable" : "Enable"}</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: "#c0392b" }} onClick={() => del(c)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminSupport({ supabase, tickets, emailById, nameById, onChange, flash }) {
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("active"); // active | all | resolved

  async function openTicket(t) {
    setActive(t); setLoadingMsg(true); setMessages([]);
    const { data } = await supabase.from("qs_ticket_messages").select("*").eq("ticket_id", t.id).order("created_at", { ascending: true });
    setMessages(data || []); setLoadingMsg(false);
  }
  async function sendReply() {
    if (!reply.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("qr_add_ticket_message", { p_ticket: active.id, p_body: reply });
    setBusy(false);
    if (error) { flash("Error: " + error.message); return; }
    setReply(""); openTicket(active); onChange();
  }
  async function setStatus(status) {
    const { error } = await supabase.rpc("qr_set_ticket_status", { p_ticket: active.id, p_status: status });
    if (error) { flash("Error: " + error.message); return; }
    flash("Ticket marked " + status.replace("_", " ")); setActive({ ...active, status }); onChange();
  }
  const inp = { width: "100%", background: "#fff", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", color: "var(--txt)", fontFamily: "inherit", fontSize: 14 };

  if (active) {
    return (
      <div className="card" style={{ maxWidth: 760 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><h3 style={{ fontSize: 17 }}>{active.subject}</h3><TStatus s={active.status} /></div>
            <div style={{ fontSize: 12, color: "var(--soft)", marginTop: 3 }}>#{String(active.ticket_no).padStart(5, "0")} · {emailById[active.user_id] || "user"} · {active.category} · {active.priority} · opened {new Date(active.created_at).toLocaleString()}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { setActive(null); onChange(); }}>← All tickets</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 360, overflowY: "auto", padding: "4px 2px", marginBottom: 14 }}>
          {loadingMsg ? <p style={{ color: "var(--soft)", fontSize: 13 }}>Loading…</p> : messages.map((m) => {
            const admin = m.is_admin;
            return (
              <div key={m.id} style={{ display: "flex", justifyContent: admin ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "78%", background: admin ? "linear-gradient(135deg,var(--brand),var(--brand2))" : "var(--card2)", color: admin ? "#fff" : "var(--txt)", border: admin ? "none" : "1px solid var(--line)", borderRadius: 12, padding: "9px 12px" }}>
                  <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 3 }}>{admin ? "🛟 You (Support)" : (nameById[active.user_id] || "Customer")} · {new Date(m.created_at).toLocaleString()}</div>
                  <div style={{ fontSize: 13.5, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.body}</div>
                </div>
              </div>
            );
          })}
        </div>
        <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to the customer…" rows={3} style={{ ...inp, resize: "vertical", marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
          <button className="btn btn-primary btn-sm" onClick={sendReply} disabled={busy || !reply.trim()}>{busy ? "Sending…" : "Send reply"}</button>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setStatus("in_progress")}>In progress</button>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--accent)" }} onClick={() => setStatus("resolved")}>✓ Resolve</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setStatus("closed")}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  const shown = tickets.filter((t) => filter === "all" ? true : filter === "resolved" ? (t.status === "resolved" || t.status === "closed") : (t.status === "open" || t.status === "in_progress"));
  const counts = {
    open: tickets.filter((t) => t.status === "open").length,
    prog: tickets.filter((t) => t.status === "in_progress").length,
    res: tickets.filter((t) => t.status === "resolved" || t.status === "closed").length,
  };
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 18 }}>
        <K label="Open" v={counts.open} />
        <K label="In progress" v={counts.prog} />
        <K label="Resolved / closed" v={counts.res} />
      </div>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ fontSize: 16 }}>Support tickets ({shown.length})</h3>
          <div style={{ display: "flex", gap: 6 }}>
            {[["active", "Active"], ["resolved", "Resolved"], ["all", "All"]].map(([k, l]) => (
              <button key={k} className={"btn btn-sm " + (filter === k ? "btn-primary" : "btn-ghost")} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? <p style={{ color: "var(--soft)" }}>No tickets in this view.</p> : (
          <div style={{ overflowX: "auto" }}>
            <table><thead><tr><th>#</th><th>Subject</th><th>Customer</th><th>Category</th><th>Priority</th><th>Status</th><th>Last update</th><th></th></tr></thead>
              <tbody>{shown.map((t) => (
                <tr key={t.id}>
                  <td style={{ color: "var(--soft)", fontSize: 12 }}>{String(t.ticket_no).padStart(5, "0")}</td>
                  <td><b>{t.subject}</b></td>
                  <td style={{ fontSize: 12.5 }}>{emailById[t.user_id] || "—"}</td>
                  <td style={{ fontSize: 12.5 }}>{t.category}</td>
                  <td style={{ fontSize: 12.5 }}>{t.priority}</td>
                  <td><TStatus s={t.status} /></td>
                  <td style={{ color: "var(--soft)", fontSize: 12 }}>{new Date(t.updated_at).toLocaleString()}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => openTicket(t)}>Open</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,20,40,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", zIndex: 50, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 620, margin: "auto" }}>{children}</div>
    </div>
  );
}

function Row({ k, v }) {
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderBottom: "1px solid var(--line)", fontSize: 13.5 }}><span style={{ color: "var(--soft)" }}>{k}</span><span style={{ textAlign: "right", wordBreak: "break-word" }}>{v}</span></div>;
}

function UserModal({ u, codes, orders, txns, itemLabel, supabase, flash, onChange, onClose }) {
  const [prof, setProf] = useState(u);
  const [busy, setBusy] = useState("");
  useEffect(() => { setProf(u); }, [u]);

  async function refresh() {
    const { data } = await supabase.from("qr_profiles").select("*").eq("id", u.id).single();
    if (data) setProf(data);
    onChange && onChange();
  }
  async function setFeature(key, enabled) {
    setBusy(key);
    const { error } = await supabase.rpc("qr_admin_set_feature", { p_user: u.id, p_feature: key, p_enabled: enabled });
    setBusy("");
    if (error) flash("Error: " + error.message); else { flash("✅ Updated"); refresh(); }
  }
  const [newKey, setNewKey] = useState("");
  async function setApiKey(generate) {
    if (!generate && !window.confirm("Revoke this user's API key?")) return;
    setBusy("api_key");
    const { data, error } = await supabase.rpc("qr_admin_set_api_key", { p_user: u.id, p_generate: generate });
    setBusy("");
    if (error) flash("Error: " + error.message);
    else { setNewKey(generate ? (data || "") : ""); flash(generate ? "✅ API key generated — copy it now" : "API key revoked"); refresh(); }
  }

  const uCodes = codes.filter((c) => c.user_id === u.id);
  const uOrders = (orders || []).filter((o) => o.user_id === u.id);
  const uPaid = uOrders.filter((o) => o.status === "paid");
  const uTxns = txns.filter((t) => t.user_id === u.id);
  const spent = uPaid.reduce((a, o) => a + (o.amount || 0), 0);
  return (
    <Overlay onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div>
          <h3 style={{ fontSize: 18 }}>{u.full_name || "User profile"}</h3>
          <div style={{ color: "var(--soft)", fontSize: 13 }}>{u.email}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕ Close</button>
      </div>

      <h4 style={{ fontSize: 13, textTransform: "uppercase", color: "var(--soft)", margin: "16px 0 4px" }}>Profile</h4>
      <Row k="User ID" v={<span style={{ fontSize: 11 }}>{u.id}</span>} />
      <Row k="Mobile" v={u.phone || "—"} />
      <Row k="Role" v={u.role} />
      <Row k="Status" v={u.status === "hold" ? "On hold" : "Active"} />
      <Row k="Joined" v={new Date(u.created_at).toLocaleString()} />

      <h4 style={{ fontSize: 13, textTransform: "uppercase", color: "var(--soft)", margin: "16px 0 4px" }}>Subscription</h4>
      <Row k="Current plan" v={<span className={"pill " + u.plan}>{u.plan}</span>} />
      <Row k="Credits remaining" v={u.credits} />
      <Row k="QR codes created" v={uCodes.length} />

      <h4 style={{ fontSize: 13, textTransform: "uppercase", color: "var(--soft)", margin: "16px 0 4px" }}>Services &amp; entitlements</h4>
      {FEATURES.map((f) => {
        const st = featureState(prof, f.key);
        return (
          <div key={f.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{f.label} {st.effective ? <span className="pill pro" style={{ marginLeft: 4 }}>on</span> : <span className="pill free" style={{ marginLeft: 4 }}>off</span>}</div>
              <div style={{ fontSize: 11.5, color: "var(--soft)" }}>{st.overridden ? "Admin override" : `Plan default (${st.planDefault ? "on" : "off"})`}</div>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              <button className="btn btn-ghost btn-sm" disabled={busy === f.key} onClick={() => setFeature(f.key, true)}>Enable</button>
              <button className="btn btn-ghost btn-sm" disabled={busy === f.key} onClick={() => setFeature(f.key, false)}>Disable</button>
              {st.overridden && <button className="btn btn-ghost btn-sm" disabled={busy === f.key} onClick={() => setFeature(f.key, null)}>Reset</button>}
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0" }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>API key</div>
          <div style={{ fontSize: 11.5, color: "var(--soft)", wordBreak: "break-all" }}>{prof.api_key_hint || "None issued"}</div>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          <button className="btn btn-ghost btn-sm" disabled={busy === "api_key"} onClick={() => setApiKey(true)}>{prof.api_key_hint ? "Rotate" : "Generate"}</button>
          {prof.api_key_hint && <button className="btn btn-ghost btn-sm" style={{ color: "#c0392b" }} disabled={busy === "api_key"} onClick={() => setApiKey(false)}>Revoke</button>}
        </div>
      </div>
      {newKey && (
        <div style={{ background: "#fff8e6", border: "1px solid var(--gold)", borderRadius: 10, padding: 12, marginBottom: 6 }}>
          <div style={{ fontSize: 11.5, color: "var(--gold)", fontWeight: 700, marginBottom: 6 }}>⚠ Copy this key now — it won’t be shown again.</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <code style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", fontSize: 12, wordBreak: "break-all", flex: 1 }}>{newKey}</code>
            <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(newKey); flash("Copied"); }}>Copy</button>
          </div>
        </div>
      )}

      <h4 style={{ fontSize: 13, textTransform: "uppercase", color: "var(--soft)", margin: "16px 0 4px" }}>Account &amp; payments — ₹{spent.toLocaleString()} paid</h4>
      {uOrders.length === 0 ? <p style={{ color: "var(--soft)", fontSize: 13 }}>No payment orders.</p> : (
        <table><thead><tr><th>Date</th><th>Invoice</th><th>Item</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>{uOrders.map((o) => (
            <tr key={o.id}>
              <td style={{ color: "var(--soft)", fontSize: 12 }}>{new Date(o.created_at).toLocaleDateString()}</td>
              <td style={{ fontSize: 12 }}>{o.invoice_no || "—"}</td>
              <td style={{ fontSize: 12.5 }}>{itemLabel(o)}</td>
              <td>₹{o.amount}</td>
              <td><span className={"pill " + (o.status === "paid" ? "pro" : o.status === "failed" ? "free" : "starter")}>{o.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      )}

      {uCodes.length > 0 && (
        <>
          <h4 style={{ fontSize: 13, textTransform: "uppercase", color: "var(--soft)", margin: "16px 0 4px" }}>QR codes</h4>
          <table><thead><tr><th>Name</th><th>Type</th><th>Scans</th><th>Status</th></tr></thead>
            <tbody>{uCodes.map((c) => <tr key={c.id}><td>{c.name}</td><td>{c.type}</td><td>{c.scans}</td><td>{c.status === "hold" ? "On hold" : "Active"}</td></tr>)}</tbody>
          </table>
        </>
      )}
    </Overlay>
  );
}

function CodeModal({ c, email, onClose }) {
  const redirect = c.slug ? `${SITE_URL}/r/${c.slug}` : "";
  return (
    <Overlay onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div>
          <h3 style={{ fontSize: 18 }}>{c.name}</h3>
          <div style={{ color: "var(--soft)", fontSize: 13 }}>{c.type} · {c.dynamic ? "Dynamic" : "Static"}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕ Close</button>
      </div>
      <div style={{ marginTop: 12 }}>
        <Row k="Owner" v={email || "—"} />
        <Row k="Status" v={c.status === "hold" ? "On hold" : "Active"} />
        <Row k="Scans" v={c.scans} />
        <Row k="Target / content" v={<span style={{ wordBreak: "break-all" }}>{c.content}</span>} />
        {c.dynamic && redirect && <Row k="Short link" v={<a href={redirect} target="_blank" rel="noreferrer" style={{ color: "var(--brand)", wordBreak: "break-all" }}>{redirect}</a>} />}
        <Row k="Created" v={new Date(c.created_at).toLocaleString()} />
      </div>
      {c.dynamic && redirect && (
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <img alt="qr" style={{ width: 160, height: 160 }} src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(redirect)}`} />
          <div style={{ fontSize: 11.5, color: "var(--soft)", marginTop: 6 }}>Live preview of the QR target</div>
        </div>
      )}
    </Overlay>
  );
}
