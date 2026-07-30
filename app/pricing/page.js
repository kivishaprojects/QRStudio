import Link from "next/link";
import LegalLayout, { H2, P } from "../../components/LegalLayout";

export const metadata = { title: "Pricing & Products", description: "India QRCode plans and per-item pricing in INR, inclusive of GST.", alternates: { canonical: "/pricing" } };

const PLANS = [
  { name: "Free", price: "₹0", period: "", qr: "1 QR credit", addon: "₹499 / credit / year", best: false, features: ["1 free QR credit", "Dynamic QR + scan tracking", "PNG & SVG download"] },
  { name: "Starter", price: "₹999", period: "/ year", qr: "5 QR credits / year", addon: "₹399 / credit / year", best: false, features: ["5 QR / year", "Dynamic QR + analytics", "Logo & colour branding"] },
  { name: "Growth", price: "₹1,499", period: "/ year", qr: "10 QR credits / year", addon: "₹299 / credit / year", best: true, features: ["10 QR / year", "Everything in Starter", "Priority support"] },
  { name: "Pro", price: "₹2,499", period: "/ year", qr: "20 QR credits / year", addon: "₹199 / credit / year", best: false, features: ["20 QR / year", "Bulk generation", "API access"] },
];

export default function Pricing() {
  return (
    <LegalLayout title="Pricing & Products" updated="July 2026">
      <P>
        India QRCode is a software-as-a-service platform for creating, branding and tracking QR codes.
        Below are our products and services and their prices. All prices are in Indian Rupees (INR) and
        are inclusive of GST at 18%. A GST tax invoice is issued for every paid order.
      </P>

      <H2>Annual plans</H2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16, margin: "10px 0 8px" }}>
        {PLANS.map((p) => (
          <div className="card" key={p.name} style={{ border: p.best ? "1px solid var(--brand)" : undefined, display: "flex", flexDirection: "column" }}>
            {p.best && <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", marginBottom: 6 }}>MOST POPULAR</div>}
            <h3 style={{ fontSize: 18 }}>{p.name}</h3>
            <div style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 28, fontWeight: 800, margin: "8px 0 2px" }}>{p.price}<span style={{ fontSize: 13, color: "var(--soft)", fontWeight: 500 }}>{p.period}</span></div>
            <div style={{ fontSize: 12.5, color: "var(--accent)", marginBottom: 12 }}>{p.qr}</div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px", fontSize: 13.5, color: "#2b3350" }}>
              {p.features.map((f) => <li key={f} style={{ padding: "4px 0" }}><span style={{ color: "var(--accent)" }}>✓</span> {f}</li>)}
              <li style={{ padding: "4px 0", color: "var(--soft)" }}>Add-on credits: {p.addon}</li>
            </ul>
            <Link className={"btn " + (p.best ? "btn-primary" : "btn-ghost")} href="/login?mode=signup" style={{ width: "100%", justifyContent: "center", marginTop: "auto" }}>
              {p.name === "Free" ? "Get started" : "Choose plan"}
            </Link>
          </div>
        ))}
      </div>

      <H2>Products &amp; services — price list (INR)</H2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, margin: "6px 0 4px" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--soft)", fontSize: 12, textTransform: "uppercase" }}>
              <th style={{ padding: "10px 8px", borderBottom: "1px solid var(--line)" }}>Product / Service</th>
              <th style={{ padding: "10px 8px", borderBottom: "1px solid var(--line)" }}>What you get</th>
              <th style={{ padding: "10px 8px", borderBottom: "1px solid var(--line)", textAlign: "right" }}>Price (incl. GST)</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Free plan", "1 QR credit, dynamic QR, scan analytics, PNG/SVG export", "₹0"],
              ["Starter plan", "5 QR credits valid for 1 year", "₹999 / year"],
              ["Growth plan", "10 QR credits valid for 1 year", "₹1,499 / year"],
              ["Pro plan", "20 QR credits valid for 1 year", "₹2,499 / year"],
              ["Add-on credit — Free tier", "Extra QR credit (per credit, 1 year)", "₹499"],
              ["Add-on credit — Starter", "Extra QR credit (per credit, 1 year)", "₹399"],
              ["Add-on credit — Growth", "Extra QR credit (per credit, 1 year)", "₹299"],
              ["Add-on credit — Pro", "Extra QR credit (per credit, 1 year)", "₹199"],
              ["Pay-as-you-go", "Single QR code, billed monthly", "₹100 / QR / month"],
            ].map((r, i) => (
              <tr key={i}>
                <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--line)", fontWeight: 600 }}>{r[0]}</td>
                <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--line)", color: "#2b3350" }}>{r[1]}</td>
                <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--line)", textAlign: "right", fontWeight: 700 }}>{r[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <P>
        <span style={{ color: "var(--soft)", fontSize: 13 }}>
          Prices are inclusive of GST at 18%. The add-on credit rate depends on your current plan — the
          higher your plan, the lower your per-credit add-on price. Taxes are shown separately on your
          invoice. Prices may be revised from time to time; changes do not affect credits already
          purchased.
        </span>
      </P>

      <div style={{ marginTop: 16 }}>
        <Link className="btn btn-primary" href="/login?mode=signup">Create your free QR →</Link>
      </div>
    </LegalLayout>
  );
}
