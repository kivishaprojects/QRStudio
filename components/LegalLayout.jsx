import Link from "next/link";

// Shared company / brand details used across policy & pricing pages.
export const BIZ = {
  brand: "India QRCode",
  company: "Jupiter Technologies",
  email: "kivishaprojects@gmail.com",
  site: "https://www.indiaqrcode.com",
  address: "P-404, Shreenand City 7, New Maninagar, Ramol, Ahmedabad, Gujarat, India",
  gstin: "24AHGPR7207K1Z4",
};

export const FOOTER_LINKS = [
  ["/pricing", "Pricing"],
  ["/contact", "Contact Us"],
  ["/terms", "Terms & Conditions"],
  ["/refunds", "Refunds & Cancellations"],
];

export default function LegalLayout({ title, updated, children }) {
  return (
    <main>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,.82)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--line)" }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 88 }}>
          <Link href="/"><img src="/logo.png" alt="India QR Code" style={{ height: 68 }} /></Link>
          <div style={{ display: "flex", gap: 12 }}>
            <Link className="btn btn-ghost" href="/login">Log in</Link>
            <Link className="btn btn-primary" href="/login?mode=signup">Start free →</Link>
          </div>
        </div>
      </header>

      <section className="container" style={{ maxWidth: 820, padding: "48px 0 60px" }}>
        <h1 style={{ fontSize: "clamp(28px,5vw,40px)", fontWeight: 800, letterSpacing: "-.02em", marginBottom: 6 }}>{title}</h1>
        {updated && <p style={{ color: "var(--soft)", fontSize: 13.5, marginBottom: 28 }}>Last updated: {updated}</p>}
        <div style={{ fontSize: 15, lineHeight: 1.75, color: "#2b3350" }}>{children}</div>
      </section>

      <footer style={{ borderTop: "1px solid var(--line)", padding: "30px 0 40px", color: "var(--soft)", fontSize: 13 }}>
        <div className="container" style={{ textAlign: "center" }}>
          <img src="/logo.png" alt="India QR Code" style={{ height: 96, marginBottom: 16 }} />
          <div style={{ display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
            {FOOTER_LINKS.map(([href, label]) => (
              <Link key={href} href={href} style={{ color: "var(--soft)" }}>{label}</Link>
            ))}
          </div>
          <div>© 2026 {BIZ.brand} · Developed By : {BIZ.company} : Made in India</div>
        </div>
      </footer>
    </main>
  );
}

// Small helpers for consistent section styling inside legal pages.
export function H2({ children }) {
  return <h2 style={{ fontSize: 19, fontWeight: 700, margin: "30px 0 10px", color: "var(--txt)" }}>{children}</h2>;
}
export function P({ children }) {
  return <p style={{ marginBottom: 14 }}>{children}</p>;
}
