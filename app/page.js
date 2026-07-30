import Link from "next/link";

const FEATURES = [
  ["🔀", "Dynamic QR codes", "Change the destination anytime — even after printing."],
  ["📊", "Scan analytics", "Track scans, devices, and locations in real time."],
  ["🎨", "Custom styling", "Brand colors, rounded modules or dots, and logos."],
  ["🧩", "10+ content types", "URL, WiFi, UPI, vCard, email, SMS and more."],
  ["🖼️", "PNG & SVG export", "Print-ready vectors, sharp at any size."],
  ["🔒", "Secure & private", "Row-level security and privacy-friendly analytics."],
];
const PLANS = [
  ["Free", "₹0", "1 QR code free", ["1 free credit", "All content types", "PNG & SVG download"]],
  ["Starter", "₹999/yr", "5 QR · addons ₹120", ["5 QR / year", "Dynamic + analytics", "Logo & colors"]],
  ["Growth", "₹1,499/yr", "10 QR · addons ₹100", ["10 QR / year", "Everything in Starter", "Priority support"], true],
  ["Pro", "₹2,499/yr", "20 QR · addons ₹80", ["20 QR / year", "Bulk + API", "Team access"]],
];

export default function Home() {
  return (
    <main>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(13,15,36,.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--line)" }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 70 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, fontWeight: 800, fontSize: 19 }}>
            <span className="logo">▦</span> QR Studio
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Link className="btn btn-ghost" href="/login">Log in</Link>
            <Link className="btn btn-primary" href="/login?mode=signup">Start free →</Link>
          </div>
        </div>
      </header>

      <section style={{ textAlign: "center", padding: "110px 0 70px", position: "relative" }}>
        <div className="container">
          <div style={{ display: "inline-flex", gap: 8, background: "var(--card2)", border: "1px solid var(--line)", borderRadius: 20, padding: "8px 16px", fontSize: 13, color: "var(--soft)", marginBottom: 24 }}>
            🎉 <b style={{ color: "var(--accent)" }}>1 QR code free</b> on every account
          </div>
          <h1 style={{ fontSize: "clamp(38px,6vw,64px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-.02em" }}>
            Dynamic QR codes for<br />
            <span style={{ background: "linear-gradient(120deg,var(--brand),var(--accent))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              absolutely everything
            </span>
          </h1>
          <p style={{ color: "var(--soft)", fontSize: 18, maxWidth: 600, margin: "22px auto 32px", lineHeight: 1.6 }}>
            Create, style, and track scannable QR codes for links, WiFi, payments and contacts — editable after printing, with real-time analytics.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link className="btn btn-primary" href="/login?mode=signup">Create your free QR →</Link>
            <a className="btn btn-ghost" href="#pricing">See pricing</a>
          </div>
          <div style={{ marginTop: 16, fontSize: 13, color: "var(--soft)" }}>
            Then <b style={{ color: "var(--gold)" }}>₹100/QR</b> monthly, or save with annual packages from <b style={{ color: "var(--gold)" }}>₹999</b>.
          </div>
        </div>
      </section>

      <section className="container" style={{ paddingBottom: 40 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18 }}>
          {FEATURES.map((f, i) => (
            <div className="card" key={i}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--card2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 14 }}>{f[0]}</div>
              <h4 style={{ fontSize: 18, marginBottom: 7 }}>{f[1]}</h4>
              <p style={{ color: "var(--soft)", fontSize: 14, lineHeight: 1.6 }}>{f[2]}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="container" style={{ padding: "70px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 800 }}>Start free. Scale as you grow.</h2>
          <p style={{ color: "var(--soft)", marginTop: 12 }}>One QR free on signup. Then pay per code or save with a package.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16 }}>
          {PLANS.map((p, i) => (
            <div className="card" key={i} style={{ position: "relative", border: p[4] ? "1px solid var(--brand)" : undefined }}>
              {p[4] && <span style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,var(--brand),var(--brand2))", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>POPULAR</span>}
              <h4 style={{ fontSize: 17 }}>{p[0]}</h4>
              <div style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 30, fontWeight: 800, margin: "8px 0 2px" }}>{p[1]}</div>
              <div style={{ fontSize: 12.5, color: "var(--accent)", marginBottom: 14 }}>{p[2]}</div>
              <ul style={{ listStyle: "none", marginBottom: 18 }}>
                {p[3].map((li, j) => (
                  <li key={j} style={{ fontSize: 13.5, color: "var(--soft)", padding: "6px 0", display: "flex", gap: 8 }}>
                    <span style={{ color: "var(--accent)" }}>✓</span> {li}
                  </li>
                ))}
              </ul>
              <Link className={"btn " + (p[4] ? "btn-primary" : "btn-ghost")} href="/login?mode=signup" style={{ width: "100%", justifyContent: "center" }}>
                {p[0] === "Free" ? "Get started" : "Choose plan"}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ borderTop: "1px solid var(--line)", padding: "40px 0", textAlign: "center", color: "var(--soft)", fontSize: 13 }}>
        © 2026 QR Studio · Built with Next.js, Supabase &amp; Vercel · Made in India 🇮🇳
      </footer>
    </main>
  );
}
