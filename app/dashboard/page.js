"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "../../lib/supabaseBrowser";
import { SITE_URL, CASHFREE_MODE } from "../../lib/supabaseConfig";
import QRCanvas, { drawQR, composeBranded } from "../../components/QRCanvas";

// Dynamic codes (URL type) encode a redirect through /r/<id> so the destination
// can be edited after printing and scans are tracked. Other types stay static.
function isDynamicType(typeId) {
  return typeId === "url";
}
function qrValueFor(code) {
  if (code && code.dynamic && (code.slug || code.id)) return `${SITE_URL}/r/${code.slug || code.id}`;
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
  const [analyticsCode, setAnalyticsCode] = useState("all");
  const [profile, setProfile] = useState(null);
  const [plans, setPlans] = useState([]);
  const [codes, setCodes] = useState([]);
  const [txns, setTxns] = useState([]);
  const [scans, setScans] = useState([]);
  const [orders, setOrders] = useState([]);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    await supabase.rpc("qr_ensure_profile", { p_name: null });
    const [{ data: prof }, { data: pl }, { data: cs }, { data: tx }, { data: sc }, { data: od }] = await Promise.all([
      supabase.from("qr_profiles").select("*").eq("id", user.id).single(),
      supabase.from("qr_plans").select("*").order("sort"),
      supabase.from("qs_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("qr_transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("qs_scans").select("*").order("scanned_at", { ascending: false }).limit(1000),
      supabase.from("qs_orders").select("*").order("created_at", { ascending: false }),
    ]);
    setProfile(prof); setPlans(pl || []); setCodes(cs || []); setTxns(tx || []); setScans(sc || []); setOrders(od || []);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => { load(); }, [load]);
  // Returning from Cashfree checkout? jump to Billing so the order gets verified.
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("order_id")) setTab("billing");
  }, []);
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
          {tab === "codes" && <Codes codes={codes} setTab={setTab} supabase={supabase} onChange={load} flash={flash} onViewAnalytics={(id) => { setAnalyticsCode(id); setTab("analytics"); }} />}
          {tab === "billing" && <Billing supabase={supabase} profile={profile} plans={plans} txns={txns} orders={orders} onChange={load} flash={flash} />}
          {tab === "analytics" && <Analytics codes={codes} scans={scans} totalScans={totalScans} initialCode={analyticsCode} />}
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

function loadLogoFile(file, setter) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 300; let w = img.width, h = img.height;
      if (Math.max(w, h) > max) { const sc = max / Math.max(w, h); w = Math.round(w * sc); h = Math.round(h * sc); }
      const cc = document.createElement("canvas"); cc.width = w; cc.height = h;
      cc.getContext("2d").drawImage(img, 0, 0, w, h);
      const d2 = cc.toDataURL("image/png");
      const im = new Image(); im.onload = () => setter({ data: d2, img: im }); im.src = d2;
    };
    img.src = r.result;
  };
  r.readAsDataURL(file);
}

