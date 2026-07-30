import LegalLayout, { BIZ, H2, P } from "../../components/LegalLayout";

export const metadata = { title: "Terms & Conditions — India QRCode" };

export default function Terms() {
  return (
    <LegalLayout title="Terms & Conditions" updated="July 2026">
      <P>
        These Terms &amp; Conditions (“Terms”) govern your access to and use of {BIZ.brand} (the
        “Service”), a QR code generation and analytics platform operated by {BIZ.company}
        (“we”, “us”, “our”). By creating an account or using the Service, you agree to these Terms. If
        you do not agree, please do not use the Service.
      </P>

      <H2>1. The service</H2>
      <P>
        {BIZ.brand} lets you create static and dynamic QR codes for content such as links, WiFi, UPI,
        contact cards, text and more, apply branding, and (for dynamic codes) track scans and edit the
        destination after printing. Features and inclusions depend on your plan.
      </P>

      <H2>2. Accounts</H2>
      <P>
        You must provide accurate information when registering and are responsible for maintaining the
        confidentiality of your login credentials and for all activity under your account. You must be
        at least 18 years old, or use the Service under the supervision of a parent or guardian. Notify
        us immediately of any unauthorised use of your account.
      </P>

      <H2>3. Credits, plans and pricing</H2>
      <P>
        The Service works on a credit model. Each account receives one free QR credit. Additional
        credits are available through annual plans or add-on credit packs. All prices are listed in
        Indian Rupees (INR) and are inclusive of GST at the applicable rate. Creating a QR code consumes
        one credit. Current plans and prices are shown on our{" "}
        <a href="/pricing" style={{ color: "var(--brand)" }}>Pricing</a> page and may change from time to
        time; changes do not affect credits you have already purchased.
      </P>

      <H2>4. Payments and billing</H2>
      <P>
        Payments are processed securely through our payment gateway partner, Cashfree Payments. We do
        not store your card, UPI or bank details. On successful payment we issue a GST tax invoice with
        the correct CGST/SGST or IGST breakup based on your place of supply. You are responsible for
        providing accurate GST and billing details where required.
      </P>

      <H2>5. Acceptable use</H2>
      <P>
        You agree not to use the Service to create or distribute QR codes that link to unlawful,
        fraudulent, infringing, malicious, or harmful content, including malware, phishing, or content
        that violates the rights of others or any applicable law. We may suspend or remove any QR code
        or account that we reasonably believe violates these Terms, and we may place a code or account
        on hold pending review.
      </P>

      <H2>6. Availability of dynamic codes</H2>
      <P>
        Dynamic QR codes redirect through our servers so their destination can be edited and scans can
        be tracked. We aim to keep the Service available at all times but do not guarantee uninterrupted
        or error-free operation, and we are not liable for scans that fail due to circumstances beyond
        our reasonable control. A code placed on hold or deleted will stop redirecting.
      </P>

      <H2>7. Intellectual property</H2>
      <P>
        The Service, including its software, design and branding, is owned by {BIZ.company}. You retain
        ownership of the content you encode in your QR codes and the QR images you generate for your own
        lawful use. You may not copy, resell, or reverse-engineer the Service.
      </P>

      <H2>8. Limitation of liability</H2>
      <P>
        To the maximum extent permitted by law, the Service is provided “as is”, and our total liability
        for any claim arising out of or relating to the Service is limited to the amount you paid to us
        for the Service in the three months preceding the claim. We are not liable for indirect,
        incidental, or consequential damages.
      </P>

      <H2>9. Termination</H2>
      <P>
        You may stop using the Service and close your account at any time. We may suspend or terminate
        your access if you breach these Terms. Refunds, where applicable, are governed by our{" "}
        <a href="/refunds" style={{ color: "var(--brand)" }}>Refunds &amp; Cancellations</a> policy.
      </P>

      <H2>10. Governing law</H2>
      <P>
        These Terms are governed by the laws of India. Any disputes are subject to the exclusive
        jurisdiction of the courts at Ahmedabad, Gujarat.
      </P>

      <H2>11. Changes and contact</H2>
      <P>
        We may update these Terms from time to time; the “Last updated” date above reflects the latest
        version. For any questions about these Terms, contact us at{" "}
        <a href={"mailto:" + BIZ.email} style={{ color: "var(--brand)" }}>{BIZ.email}</a>.
      </P>
    </LegalLayout>
  );
}
