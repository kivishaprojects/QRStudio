"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "../../lib/supabaseBrowser";
import { SITE_URL } from "../../lib/supabaseConfig";
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
  const [profile, setProfile] = useState(null);
  const [plans, setPlans] = useState([]);
  const [codes, setCodes] = useState([]);
  const [txns, setTxns] = useState([]);
  const [scans, setScans] = useState([]);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    await supabase.rpc("qr_ensure_profile", { p_name: null });
    const [{ data: prof }, { data: pl }, { data: cs }, { data: tx }, { data: sc }] = await Promise.all([
      supabase.from("qr_profiles").select("*").eq("id", user.id).single(),
      supabase.from("qr_plans").select("*").order("sort"),
      supabase.from("qs_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("qr_transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("qs_scans").select("*").order("scanned_at", { ascending: false }).limit(1000),
    ]);
    setProfile(prof); setPlans(pl || []); setCodes(cs || []); setTxns(tx || []); setScans(sc || []);
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
          {tab === "analytics" && <Analytics codes={codes} scans={scans} totalScans={totalScans} />}
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

function Codes({ codes, setTab, supabase, onChange, flash }) {
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

function Analytics({ codes, scans, totalScans }) {
  const nameById = {}; codes.forEach((c) => (nameById[c.id] = c.name));
  const evs = scans || [];

  // last 14 days
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); days.push({ key: d.toISOString().slice(0, 10), label: (d.getMonth() + 1) + "/" + d.getDate(), n: 0 }); }
  const dayMap = {}; days.forEach((d) => (dayMap[d.key] = d));
  evs.forEach((e) => { const k = (e.scanned_at || "").slice(0, 10); if (dayMap[k]) dayMap[k].n++; });
  const maxD = Math.max(1, ...days.map((d) => d.n));

  const tally = (field, fallback) => {
    const m = {}; evs.forEach((e) => { const k = e[field] || fallback; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };
  const devices = tally("device", "Unknown");
  const browsers = tally("browser", "Unknown");
  const countries = tally("country", "—").slice(0, 6);
  const total = evs.length || 1;
  const recent = evs.slice(0, 20);
  const last7 = days.slice(7).reduce((a, d) => a + d.n, 0);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 22 }}>
        <StatCard label="Total scans" value={totalScans.toLocaleString()} />
        <StatCard label="Scans (last 7 days)" value={last7.toLocaleString()} />
        <StatCard label="Logged scan events" value={evs.length.toLocaleString()} />
        <StatCard label="Active codes" value={codes.length} />
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 16 }}>Scans — last 14 days</h3>
        {evs.length === 0
          ? <p style={{ color: "var(--soft)", fontSize: 13.5, marginTop: 10 }}>No scans recorded yet. Scans appear here once people scan your dynamic codes (make sure the site is publicly accessible).</p>
          : <Bars items={days} max={maxD} />}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18, marginBottom: 18 }}>
        <Breakdown title="By device" rows={devices} total={total} />
        <Breakdown title="By browser" rows={browsers} total={total} />
        <Breakdown title="By country" rows={countries} total={total} />
      </div>

      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 14 }}>Recent scans</h3>
        {recent.length === 0 ? <p style={{ color: "var(--soft)", fontSize: 13.5 }}>No scans yet.</p> : (
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
