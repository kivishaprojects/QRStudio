"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "../../lib/supabaseBrowser";
import { SITE_URL } from "../../lib/supabaseConfig";
import { taxBreakup } from "../../lib/gst";

export default function Admin() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [me, setMe] = useState(null);
  const [data, setData] = useState({ users: [], codes: [], txns: [], orders: [], settings: null });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [msg, setMsg] = useState("");
  const [sform, setSform] = useState({ gst_rate: "18", gstin: "", biz_name: "", biz_address: "", hsn: "", logo_url: "" });
  const [savingSet, setSavingSet] = useState(false);
  const [busy, setBusy] = useState("");        // id of the row currently acting
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
      const [{ data: users }, { data: codes }, { data: txns }, { data: orders }, { data: settings }] = await Promise.all([
        supabase.from("qr_profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("qs_codes").select("*").order("created_at", { ascending: false }),
        supabase.from("qr_transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("qs_orders").select("*").order("created_at", { ascending: false }),
        supabase.from("qs_settings").select("*").eq("id", 1).single(),
      ]);
      setData({ users: users || [], codes: codes || [], txns: txns || [], orders: orders || [], settings: settings || null });
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

  const { users, codes, txns, orders } = data;
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
    const BIZ = s.biz_name || "QR Studio";
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 17, padding: "6px 8px 18px" }}><span className="logo">▦</span> Admin</div>
        {[["overview", "▨ Overview"], ["users", "👥 Users"], ["revenue", "₹ Revenue"], ["bills", "🧾 Bills Generated"], ["codes", "▤ QR Codes"], ["settings", "⚙ Settings"]].map(([id, l]) => (
          <div key={id} onClick={() => setTab(id)} style={{ padding: "11px 13px", borderRadius: 11, marginBottom: 3, fontSize: 14, cursor: "pointer", color: tab === id ? "#fff" : "var(--soft)", background: tab === id ? "linear-gradient(135deg,var(--brand),var(--brand2))" : "transparent" }}>{l}</div>
        ))}
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
                <input value={sform.biz_name} onChange={(e) => setSform({ ...sform, biz_name: e.target.value })} placeholder="QR Studio" style={inp} />
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
          </div>
        )}
      </div>

      {userView && <UserModal u={userView} codes={codes} orders={orders} txns={txns} itemLabel={itemLabel} onClose={() => setUserView(null)} />}
      {codeView && <CodeModal c={codeView} email={emailById[codeView.user_id]} onClose={() => setCodeView(null)} />}
    </div>
  );
}

function K({ label, v }) {
  return <div className="card"><div style={{ fontSize: 13, color: "var(--soft)" }}>{label}</div><div style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 28, fontWeight: 800, marginTop: 8 }}>{v}</div></div>;
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

function UserModal({ u, codes, orders, txns, itemLabel, onClose }) {
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
