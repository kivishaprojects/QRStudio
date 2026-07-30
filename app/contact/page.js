import LegalLayout, { BIZ, H2, P } from "../../components/LegalLayout";
import ContactForm from "../../components/ContactForm";

export const metadata = { title: "Contact Us", description: "Get in touch with the India QR Code team — send an enquiry.", alternates: { canonical: "/contact" } };

export default function Contact() {
  return (
    <LegalLayout title="Contact Us" updated="July 2026">
      <P>
        We’re here to help. Whether you have a question about your account, a QR code, billing, or a
        payment, send us an enquiry using the form below and our team will get back to you. You can
        also raise a support ticket from your dashboard.
      </P>

      <ContactForm />

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
