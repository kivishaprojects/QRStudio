"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "../../lib/supabaseBrowser";
import { SITE_URL } from "../../lib/supabaseConfig";
import QRCanvas, { drawQR } from "../../components/QRCanvas";

// Dynamic codes (URL type) encode a redirect through /r/<id> so the destination
// can be edited after printing and scans are tracked. Other types stay static.
function isDynamicType(typeId) {
  return typeId === "url";
}
function qrValueFor(code) {
  if (code && code.dynamic && code.id) return `${SITE_URL}/r/${code.id}`;
  return (code && code.content) || " ";
}

const TYPES = [
  { id: "url", icon: "🔗", name: "URL", fields: [{ k: "url", label: "URL", ph: "https://site.com", val: "https://qrstudio.example.com" }], build: (v) => v.url || "" },
  { id: "text", icon: "📝", name: "Text", fields: [{ k: "text", label: "Text", ph: "Any text", ta: true }], build: (v) => v.text || "" },
  { id: "wifi", icon: "📶", name: "WiFi", fields: [{ k: "ssid", label: "Network", ph: "MyWiFi" }, { k: "pass", label: "Password", ph: "password" }], build: (v) => `WIFI:T:WPA;S:${v.ssid || ""};P:${v.pass || ""};;` },
  { id: "upi", icon: "💳", name: "UPI", fields: [{ k: "vpa", label: "UPI ID", ph: "name@okbank" }, { k: "pn", label: "Payee", ph: "Vishal" }, { k: "am", label: "Amount", ph: "500" }], build: (v) => `upi://pay?pa=${v.vpa || ""}&pn=${encodeURIComponent(v.pn || "")}${v.am ? "&am=" + v.am : ""}&cu=INR` },
  { id: "vcard", icon: "👤", name: "Contact", fields: [{ k: "fn", label: "Name", ph: "Vishal H Raval" }, { k: "tel", label: "Phone", ph: "+91..." }, { k: "email", label: "Email", ph: "a@b.com" }], build: (v) => `BEGIN:VCARD\nVERSION:3.0\nFN:${v.fn || ""}\nTEL:${v.tel || ""}\nEMAIL:${v.email || ""}\nEND:VCARD` },
];

export default function Dashboard() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [tab, setTab] = useState("overview");
  const [profile, setProfile] = useState(null);
  const [plans, setPlans] = useState([]);
  const [codes, setCodes] = useState([]);
  const [txns, setTxns] = useState([]);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    await supabase.rpc("qr_ensure_profile", { p_name: null });
    const [{ data: prof }, { data: pl }, { data: cs }, { data: tx }] = await Promise.all([
      supabase.from("qr_profiles").select("*").eq("id", user.id).single(),
      supabase.from("qr_plans").select("*").order("sort"),
      supabase.from("qs_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("qr_transactions").select("*").order("created_at", { ascending: false }),
    ]);
    setProfile(prof); setPlans(pl || []); setCodes(cs || []); setTxns(tx || []);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => { load(); }, [load]);
  function flash(m) { setToast(m); setTimeout(() => setToast(""), 2200); }

  async function signOut() { await supabase.auth.signOut(); router.push("/login"); router.refresh(); }

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--soft)" }}>Loading your dashboard…</div>;

  const planName = plans.find((p) => p.id === profile?.plan)?.name || "Free";
  const totalScans = codes.reduce((a, c) => a + (c.scans || 0), 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      <aside style={{ background: "var(--bg2)", borderRight: "1px solid var(--line)", padding: "20px 15px", position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 18, padding: "6px 8px 18px" }}>
          <span className="logo">▦</span> QR Studio
        </div>
        {[["overview", "▨ Dashboard"], ["create", "＋ Create QR"], ["codes", "▤ My QR Codes"], ["billing", "💳 Billing & Plan"], ["analytics", "📈 Analytics"]].map(([id, label]) => (
          <div key={id} onClick={() => setTab(id)} style={navStyle(tab === id)}>{label}</div>
        ))}
        {profile?.role === "admin" && <Link href="/admin" style={{ ...navStyle(false), color: "var(--gold)" }}>🛡 Admin Panel</Link>}
        <div style={{ marginTop: "auto", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 13 }}>
          <div style={{ fontSize: 12.5, color: "var(--soft)" }}>Credits left: <b style={{ color: "var(--gold)", fontSize: 15 }}>{profile?.credits ?? 0}</b></div>
          <div style={{ fontSize: 11.5, color: "var(--soft)", marginTop: 2 }}>{planName} plan</div>
          <button className="btn btn-primary btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: 10 }} onClick={() => setTab("billing")}>Upgrade</button>
        </div>
      </aside>

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", borderBottom: "1px solid var(--line)", position: "sticky", top: 0, background: "rgba(255,255,255,.82)", backdropFilter: "blur(12px)", zIndex: 10 }}>
          <h2 style={{ fontSize: 20, textTransform: "capitalize" }}>{tab}</h2>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span className="pill active">🎟 {profile?.credits ?? 0} credits</span>
            <span style={{ fontSize: 13, color: "var(--soft)" }}>{profile?.email}</span>
            <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
          </div>
        </div>

        <div style={{ padding: "26px 28px 60px" }}>
          {tab === "overview" && <Overview profile={profile} codes={codes} totalScans={totalScans} planName={planName} setTab={setTab} />}
          {tab === "create" && <Create supabase={supabase} profile={profile} onSaved={() => { load(); flash("✅ QR saved — 1 credit used"); setTab("codes"); }} onNoCredit={() => setTab("billing")} flash={flash} />}
          {tab === "codes" && <Codes codes={codes} setTab={setTab} supabase={supabase} onChange={load} flash={flash} />}
          {tab === "billing" && <Billing supabase={supabase} profile={profile} plans={plans} txns={txns} onChange={load} flash={flash} />}
          {tab === "analytics" && <Analytics codes={codes} totalScans={totalScans} />}
        </div>
      </div>
      <div className={"toast" + (toast ? " show" : "")}>{toast}</div>
    </div>
  );
}

