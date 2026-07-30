import Link from "next/link";

const USE_CASES = [
  ["👤", "Digital Business Card", "#2f6fed"],
  ["⭐", "Google Review QR", "#2ea24d"],
  ["₹", "Payment QR Codes", "#f47a1f"],
  ["🍽️", "Menu QR Codes", "#6b4fd8"],
  ["🟢", "WhatsApp QR", "#25d366"],
  ["📅", "Event Registration", "#e63b7a"],
  ["📦", "Product & More QR", "#17a2b8"],
];
const VALUES = [
  ["🚀", "Boost your digital presence"],
  ["👥", "Engage more customers"],
  ["📊", "Track & analyze performance"],
  ["🔒", "100% secure & reliable"],
];
const FEATURES = [
  ["🔀", "Dynamic QR codes", "Change the destination anytime — even after printing."],
  ["📈", "Scan analytics", "Track scans, devices, and locations in real time."],
  ["🎨", "Custom branding", "Your colours, logo in the middle, and a title on the print."],
  ["🧩", "11 content types", "URL, Text, Email, SMS, Phone, WhatsApp, Location, WiFi, UPI, vCard & Events."],
  ["🖼️", "Print-ready export", "Download crisp PNGs for posters, standees and packaging."],
  ["🔒", "Secure & private", "Row-level security, GST invoices and privacy-friendly analytics."],
];
const PLANS = [
  ["Free", "₹0", "1 QR free · addons ₹499", ["1 free credit", "Dynamic QR + scan tracking", "PNG download"]],
  ["Starter", "₹999/yr", "5 QR · addons ₹399", ["5 QR / year", "Dynamic + analytics", "Logo & colours"]],
  ["Growth", "₹1,499/yr", "10 QR · addons ₹299", ["10 QR / year", "Everything in Starter", "Priority support"], true],
  ["Pro", "₹2,499/yr", "20 QR · addons ₹199", ["20 QR / year", "Bulk generation", "API access"]],
];

