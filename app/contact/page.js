import LegalLayout, { BIZ, H2, P } from "../../components/LegalLayout";

export const metadata = { title: "Contact Us", description: "Get in touch with the India QRCode team — support, billing and grievance contacts.", alternates: { canonical: "/contact" } };

export default function Contact() {
  const row = { display: "flex", gap: 10, padding: "12px 0", borderBottom: "1px solid var(--line)", fontSize: 14.5 };
  const k = { width: 150, color: "var(--soft)", flexShrink: 0 };
  return (
    <LegalLayout title="Contact Us" updated="July 2026">
      <P>
        We’re here to help. Whether you have a question about your account, a QR code, billing, or a
        payment, the fastest way to reach us is through the details below or by raising a support
        ticket from your dashboard.
      </P>

      <div className="card" style={{ margin: "8px 0 6px" }}>
        <div style={row}><div style={k}>Business name</div><div>{BIZ.company}</div></div>
        <div style={row}><div style={k}>Brand</div><div>{BIZ.brand}</div></div>
        <div style={row}><div style={k}>Email</div><div><a href={"mailto:" + BIZ.email} style={{ color: "var(--brand)" }}>{BIZ.email}</a></div></div>
        <div style={row}><div style={k}>Website</div><div><a href={BIZ.site} style={{ color: "var(--brand)" }}>{BIZ.site}</a></div></div>
        <div style={row}><div style={k}>Registered address</div><div>{BIZ.address}</div></div>
        <div style={{ ...row, borderBottom: "none" }}><div style={k}>GSTIN</div><div>{BIZ.gstin}</div></div>
      </div>

      <H2>Support hours</H2>
      <P>
        Monday to Saturday, 10:00 AM to 7:00 PM IST (excluding public holidays). We typically respond
        to email and support tickets within 1–2 business days.
      </P>

      <H2>Raise a support ticket</H2>
      <P>
        Logged-in customers can open a ticket from <b>Dashboard → Support</b>. Tickets let you track the
        full conversation and our response in one place, and are the best way to get help with an
        order, invoice, or technical issue.
      </P>

      <H2>Grievance / escalation</H2>
      <P>
        If your concern has not been resolved to your satisfaction, please write to us at{" "}
        <a href={"mailto:" + BIZ.email} style={{ color: "var(--brand)" }}>{BIZ.email}</a> with your
        ticket number and “Escalation” in the subject line, and a senior member of our team will
        review it.
      </P>
    </LegalLayout>
  );
}