function navStyle(active) {
  return { display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderRadius: 11, marginBottom: 3, fontSize: 14.5, fontWeight: 500, cursor: "pointer", color: active ? "#fff" : "var(--soft)", background: active ? "linear-gradient(135deg,var(--brand),var(--brand2))" : "transparent" };
}
function StatCard({ label, value, sub }) {
  return (
    <div className="card">
      <div style={{ fontSize: 13, color: "var(--soft)" }}>{label}</div>
      <div style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 28, fontWeight: 800, marginTop: 8 }}>{value} {sub && <span style={{ fontSize: 13, color: "var(--accent)" }}>{sub}</span>}</div>
    </div>
  );
}

function Overview({ profile, codes, totalScans, planName, setTab }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 22 }}>
        <StatCard label="Credits available" value={profile?.credits ?? 0} />
        <StatCard label="QR codes created" value={codes.length} />
        <StatCard label="Total scans" value={totalScans.toLocaleString()} />
        <StatCard label="Current plan" value={planName} />
      </div>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 16 }}>Recent QR codes</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setTab("create")}>＋ New code</button>
        </div>
        {codes.length === 0 ? (
          <p style={{ color: "var(--soft)", fontSize: 14 }}>No codes yet — create your first one (it's free)!</p>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Type</th><th>Scans</th><th>Status</th></tr></thead>
            <tbody>
              {codes.slice(0, 6).map((c) => (
                <tr key={c.id}><td><b>{c.name}</b></td><td>{c.type}</td><td>{c.scans}</td><td><span className={"pill " + (c.dynamic ? "dyn" : "stat")}>{c.dynamic ? "Dynamic" : "Static"}</span></td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function Create({ supabase, profile, onSaved, onNoCredit, flash }) {
  const [type, setType] = useState("url");
  const [values, setValues] = useState({ url: "https://qrstudio.example.com" });
  const [fg, setFg] = useState("#181b3a");
  const [bg, setBg] = useState("#ffffff");
  const [dot, setDot] = useState("square");
  const [name, setName] = useState("My QR code");
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef(null);
  const t = TYPES.find((x) => x.id === type);
  const data = t.build(values) || " ";
  const noCredit = (profile?.credits ?? 0) <= 0;

  async function save() {
    if (noCredit) { onNoCredit(); return; }
    setSaving(true);
    const { error } = await supabase.rpc("qr_save_code", {
      p_name: name, p_type: t.name, p_content: data, p_style: { fg, bg, dot }, p_dynamic: isDynamicType(type),
    });
    setSaving(false);
    if (error) { flash(error.message === "no_credits" ? "Out of credits — upgrade to continue" : "Error: " + error.message); if (error.message?.includes("credit")) onNoCredit(); return; }
    onSaved();
  }
  function download() {
    const c = document.createElement("canvas");
    drawQR(c, { data, fg, bg, dot, ecl: "M", size: 720 });
    const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = "qr.png"; a.click();
    flash("PNG downloaded");
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr .9fr", gap: 20, alignItems: "start" }}>
      <div>
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Content type</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
            {TYPES.map((x) => (
              <div key={x.id} onClick={() => { setType(x.id); setValues({}); }} style={{ display: "flex", gap: 6, alignItems: "center", padding: "8px 12px", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "1px solid var(--line)", color: type === x.id ? "#fff" : "var(--soft)", background: type === x.id ? "linear-gradient(135deg,var(--brand),var(--brand2))" : "var(--card2)" }}>{x.icon} {x.name}</div>
            ))}
          </div>
          {t.fields.map((f) => (
            <div className="field" key={f.k}>
              <label>{f.label}</label>
              {f.ta ? <textarea value={values[f.k] || ""} placeholder={f.ph} onChange={(e) => setValues({ ...values, [f.k]: e.target.value })} />
                : <input value={values[f.k] ?? (f.val || "")} placeholder={f.ph} onChange={(e) => setValues({ ...values, [f.k]: e.target.value })} />}
            </div>
          ))}
        </div>
        <div className="card" style={{ marginTop: 18 }}>
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Style</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div className="field"><label>Foreground</label><input type="color" value={fg} onChange={(e) => setFg(e.target.value)} style={{ height: 42, padding: 3 }} /></div>
            <div className="field"><label>Background</label><input type="color" value={bg} onChange={(e) => setBg(e.target.value)} style={{ height: 42, padding: 3 }} /></div>
            <div className="field"><label>Module</label><select value={dot} onChange={(e) => setDot(e.target.value)}><option value="square">Square</option><option value="rounded">Rounded</option><option value="dots">Dots</option></select></div>
          </div>
        </div>
      </div>
      <div className="card" style={{ textAlign: "center" }}>
        <h3 style={{ fontSize: 16, marginBottom: 14 }}>Preview</h3>
        <div style={{ background: "#fff", borderRadius: 16, padding: 18, display: "inline-block" }}>
          <QRCanvas value={data} fg={fg} bg={bg} dot={dot} ecl="M" />
        </div>
        <div className="field" style={{ textAlign: "left", marginTop: 16 }}><label>Name this code</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={save} disabled={saving}>
          {saving ? "Saving…" : noCredit ? "🔒 Out of credits — upgrade" : "💾 Save & use 1 credit"}
        </button>
        <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", marginTop: 9 }} onClick={download}>⬇ Download PNG (free)</button>
        <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--soft)", background: "var(--card2)", border: "1px solid var(--line)", borderRadius: 10, padding: 11 }}>
          You have <b style={{ color: "var(--gold)" }}>{profile?.credits ?? 0}</b> credit(s). Saving a code uses 1. Downloads are always free.
          {isDynamicType(type)
            ? " This is a dynamic QR — after saving, download it from My QR Codes so you can edit the link later and track scans."
            : " This is a static QR (encodes the data directly)."}
        </div>
      </div>
    </div>
  );
}

function Codes({ codes, setTab, supabase, onChange, flash }) {
  const [sel, setSel] = useState(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  function open(c) { setSel(c); setName(c.name); setContent(c.content); }
  function close() { setSel(null); }

  const style = (sel && sel.style) || {};
  const fg = style.fg || "#181b3a", bg = style.bg || "#ffffff", dot = style.dot || "square";
  // Dynamic codes encode the redirect (constant); editing content changes where it points.
  const qrData = sel ? (sel.dynamic ? `${SITE_URL}/r/${sel.id}` : (content || sel.content || " ")) : " ";

  function tempCanvas(size) {
    const c = document.createElement("canvas");
    drawQR(c, { data: qrData, fg, bg, dot, ecl: "M", size });
    return c;
  }
  function download() {
    const a = document.createElement("a");
    a.href = tempCanvas(900).toDataURL("image/png");
    a.download = (name || "qr") + ".png";
    a.click();
    flash("PNG downloaded");
  }
  function printQR() {
    const url = tempCanvas(900).toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) { flash("Allow pop-ups to print"); return; }
    w.document.write(
      '<html><head><title>' + (name || "QR") + '</title></head>' +
      '<body style="margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">' +
      '<img src="' + url + '" style="width:340px;height:340px"/>' +
      '<div style="margin-top:14px;font-size:18px">' + (name || "") + '</div>' +
      '<scr' + 'ipt>window.onload=function(){window.print()}</scr' + 'ipt></body></html>'
    );
    w.document.close();
  }
  async function save() {
    setBusy(true);
    const { error } = await supabase.rpc("qr_update_code", { p_id: sel.id, p_name: name, p_content: content, p_style: null });
    setBusy(false);
    if (error) return flash("Error: " + error.message);
    flash("✅ Saved"); close(); onChange();
  }
  async function del() {
    if (typeof window !== "undefined" && !window.confirm("Delete this QR code permanently?")) return;
    setBusy(true);
    const { error } = await supabase.rpc("qr_delete_code", { p_id: sel.id });
    setBusy(false);
    if (error) return flash("Error: " + error.message);
    flash("Deleted"); close(); onChange();
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ fontSize: 16 }}>My QR Codes ({codes.length})</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setTab("create")}>＋ New code</button>
      </div>
      {codes.length === 0 ? <p style={{ color: "var(--soft)" }}>No codes yet.</p> : (
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Content</th><th>Scans</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id}>
                <td><b>{c.name}</b></td><td>{c.type}</td>
                <td style={{ color: "var(--soft)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.content}</td>
                <td><b>{c.scans}</b></td>
                <td style={{ color: "var(--soft)" }}>{new Date(c.created_at).toLocaleDateString()}</td>
                <td><button className="btn btn-ghost btn-sm" onClick={() => open(c)}>Open</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {sel && (
        <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(20,25,50,.45)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 17 }}>Manage QR code</h3>
              <button className="btn btn-ghost btn-sm" onClick={close}>✕ Close</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, alignItems: "start" }}>
              <div style={{ background: "#fff", borderRadius: 14, padding: 14, border: "1px solid var(--line)" }}>
                <QRCanvas value={qrData} fg={fg} bg={bg} dot={dot} ecl="M" display={180} />
              </div>
              <div>
                <div className="field"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="field"><label>Destination / content (edit the link here)</label><textarea value={content} onChange={(e) => setContent(e.target.value)} /></div>
                <div style={{ fontSize: 12, color: "var(--soft)" }}>
                  Scans: <b>{sel.scans}</b> · <span className={"pill " + (sel.dynamic ? "dyn" : "stat")}>{sel.dynamic ? "Dynamic" : "Static"}</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 16 }}>
              <button className="btn btn-primary" onClick={save} disabled={busy}>💾 Save changes</button>
              <button className="btn btn-ghost" onClick={download}>⬇ Download PNG</button>
              <button className="btn btn-ghost" onClick={printQR}>🖨 Print</button>
              <button className="btn btn-ghost" onClick={del} disabled={busy} style={{ marginLeft: "auto", color: "var(--danger)" }}>🗑 Delete</button>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: "var(--soft)", background: "var(--card2)", border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}>
              {sel.dynamic ? (
                <>This is a <b style={{ color: "var(--accent)" }}>dynamic QR</b>. The printed image never changes — just edit the destination above and Save, and every scan (even of already-printed codes) redirects to the new link. Scans are tracked automatically. (Editing is free.)</>
              ) : (
                <>This is a <b>static QR</b> — editing changes what it encodes, so <b>re-download or reprint</b> after saving. (Editing is free.)</>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Billing({ supabase, profile, plans, txns, onChange, flash }) {
  const [qty, setQty] = useState(5);
  const [busy, setBusy] = useState(false);
  const rate = plans.find((p) => p.id === profile?.plan)?.addon_rate || 100;

  async function subscribe(id) {
    setBusy(true);
    const { error } = await supabase.rpc("qr_subscribe", { p_plan: id });
    setBusy(false);
    if (error) return flash("Error: " + error.message);
    flash("🎉 Subscribed! Credits added."); onChange();
  }
  async function buyAddons() {
    if (qty < 1) return;
    setBusy(true);
    const { error } = await supabase.rpc("qr_buy_addons", { p_qty: Number(qty) });
    setBusy(false);
    if (error) return flash("Error: " + error.message);
    flash("✅ Credits added."); onChange();
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div><div style={{ fontSize: 13, color: "var(--soft)" }}>Current plan</div><div style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 24, fontWeight: 800 }}>{plans.find((p) => p.id === profile?.plan)?.name || "Free"}</div><div style={{ fontSize: 13, color: "var(--soft)", marginTop: 3 }}>{profile?.credits} credits remaining</div></div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: 13, color: "var(--soft)" }}>Pay-as-you-go</div><div style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 24, fontWeight: 800, color: "var(--gold)" }}>₹100<span style={{ fontSize: 13, color: "var(--soft)", fontWeight: 500 }}>/QR/mo</span></div></div>
      </div>
      <h3 style={{ fontSize: 18, marginBottom: 14 }}>Annual packages</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        {plans.map((p) => {
          const cur = profile?.plan === p.id;
          return (
            <div className="card" key={p.id} style={{ border: cur ? "1px solid var(--accent)" : p.id === "growth" ? "1px solid var(--brand)" : undefined, display: "flex", flexDirection: "column" }}>
              <h4 style={{ fontSize: 16 }}>{p.name}</h4>
              <div style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 26, fontWeight: 800, margin: "8px 0 2px" }}>₹{p.price.toLocaleString()}{p.id !== "free" && <span style={{ fontSize: 13, color: "var(--soft)" }}>/yr</span>}</div>
              <div style={{ fontSize: 12, color: "var(--accent)", marginBottom: 12 }}>{p.qr_included} QR{p.id === "free" ? " free" : ""} · addons ₹{p.addon_rate}/yr</div>
              <button className={"btn " + (cur ? "btn-ghost" : "btn-primary")} style={{ width: "100%", justifyContent: "center", marginTop: "auto" }} disabled={cur || busy || p.id === "free"} onClick={() => subscribe(p.id)}>{cur ? "Current plan" : p.id === "free" ? "Free" : "Subscribe"}</button>
            </div>
          );
        })}
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Buy addon credits</h3>
        <p style={{ color: "var(--soft)", fontSize: 13.5, marginBottom: 12 }}>Your addon rate: <b style={{ color: "var(--txt)" }}>₹{rate}</b> per QR credit / year (based on your current plan — Free ₹499 · Starter ₹399 · Growth ₹299 · Pro ₹199).</p>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} style={{ width: 90, background: "#ffffff", border: "1px solid var(--line)", borderRadius: 10, padding: 10, color: "var(--txt)" }} />
          <span style={{ color: "var(--soft)", fontSize: 14 }}>× ₹{rate} = <b style={{ color: "var(--gold)" }}>₹{(rate * qty).toLocaleString()}</b></span>
          <button className="btn btn-primary btn-sm" onClick={buyAddons} disabled={busy}>Buy credits</button>
        </div>
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Billing history</h3>
        {txns.length === 0 ? <p style={{ color: "var(--soft)" }}>No transactions yet.</p> : (
          <table><thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
            <tbody>{txns.map((t) => <tr key={t.id}><td style={{ color: "var(--soft)" }}>{new Date(t.created_at).toLocaleDateString()}</td><td>{t.description}</td><td><b>₹{t.amount}</b></td></tr>)}</tbody>
          </table>
        )}
      </div>
      <p style={{ marginTop: 14, fontSize: 12, color: "var(--soft)" }}>Note: this demo credits your account instantly. Wire a payment gateway (Razorpay) into these actions to charge real money.</p>
    </>
  );
}

function Analytics({ codes, totalScans }) {
  const top = [...codes].sort((a, b) => b.scans - a.scans).slice(0, 6);
  const max = Math.max(1, ...top.map((c) => c.scans));
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 22 }}>
        <StatCard label="Total scans" value={totalScans.toLocaleString()} />
        <StatCard label="Active codes" value={codes.length} />
        <StatCard label="Avg scans / code" value={codes.length ? Math.round(totalScans / codes.length) : 0} />
        <StatCard label="Dynamic codes" value={codes.filter((c) => c.dynamic).length} />
      </div>
      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Top codes by scans</h3>
        {top.length === 0 ? <p style={{ color: "var(--soft)" }}>No scan data yet.</p> : top.map((c) => (
          <div key={c.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 5 }}><span>{c.name}</span><b>{c.scans}</b></div>
            <div style={{ background: "var(--card2)", borderRadius: 6, height: 10 }}><div style={{ width: (c.scans / max * 100) + "%", height: "100%", borderRadius: 6, background: "linear-gradient(90deg,var(--brand),var(--accent))" }} /></div>
          </div>
        ))}
      </div>
    </>
  );
}