function Create({ supabase, profile, onSaved, onNoCredit, flash }) {
  const [type, setType] = useState("url");
  const [values, setValues] = useState({ url: "https://qrstudio.example.com" });
  const [fg, setFg] = useState("#181b3a");
  const [bg, setBg] = useState("#ffffff");
  const [dot, setDot] = useState("square");
  const [name, setName] = useState("My QR code");
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [topLogo, setTopLogo] = useState({ data: null, img: null });
  const [centerLogo, setCenterLogo] = useState({ data: null, img: null });
  const [saving, setSaving] = useState(false);
  const t = TYPES.find((x) => x.id === type);
  const data = t.build(values) || " ";
  const noCredit = (profile?.credits ?? 0) <= 0;

  const brandOpts = { qrData: data, fg, bg, dot, topText, bottomText, logoImg: topLogo.img, centerLogoImg: centerLogo.img };
  function buildStyle() {
    return { fg, bg, dot, brandTop: topText, brandBottom: bottomText, logo: topLogo.data || null, centerLogo: centerLogo.data || null };
  }

  async function save() {
    if (noCredit) { onNoCredit(); return; }
    setSaving(true);
    const { error } = await supabase.rpc("qr_save_code", {
      p_name: name, p_type: t.name, p_content: data, p_style: buildStyle(), p_dynamic: isDynamicType(type),
    });
    setSaving(false);
    if (error) { flash(error.message === "no_credits" ? "Out of credits — upgrade to continue" : "Error: " + error.message); if (error.message && error.message.includes("credit")) onNoCredit(); return; }
    onSaved();
  }
  function download() {
    const a = document.createElement("a");
    a.href = composeBranded(brandOpts).toDataURL("image/png");
    a.download = (name || "qr") + ".png";
    a.click();
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
        <div className="card" style={{ marginTop: 18 }}>
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Branding <span style={{ fontSize: 12, color: "var(--soft)", fontWeight: 400 }}>(shown on download &amp; print)</span></h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field"><label>Top title / brand name</label><input value={topText} onChange={(e) => setTopText(e.target.value)} placeholder="e.g. Spice Route Café" /></div>
            <div className="field"><label>Bottom text</label><input value={bottomText} onChange={(e) => setBottomText(e.target.value)} placeholder="e.g. Scan for our menu" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Top logo (above title)</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input type="file" accept="image/*" onChange={(e) => loadLogoFile(e.target.files && e.target.files[0], setTopLogo)} style={{ fontSize: 11.5, maxWidth: 150 }} />
                {topLogo.data && <button className="btn btn-ghost btn-sm" onClick={() => setTopLogo({ data: null, img: null })}>Remove</button>}
              </div>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Center logo (in the QR)</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input type="file" accept="image/*" onChange={(e) => loadLogoFile(e.target.files && e.target.files[0], setCenterLogo)} style={{ fontSize: 11.5, maxWidth: 150 }} />
                {centerLogo.data && <button className="btn btn-ghost btn-sm" onClick={() => setCenterLogo({ data: null, img: null })}>Remove</button>}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="card" style={{ textAlign: "center" }}>
        <h3 style={{ fontSize: 16, marginBottom: 14 }}>Preview</h3>
        <div style={{ background: "#fff", borderRadius: 16, padding: 14, display: "inline-block", border: "1px solid var(--line)" }}>
          <BrandedPreview opts={brandOpts} display={230} />
        </div>
        <div className="field" style={{ textAlign: "left", marginTop: 16 }}><label>Name this code (internal)</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={save} disabled={saving}>
          {saving ? "Saving…" : noCredit ? "🔒 Out of credits — upgrade" : "💾 Save & use 1 credit"}
        </button>
        <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", marginTop: 9 }} onClick={download}>⬇ Download PNG (free)</button>
        <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--soft)", background: "var(--card2)", border: "1px solid var(--line)", borderRadius: 10, padding: 11 }}>
          You have <b style={{ color: "var(--gold)" }}>{profile?.credits ?? 0}</b> credit(s). Saving a code uses 1. Downloads are free.
          {isDynamicType(type)
            ? " This is a dynamic QR — save it, then download from My QR Codes to get the trackable, editable version."
            : " This is a static QR (encodes the data directly)."}
        </div>
      </div>
    </div>
  );
}

function BrandedPreview({ opts, display = 220 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = composeBranded(opts);
    const el = ref.current;
    if (!el) return;
    const scale = display / c.width;
    el.width = Math.round(c.width * scale);
    el.height = Math.round(c.height * scale);
    const ctx = el.getContext("2d");
    ctx.clearRect(0, 0, el.width, el.height);
    ctx.drawImage(c, 0, 0, el.width, el.height);
  }, [opts.qrData, opts.fg, opts.bg, opts.dot, opts.topText, opts.bottomText, opts.logoImg, opts.centerLogoImg, display]);
  return <canvas ref={ref} style={{ width: display, height: "auto", maxWidth: "100%", borderRadius: 8 }} />;
}

