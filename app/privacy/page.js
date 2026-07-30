import LegalLayout, { BIZ, H2, P } from "../../components/LegalLayout";

export const metadata = { title: "Privacy Policy", description: "How India QR Code collects, uses and protects your data.", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="July 2026">
      <P>
        This Privacy Policy explains how {BIZ.company} (“we”, “us”), operator of {BIZ.brand}
        (the “Service”), collects, uses, shares and protects your personal data. We are committed to
        handling your information responsibly and in line with India’s Digital Personal Data Protection
        Act, 2023 (DPDP Act). By using the Service you agree to this policy.
      </P>

      <H2>Information we collect</H2>
      <P>
        We collect: account details you provide (name, email, mobile number, password); billing
        details for GST invoicing (business/billing name, GSTIN, address, city, state, pincode); the
        content you put into your QR codes; scan analytics for your dynamic QR codes (time of scan,
        device type, operating system, browser, and approximate country derived from network
        information — we do not collect precise GPS location); support tickets and enquiries you send
        us; and technical logs needed to run the Service securely.
      </P>

      <H2>How we use your data</H2>
      <P>
        We use your data to create and operate your account, generate and serve your QR codes, provide
        scan analytics, process payments and issue GST-compliant invoices, provide customer support,
        prevent fraud and abuse, comply with legal obligations, and improve the Service. We do not sell
        your personal data, and we do not use it to serve third-party advertising.
      </P>

      <H2>Payments</H2>
      <P>
        Payments are processed by our gateway partner, Cashfree Payments. Your card, UPI or bank
        details are entered on Cashfree’s secure systems and are never stored on our servers. We store
        only the order, invoice and payment-status information required for billing and accounting.
      </P>

      <H2>Service providers we share data with</H2>
      <P>
        We share limited data with trusted processors purely to run the Service: Supabase (database and
        authentication hosting), Vercel (application hosting), Cashfree (payments), Resend (transactional
        email), and Google (only if you choose “Sign in with Google”). These providers process data on
        our instructions. We may also disclose data where required by law or to protect our rights.
      </P>

      <H2>Cookies and sessions</H2>
      <P>
        We use essential cookies and similar technologies to keep you signed in and to keep the Service
        secure. We do not use advertising or cross-site tracking cookies.
      </P>

      <H2>Data retention</H2>
      <P>
        We retain your account and billing data for as long as your account is active and thereafter as
        required for tax, accounting and legal purposes (GST records are generally retained for the
        period required under Indian law). Scan analytics are retained while the associated QR code
        exists. You can request deletion as described below.
      </P>

      <H2>Your rights</H2>
      <P>
        Subject to applicable law, you may access and correct your personal data (from your dashboard
        under My Account), request a copy of your data, and request deletion of your account and
        associated data. To exercise these rights, contact us at{" "}
        <a href={"mailto:" + BIZ.email} style={{ color: "var(--brand2)" }}>{BIZ.email}</a>. Note that
        we may need to retain certain records (such as issued tax invoices) to meet legal obligations.
      </P>

      <H2>Security</H2>
      <P>
        We protect your data with row-level database security, encrypted connections (HTTPS), hashed
        credentials and API keys, access controls, an admin audit log, and regular backups. No system
        is perfectly secure, but we work continuously to safeguard your information.
      </P>

      <H2>Children</H2>
      <P>
        The Service is intended for businesses and users aged 18 and above. We do not knowingly collect
        data from children.
      </P>

      <H2>Changes and grievance contact</H2>
      <P>
        We may update this policy from time to time; the “Last updated” date reflects the latest
        version. For any privacy questions or grievances, contact our grievance point of contact at{" "}
        <a href={"mailto:" + BIZ.email} style={{ color: "var(--brand2)" }}>{BIZ.email}</a>, or write to{" "}
        {BIZ.company}, {BIZ.address}.
      </P>
    </LegalLayout>
  );
}