export default function Home() {
  return (
    <main>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--line)" }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 92 }}>
          <img src="/logo.png" alt="India QR Code" style={{ height: 72, width: "auto" }} />
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link href="/scan" style={{ fontSize: 14, color: "var(--soft)", fontWeight: 500 }}>Scan</Link>
            <Link className="btn btn-ghost" href="/login">Log in</Link>
            <Link className="btn btn-cta" href="/login?mode=signup">Start free →</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ position: "relative", overflow: "hidden" }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 40, alignItems: "center", padding: "72px 24px 56px" }}>
          <div>
            <div style={{ display: "inline-flex", gap: 8, background: "var(--card2)", border: "1px solid var(--line)", borderRadius: 20, padding: "7px 15px", fontSize: 12.5, color: "var(--soft)", marginBottom: 22, fontWeight: 600, letterSpacing: ".08em" }}>
              <span style={{ color: "var(--saffron)" }}>SCAN</span> • <span style={{ color: "var(--brand2)" }}>CONNECT</span> • <span style={{ color: "var(--green)" }}>GROW</span>
            </div>
            <h1 style={{ fontSize: "clamp(34px,5vw,56px)", fontWeight: 800, lineHeight: 1.06, letterSpacing: "-.02em" }}>
              Smart QR solutions<br />for every <span style={{ color: "var(--saffron)" }}>business</span>
            </h1>
            <p style={{ color: "var(--soft)", fontSize: 17.5, maxWidth: 520, margin: "20px 0 12px", lineHeight: 1.6 }}>
              India QR Code helps you connect with your customers instantly, digitally and intelligently — dynamic QR codes you can brand, edit after printing and track in real time.
            </p>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 26 }}>
              <span style={{ color: "var(--saffron)" }}>Create.</span> <span style={{ color: "var(--brand)" }}>Connect.</span> <span style={{ color: "var(--green)" }}>Grow.</span>
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Link className="btn btn-cta" href="/login?mode=signup">Create your free QR →</Link>
              <a className="btn btn-ghost" href="#pricing">See pricing</a>
            </div>
            <div style={{ marginTop: 14, fontSize: 13, color: "var(--soft)" }}>
              1 QR free on signup. Then <b style={{ color: "var(--saffron)" }}>₹100/QR</b> monthly, or annual packages from <b style={{ color: "var(--saffron)" }}>₹999</b>.
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ position: "relative", background: "linear-gradient(160deg,#fff,#eef2fb)", border: "1px solid var(--line)", borderRadius: 24, padding: 26, boxShadow: "0 30px 60px rgba(21,42,99,.16)", maxWidth: 320, width: "100%", textAlign: "center" }}>
              <div className="tricolor" style={{ borderRadius: 4, marginBottom: 18 }} />
              <div style={{ fontWeight: 800, color: "var(--brand)", fontSize: 20, letterSpacing: ".14em" }}>SCAN ME</div>
              <div style={{ color: "var(--soft)", fontSize: 12.5, letterSpacing: ".18em", marginBottom: 16 }}>TO CONNECT</div>
              <img src="/icons/icon-512.png" alt="Sample QR" style={{ width: 170, height: 170, borderRadius: 18 }} />
              <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 16, fontSize: 20 }}>
                <span>📞</span><span>📶</span><span>📈</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--soft)", letterSpacing: ".12em", marginTop: 8 }}>SCAN • CONNECT • GROW</div>
            </div>
          </div>
        </div>
      </section>

      {/* Use cases (mirrors the banner) */}
      <section className="container" style={{ paddingBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 14 }}>
          {USE_CASES.map((u, i) => (
            <div key={i} style={{ textAlign: "center", padding: "6px 4px" }}>
              <div style={{ width: 62, height: 62, borderRadius: "50%", background: u[2], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 10px", boxShadow: `0 8px 18px ${u[2]}44` }}>{u[0]}</div>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{u[1]}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Value band (navy, like banner footer) */}
      <section style={{ background: "linear-gradient(135deg,var(--brand),#0f1e47)", marginTop: 40 }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 20, padding: "34px 24px" }}>
          {VALUES.map((v, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, color: "#fff" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{v[0]}</div>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>{v[1]}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container" style={{ padding: "64px 24px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 34 }}>
          <h2 style={{ fontSize: "clamp(26px,4vw,38px)", fontWeight: 800 }}>Everything you need to go digital</h2>
          <p style={{ color: "var(--soft)", marginTop: 10 }}>One platform to create, brand and track QR codes for your business.</p>
        </div>
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

      {/* Pricing */}
      <section id="pricing" className="container" style={{ padding: "40px 24px 70px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: "clamp(26px,4vw,38px)", fontWeight: 800 }}>Start free. Scale as you grow.</h2>
          <p style={{ color: "var(--soft)", marginTop: 12 }}>One QR free on signup. Then pay per code or save with a package. All prices in ₹, inclusive of GST.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16 }}>
          {PLANS.map((p, i) => (
            <div className="card" key={i} style={{ position: "relative", border: p[4] ? "2px solid var(--saffron)" : undefined }}>
              {p[4] && <span style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#f79024,var(--saffron))", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>POPULAR</span>}
              <h4 style={{ fontSize: 17 }}>{p[0]}</h4>
              <div style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 30, fontWeight: 800, margin: "8px 0 2px" }}>{p[1]}</div>
              <div style={{ fontSize: 12.5, color: "var(--saffron)", marginBottom: 14, fontWeight: 600 }}>{p[2]}</div>
              <ul style={{ listStyle: "none", marginBottom: 18 }}>
                {p[3].map((li, j) => (
                  <li key={j} style={{ fontSize: 13.5, color: "var(--soft)", padding: "6px 0", display: "flex", gap: 8 }}>
                    <span style={{ color: "var(--green)" }}>✓</span> {li}
                  </li>
                ))}
              </ul>
              <Link className={"btn " + (p[4] ? "btn-cta" : "btn-ghost")} href="/login?mode=signup" style={{ width: "100%", justifyContent: "center" }}>
                {p[0] === "Free" ? "Get started" : "Choose plan"}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section style={{ background: "linear-gradient(135deg,var(--brand),#0f1e47)" }}>
        <div className="container" style={{ textAlign: "center", padding: "50px 24px", color: "#fff" }}>
          <h2 style={{ fontSize: "clamp(24px,4vw,34px)", fontWeight: 800, color: "#fff" }}>Ready to scan, connect and grow?</h2>
          <p style={{ color: "rgba(255,255,255,.8)", margin: "12px 0 22px" }}>Create your first QR code free — no card needed.</p>
          <Link className="btn btn-cta" href="/login?mode=signup">Get started free →</Link>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid var(--line)", padding: "44px 0 48px", textAlign: "center", color: "var(--soft)", fontSize: 13 }}>
        <img src="/logo.png" alt="India QR Code" style={{ height: 120, margin: "0 auto 18px" }} />
        <div style={{ display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
          <Link href="/pricing" style={{ color: "var(--soft)" }}>Pricing</Link>
          <Link href="/contact" style={{ color: "var(--soft)" }}>Contact Us</Link>
          <Link href="/terms" style={{ color: "var(--soft)" }}>Terms &amp; Conditions</Link>
          <Link href="/refunds" style={{ color: "var(--soft)" }}>Refunds &amp; Cancellations</Link>
          <Link href="/scan" style={{ color: "var(--soft)" }}>Scan</Link>
        </div>
        © 2026 India QR Code · Developed By : Jupiter Technologies · Made in India 🇮🇳
      </footer>
    </main>
  );
}