function Codes({ codes, setTab, supabase, onChange, flash, onViewAnalytics }) {
  const [sel, setSel] = useState(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [logoData, setLogoData] = useState(null);
  const [logoImg, setLogoImg] = useState(null);
  const [centerData, setCenterData] = useState(null);
  const [centerImg, setCenterImg] = useState(null);
  const [busy, setBusy] = useState(false);

  function open(c) {
    const s = c.style || {};
    setSel(c); setName(c.name); setContent(c.content);
    setTopText(s.brandTop != null ? s.brandTop : c.name);
    setBottomText(s.brandBottom || "");
    setLogoData(s.logo || null); setLogoImg(null);
    if (s.logo) { const im = new Image(); im.onload = () => setLogoImg(im); im.src = s.logo; }
    setCenterData(s.centerLogo || null); setCenterImg(null);
    if (s.centerLogo) { const im = new Image(); im.onload = () => setCenterImg(im); im.src = s.centerLogo; }
  }
  function close() { setSel(null); }

  const style = (sel && sel.style) || {};
  const fg = style.fg || "#181b3a", bg = style.bg || "#ffffff", dot = style.dot || "square";
  const qrData = sel ? (sel.dynamic ? `${SITE_URL}/r/${sel.slug || sel.id}` : (content || sel.content || " ")) : " ";
  const brandOpts = { qrData, fg, bg, dot, topText, bottomText, logoImg, centerLogoImg: centerImg };

  const onLogo = (file) => loadLogoFile(file, ({ data, img }) => { setLogoData(data); setLogoImg(img); });
  const onCenter = (file) => loadLogoFile(file, ({ data, img }) => { setCenterData(data); setCenterImg(img); });

  function download() {
    const a = document.createElement("a");
    a.href = composeBranded(brandOpts).toDataURL("image/png");
    a.download = (name || "qr") + ".png";
    a.click();
    flash("Branded PNG downloaded");
  }
  function printQR() {
    const url = composeBranded(brandOpts).toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) { flash("Allow pop-ups to print"); return; }
    w.document.write(
      '<html><head><title>' + (name || "QR") + '</title></head>' +
      '<body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh">' +
      '<img src="' + url + '" style="max-width:420px;width:90%"/>' +
      '<scr' + 'ipt>window.onload=function(){window.print()}</scr' + 'ipt></body></html>'
    );
    w.document.close();
  }
  function buildStyle() {
    return { fg, bg, dot, brandTop: topText, brandBottom: bottomText, logo: logoData || null, centerLogo: centerData || null };
  }
  async function save() {
    setBusy(true);
    const { error } = await supabase.rpc("qr_update_code", { p_id: sel.id, p_name: name, p_content: content, p_style: buildStyle() });
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
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 640, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 17 }}>Manage &amp; brand QR code</h3>
              <button className="btn btn-ghost btn-sm" onClick={close}>✕ Close</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20, alignItems: "start" }}>
              <div style={{ background: "#fff", borderRadius: 14, padding: 12, border: "1px solid var(--line)", textAlign: "center" }}>
                <BrandedPreview opts={brandOpts} display={216} />
                <div style={{ fontSize: 11, color: "var(--soft)", marginTop: 6 }}>Download preview</div>
              </div>
              <div>
                <div className="field"><label>Code name (internal)</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="field"><label>Destination / content (edit the link here)</label><textarea value={content} onChange={(e) => setContent(e.target.value)} style={{ minHeight: 60 }} /></div>
                <div style={{ borderTop: "1px solid var(--line)", margin: "6px 0 12px", paddingTop: 10, fontSize: 12.5, fontWeight: 600, color: "var(--soft)" }}>BRANDING (shown on download &amp; print)</div>
                <div className="field"><label>Top title / brand name</label><input value={topText} onChange={(e) => setTopText(e.target.value)} placeholder="e.g. Spice Route Café" /></div>
                <div className="field"><label>Bottom text</label><input value={bottomText} onChange={(e) => setBottomText(e.target.value)} placeholder="e.g. Scan for our menu" /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Top logo (above title)</label>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <input type="file" accept="image/*" onChange={(e) => onLogo(e.target.files && e.target.files[0])} style={{ fontSize: 11, maxWidth: 130 }} />
                      {logoData && <button className="btn btn-ghost btn-sm" onClick={() => { setLogoData(null); setLogoImg(null); }}>✕</button>}
                    </div>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Center logo (in QR)</label>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <input type="file" accept="image/*" onChange={(e) => onCenter(e.target.files && e.target.files[0])} style={{ fontSize: 11, maxWidth: 130 }} />
                      {centerData && <button className="btn btn-ghost btn-sm" onClick={() => { setCenterData(null); setCenterImg(null); }}>✕</button>}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--soft)", marginTop: 10 }}>
                  Scans: <b>{sel.scans}</b> · <span className={"pill " + (sel.dynamic ? "dyn" : "stat")}>{sel.dynamic ? "Dynamic" : "Static"}</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 16 }}>
              <button className="btn btn-primary" onClick={save} disabled={busy}>💾 Save</button>
              <button className="btn btn-ghost" onClick={download}>⬇ Download PNG</button>
              <button className="btn btn-ghost" onClick={printQR}>🖨 Print</button>
              <button className="btn btn-ghost" onClick={() => { const id = sel.id; close(); onViewAnalytics && onViewAnalytics(id); }}>📈 View analytics</button>
              <button className="btn btn-ghost" onClick={del} disabled={busy} style={{ marginLeft: "auto", color: "var(--danger)" }}>🗑 Delete</button>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: "var(--soft)", background: "var(--card2)", border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}>
              {sel.dynamic ? (
                <>This is a <b style={{ color: "var(--accent)" }}>dynamic QR</b> — the code image never changes, so you can edit the destination anytime and every scan (even of printed codes) follows the new link. Branding &amp; text are added around the code on download. Save to remember your branding.</>
              ) : (
                <>This is a <b>static QR</b> — editing the content changes the code, so re-download after saving. Branding &amp; text are added around the code on download.</>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Billing({ supabase, profile, plans, txns, orders, onChange, flash }) {
  const [qty, setQty] = useState(5);
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState(null); // { kind, planId?, qty?, amount, label }
  const rate = plans.find((p) => p.id === profile?.plan)?.addon_rate || 100;
  useEffect(() => { if (profile && profile.phone) setPhone(profile.phone); }, [profile]);

  // On return from Cashfree checkout, verify the order and grant credits.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const oid = new URLSearchParams(window.location.search).get("order_id");
    if (!oid) return;
    fetch("/api/cashfree/verify?order_id=" + encodeURIComponent(oid))
      .then((r) => r.json())
      .then((j) => {
        if (j.status === "paid") { flash("🎉 Payment successful — credits added!"); onChange(); }
        else if (j.error) flash("Payment check: " + j.error);
        else flash("Payment status: " + (j.status || "pending"));
        window.history.replaceState({}, "", "/dashboard");
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadSdk() {
    return new Promise((resolve, reject) => {
      if (window.Cashfree) return resolve(window.Cashfree);
      const s = document.createElement("script");
      s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      s.onload = () => resolve(window.Cashfree);
      s.onerror = () => reject(new Error("Could not load Cashfree SDK"));
      document.body.appendChild(s);
    });
  }
  async function startCheckout(payload) {
    setBusy(true);
    try {
      const res = await fetch("/api/cashfree/create-order", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (res.status === 503 || j.configured === false) {
        flash("Payments aren't switched on yet — add your Cashfree keys in Vercel.");
        setBusy(false); return;
      }
      if (!res.ok) { flash("Error: " + (j.error || "could not start payment")); setBusy(false); return; }
      const CF = await loadSdk();
      const cashfree = CF({ mode: CASHFREE_MODE });
      cashfree.checkout({ paymentSessionId: j.paymentSessionId, redirectTarget: "_self" });
      // page navigates to Cashfree; on return, the effect above verifies.
    } catch (e) {
      flash("Error: " + e.message);
      setBusy(false);
    }
  }
  function subscribe(id) {
    const p = plans.find((x) => x.id === id);
    setPending({ kind: "plan", planId: id, amount: p ? p.price : 0, label: (p ? p.name : "") + " package · " + (p ? p.qr_included : 0) + " QR/year" });
  }
  function buyAddons() {
    if (qty >= 1) setPending({ kind: "addon", qty: Number(qty), amount: rate * Number(qty), label: qty + " addon credits @ ₹" + rate });
  }
  function confirmPay() {
    const digits = String(phone).replace(/[^0-9]/g, "");
    if (digits.length < 10) { flash("Enter a valid 10-digit phone number"); return; }
    startCheckout({ kind: pending.kind, planId: pending.planId, qty: pending.qty, phone: digits });
  }
  function retry(o) {
    const label = (o.kind === "plan" ? (o.plan || "Plan") + " package" : (o.qty || "") + " addon credits") + " (retry)";
    setPending({ kind: o.kind, planId: o.plan, qty: o.qty, amount: o.amount, label });
  }
  function downloadInvoice(o) {
    const w = window.open("", "_blank"); if (!w) return;
    const item = o.kind === "plan" ? (o.plan || "Plan") + " package" : (o.qty || "") + " addon credits";
    const date = new Date(o.paid_at || o.created_at).toLocaleString();
    const RATE = 18; // GST %
    const gross = Number(o.amount) || 0;
    const taxable = +(gross / (1 + RATE / 100)).toFixed(2);
    const gst = +(gross - taxable).toFixed(2);
    const half = +(gst / 2).toFixed(2);
    const HSN = "998314"; // IT / software services
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
      '<div class="head"><div><div class="brand">QR Studio</div><div class="muted">Developed by Jupiter Technologies · Made in India</div><div class="muted">GSTIN: __________ (add once registered)</div></div>' +
      '<div style="text-align:right"><div style="font-size:18px;font-weight:700">TAX INVOICE</div><div class="muted">' + (o.invoice_no || o.id) + '</div><div class="muted">' + date + '</div></div></div>' +
      '<div style="margin-top:18px"><div class="muted">BILLED TO</div><div>' + (profile && profile.email ? profile.email : "Customer") + '</div></div>' +
      '<table><thead><tr><th>Description</th><th class="r">HSN/SAC</th><th class="r">Taxable value</th></tr></thead>' +
      '<tbody><tr><td>' + item + '</td><td class="r">' + HSN + '</td><td class="r">₹' + taxable.toLocaleString() + '</td></tr></tbody></table>' +
      '<div class="summary">' +
      '<div><span>Taxable value</span><span>₹' + taxable.toLocaleString() + '</span></div>' +
      '<div><span>CGST @ ' + (RATE / 2) + '%</span><span>₹' + half.toLocaleString() + '</span></div>' +
      '<div><span>SGST @ ' + (RATE / 2) + '%</span><span>₹' + half.toLocaleString() + '</span></div>' +
      '<div class="tot"><span>Total (incl. GST)</span><span>₹' + gross.toLocaleString() + '</span></div>' +
      '</div>' +
      '<div class="tag">Order ID: ' + o.id + ' · Paid via Cashfree.<br/>Prices are inclusive of GST @ ' + RATE + '%. This is a system-generated invoice; a registered GSTIN can be added above once available.</div>' +
      '<scr' + 'ipt>window.onload=function(){window.print()}</scr' + 'ipt></body></html>'
    );
    w.document.close();
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
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Payment history</h3>
        {(!orders || orders.length === 0) ? <p style={{ color: "var(--soft)" }}>No payments yet.</p> : (
          <table><thead><tr><th>Date</th><th>Invoice</th><th>Item</th><th>Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>{orders.map((o) => (
              <tr key={o.id}>
                <td style={{ color: "var(--soft)" }}>{new Date(o.created_at).toLocaleString()}</td>
                <td style={{ color: "var(--soft)", fontSize: 12 }}>{o.invoice_no || "—"}</td>
                <td>{o.kind === "plan" ? (o.plan || "Plan") + " package" : (o.qty || "") + " addon credits"}</td>
                <td><b>₹{o.amount}</b></td>
                <td><span className={"pill " + (o.status === "paid" ? "dyn" : o.status === "failed" ? "stat" : "active")}>{o.status}</span></td>
                <td>
                  {o.status === "paid"
                    ? <button className="btn btn-ghost btn-sm" onClick={() => downloadInvoice(o)}>🧾 Invoice</button>
                    : <button className="btn btn-primary btn-sm" onClick={() => retry(o)}>↻ Retry</button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Account activity</h3>
        {txns.length === 0 ? <p style={{ color: "var(--soft)" }}>No activity yet.</p> : (
          <table><thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
            <tbody>{txns.map((t) => <tr key={t.id}><td style={{ color: "var(--soft)" }}>{new Date(t.created_at).toLocaleDateString()}</td><td>{t.description}</td><td><b>₹{t.amount}</b></td></tr>)}</tbody>
          </table>
        )}
      </div>
      <p style={{ marginTop: 14, fontSize: 12, color: "var(--soft)" }}>🔒 Payments are processed securely by <b style={{ color: "var(--txt)" }}>Cashfree</b>. Credits are added only after your payment is confirmed. (Requires Cashfree keys configured in the deployment.)</p>

      {pending && (
        <div onClick={() => !busy && setPending(null)} style={{ position: "fixed", inset: 0, background: "rgba(20,25,50,.5)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 120, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 400 }}>
            <h3 style={{ fontSize: 18, marginBottom: 4 }}>Checkout</h3>
            <p style={{ color: "var(--soft)", fontSize: 13.5, marginBottom: 14 }}>{pending.label}</p>
            <div style={{ background: "var(--card2)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--soft)", fontSize: 13 }}>Amount payable</span>
              <b style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 22, color: "var(--gold)" }}>₹{pending.amount.toLocaleString()}</b>
            </div>
            <div className="field">
              <label>Phone number (for payment &amp; receipt)</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" inputMode="numeric" maxLength={10} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setPending(null)} disabled={busy}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={confirmPay} disabled={busy}>{busy ? "Starting…" : "Pay ₹" + pending.amount.toLocaleString()}</button>
            </div>
            <p style={{ fontSize: 11, color: "var(--soft)", marginTop: 12, textAlign: "center" }}>Secured by Cashfree · UPI, cards, netbanking</p>
          </div>
        </div>
      )}
    </>
  );
}

function Bars({ items, max }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140, marginTop: 6 }}>
      {items.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div title={d.n + " scans"} style={{ width: "100%", height: Math.max(3, (d.n / max) * 118), background: "linear-gradient(180deg,var(--brand),var(--brand2))", borderRadius: "5px 5px 0 0" }} />
          <span style={{ fontSize: 9.5, color: "var(--soft)" }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}
function Breakdown({ title, rows, total }) {
  const cols = ["#6c8cff", "#0ea371", "#b7791f", "#e5484d", "#7c5cff", "#5f6982"];
  return (
    <div className="card">
      <h3 style={{ fontSize: 16, marginBottom: 14 }}>{title}</h3>
      {rows.length === 0 ? <p style={{ color: "var(--soft)", fontSize: 13.5 }}>No data yet.</p> : rows.map(([k, n], i) => (
        <div key={k} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}><span>{k}</span><b>{n} · {Math.round((n / total) * 100)}%</b></div>
          <div style={{ background: "var(--card2)", borderRadius: 6, height: 8 }}><div style={{ width: (n / total * 100) + "%", height: "100%", borderRadius: 6, background: cols[i % cols.length] }} /></div>
        </div>
      ))}
    </div>
  );
}

function buildBuckets(start, end, events) {
  const dayMs = 86400000;
  const span = Math.max(1, Math.round((end - start) / dayMs) + 1);
  const mode = span <= 31 ? "day" : span <= 210 ? "week" : "month";
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function keyFor(d) {
    if (mode === "day") return d.toISOString().slice(0, 10);
    if (mode === "week") { const dd = new Date(d); const off = (dd.getDay() + 6) % 7; dd.setDate(dd.getDate() - off); return dd.toISOString().slice(0, 10); }
    return d.getFullYear() + "-" + (d.getMonth() + 1);
  }
  function label(key) {
    if (mode === "month") { const m = +key.split("-")[1]; return MON[m - 1]; }
    const d = new Date(key); return (d.getMonth() + 1) + "/" + d.getDate();
  }
  const buckets = [], idx = {};
  let cur = new Date(start); cur.setHours(0, 0, 0, 0);
  let guard = 0;
  while (cur <= end && guard < 500) {
    const key = keyFor(cur);
    if (!(key in idx)) { idx[key] = buckets.length; buckets.push({ key, label: label(key), n: 0 }); }
    if (mode === "day") cur.setDate(cur.getDate() + 1);
    else if (mode === "week") cur.setDate(cur.getDate() + 7);
    else cur.setMonth(cur.getMonth() + 1);
    guard++;
  }
  events.forEach((e) => { const k = keyFor(new Date(e.scanned_at)); if (k in idx) buckets[idx[k]].n++; });
  return buckets;
}

function Analytics({ codes, scans, totalScans, initialCode }) {
  const [codeFilter, setCodeFilter] = useState(initialCode || "all");
  const [preset, setPreset] = useState("30");
  useEffect(() => { if (initialCode) setCodeFilter(initialCode); }, [initialCode]);
  const [fromD, setFromD] = useState("");
  const [toD, setToD] = useState("");

  const nameById = {}; codes.forEach((c) => (nameById[c.id] = c.name));
  const all = scans || [];

  // resolve date window
  const now = new Date();
  let end = new Date(now); end.setHours(23, 59, 59, 999);
  let start;
  if (preset === "custom") {
    start = fromD ? new Date(fromD + "T00:00:00") : new Date(0);
    if (toD) { end = new Date(toD + "T23:59:59"); }
  } else if (preset === "all") {
    const times = all.map((e) => +new Date(e.scanned_at));
    start = times.length ? new Date(Math.min(...times)) : new Date(now.getTime() - 13 * 86400000);
    start.setHours(0, 0, 0, 0);
  } else {
    start = new Date(now); start.setDate(start.getDate() - (+preset - 1)); start.setHours(0, 0, 0, 0);
  }

  const evs = all.filter((e) => {
    if (codeFilter !== "all" && e.code_id !== codeFilter) return false;
    const t = new Date(e.scanned_at);
    return t >= start && t <= end;
  });

  const buckets = buildBuckets(start, end, evs);
  const maxD = Math.max(1, ...buckets.map((d) => d.n));
  const tally = (field, fb) => { const m = {}; evs.forEach((e) => { const k = e[field] || fb; m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const devices = tally("device", "Unknown");
  const browsers = tally("browser", "Unknown");
  const countries = tally("country", "—").slice(0, 6);
  const total = evs.length || 1;
  const recent = evs.slice(0, 50);
  const rangeLabel = preset === "all" ? "All time" : preset === "custom" ? "Custom range" : "Last " + preset + " days";
  const scopeLabel = codeFilter === "all" ? "All codes" : (nameById[codeFilter] || "Code");

  function exportCSV() {
    const head = ["Time (ISO)", "Code", "Device", "OS", "Browser", "Country", "Referrer"];
    const rows = evs.map((e) => [new Date(e.scanned_at).toISOString(), nameById[e.code_id] || "", e.device || "", e.os || "", e.browser || "", e.country || "", e.referrer || ""]);
    const csv = [head, ...rows].map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "qr-scans.csv"; a.click();
  }
  function exportPDF() {
    const w = window.open("", "_blank"); if (!w) return;
    const rowsHtml = recent.map((e) => `<tr><td>${new Date(e.scanned_at).toLocaleString()}</td><td>${nameById[e.code_id] || "—"}</td><td>${e.device || "—"}</td><td>${(e.os || "—") + " · " + (e.browser || "—")}</td><td>${e.country || "—"}</td></tr>`).join("");
    const devHtml = devices.map(([k, n]) => `<li>${k}: ${n} (${Math.round(n / total * 100)}%)</li>`).join("");
    const ctyHtml = countries.map(([k, n]) => `<li>${k}: ${n}</li>`).join("");
    w.document.write(`<html><head><title>QR Scan Report</title><style>
      body{font-family:Arial,sans-serif;color:#1b2138;padding:28px;max-width:820px;margin:auto}
      h1{font-size:22px;margin:0 0 4px}.sub{color:#5f6982;font-size:13px;margin-bottom:18px}
      .kpis{display:flex;gap:24px;margin:16px 0}.kpi b{font-size:24px;display:block}
      table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}
      th,td{border-bottom:1px solid #e2e7f1;padding:7px 8px;text-align:left}
      th{color:#5f6982;text-transform:uppercase;font-size:10px}
      .cols{display:flex;gap:40px}ul{font-size:13px;color:#333}
      </style></head><body>
      <h1>QR Studio — Scan Report</h1>
      <div class="sub">${scopeLabel} · ${rangeLabel} · generated ${now.toLocaleString()}</div>
      <div class="kpis"><div class="kpi"><b>${evs.length}</b>scans in range</div><div class="kpi"><b>${totalScans}</b>total (all time)</div></div>
      <div class="cols"><div><h3>By device</h3><ul>${devHtml || "<li>—</li>"}</ul></div><div><h3>By country</h3><ul>${ctyHtml || "<li>—</li>"}</ul></div></div>
      <h3>Recent scans (up to 50)</h3>
      <table><thead><tr><th>Time</th><th>Code</th><th>Device</th><th>OS · Browser</th><th>Country</th></tr></thead><tbody>${rowsHtml || "<tr><td colspan=5>No scans</td></tr>"}</tbody></table>
      <script>window.onload=function(){window.print()}</scr${""}ipt></body></html>`);
    w.document.close();
  }

  const selStyle = { background: "#ffffff", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 11px", color: "var(--txt)", fontFamily: "inherit", fontSize: 13.5 };

  return (
    <>
      <div className="card" style={{ marginBottom: 18, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--soft)", marginBottom: 5 }}>Code</label>
          <select value={codeFilter} onChange={(e) => setCodeFilter(e.target.value)} style={selStyle}>
            <option value="all">All codes</option>
            {codes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--soft)", marginBottom: 5 }}>Range</label>
          <select value={preset} onChange={(e) => setPreset(e.target.value)} style={selStyle}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
            <option value="custom">Custom…</option>
          </select>
        </div>
        {preset === "custom" && (
          <>
            <div><label style={{ display: "block", fontSize: 12, color: "var(--soft)", marginBottom: 5 }}>From</label><input type="date" value={fromD} onChange={(e) => setFromD(e.target.value)} style={selStyle} /></div>
            <div><label style={{ display: "block", fontSize: 12, color: "var(--soft)", marginBottom: 5 }}>To</label><input type="date" value={toD} onChange={(e) => setToD(e.target.value)} style={selStyle} /></div>
          </>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={exportCSV}>⬇ CSV</button>
          <button className="btn btn-ghost btn-sm" onClick={exportPDF}>🖨 PDF</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 18 }}>
        <StatCard label={"Scans (" + rangeLabel.toLowerCase() + ")"} value={evs.length.toLocaleString()} />
        <StatCard label="Total scans (all time)" value={totalScans.toLocaleString()} />
        <StatCard label="Unique codes scanned" value={new Set(evs.map((e) => e.code_id)).size} />
        <StatCard label="Viewing" value={scopeLabel} />
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 16 }}>Scans over time <span style={{ fontSize: 12, color: "var(--soft)", fontWeight: 400 }}>· {scopeLabel} · {rangeLabel}</span></h3>
        {evs.length === 0
          ? <p style={{ color: "var(--soft)", fontSize: 13.5, marginTop: 10 }}>No scans in this range. Scans appear once people scan your dynamic codes (the site must be publicly accessible).</p>
          : <Bars items={buckets} max={maxD} />}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18, marginBottom: 18 }}>
        <Breakdown title="By device" rows={devices} total={total} />
        <Breakdown title="By browser" rows={browsers} total={total} />
        <Breakdown title="By country" rows={countries} total={total} />
      </div>

      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 14 }}>Recent scans <span style={{ fontSize: 12, color: "var(--soft)", fontWeight: 400 }}>· {evs.length} in range</span></h3>
        {recent.length === 0 ? <p style={{ color: "var(--soft)", fontSize: 13.5 }}>No scans in this range.</p> : (
          <table>
            <thead><tr><th>Time</th><th>Code</th><th>Device</th><th>OS · Browser</th><th>Country</th></tr></thead>
            <tbody>
              {recent.map((e) => (
                <tr key={e.id}>
                  <td style={{ color: "var(--soft)" }}>{new Date(e.scanned_at).toLocaleString()}</td>
                  <td><b>{nameById[e.code_id] || "—"}</b></td>
                  <td>{e.device || "—"}</td>
                  <td style={{ color: "var(--soft)" }}>{(e.os || "—") + " · " + (e.browser || "—")}</td>
                  <td>{e.country || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
