import LegalLayout, { BIZ, H2, P } from "../../components/LegalLayout";

export const metadata = { title: "Refunds & Cancellations — India QRCode" };

export default function Refunds() {
  return (
    <LegalLayout title="Refunds & Cancellations" updated="July 2026">
      <P>
        This policy explains how cancellations and refunds work for purchases made on {BIZ.brand},
        operated by {BIZ.company}. By making a payment you agree to this policy together with our{" "}
        <a href="/terms" style={{ color: "var(--brand)" }}>Terms &amp; Conditions</a>.
      </P>

      <H2>Nature of the service</H2>
      <P>
        {BIZ.brand} is a digital service. Plans and add-on packs are prepaid QR credits that are made
        available to your account immediately after a successful payment. Because credits are delivered
        instantly and can be used right away, purchases are generally non-refundable once credits have
        been used.
      </P>

      <H2>Cancellations</H2>
      <P>
        Our plans are one-time annual purchases and add-on packs — they are not auto-renewing
        subscriptions, so there is nothing to cancel to stop a future charge. You may stop using the
        Service or close your account at any time from your dashboard. Unused credits remaining at
        account closure are not exchangeable for cash.
      </P>

      <H2>When you are eligible for a refund</H2>
      <P>
        We will refund you in the following cases: (a) you were charged but the credits or plan were not
        applied to your account due to a technical error on our side; (b) you were charged more than
        once for the same order (duplicate payment); or (c) a payment was deducted but the order failed.
        In these cases the full amount for the affected transaction is refunded.
      </P>

      <H2>When a refund is not available</H2>
      <P>
        Refunds are not available for credits that have already been used to create QR codes, for
        change-of-mind after credits have been consumed, or for issues caused by incorrect details you
        provided (for example, an incorrect destination URL that you can edit yourself on a dynamic
        code). Partial-use of a plan does not entitle you to a pro-rata refund of unused credits.
      </P>

      <H2>How to request a refund</H2>
      <P>
        Raise a support ticket from <b>Dashboard → Support</b> or email us at{" "}
        <a href={"mailto:" + BIZ.email} style={{ color: "var(--brand)" }}>{BIZ.email}</a> within 7 days
        of the transaction, quoting your invoice number and order ID. Our team will review your request
        and respond within 1–2 business days.
      </P>

      <H2>Refund timeline and method</H2>
      <P>
        Approved refunds are processed to your original payment method through our payment gateway
        partner, Cashfree Payments. Once approved, refunds are typically credited within 5–7 business
        days, though the exact time depends on your bank or card issuer. Any applicable GST is refunded
        along with the transaction amount.
      </P>

      <H2>Contact</H2>
      <P>
        For any questions about cancellations or refunds, contact us at{" "}
        <a href={"mailto:" + BIZ.email} style={{ color: "var(--brand)" }}>{BIZ.email}</a>.
      </P>
    </LegalLayout>
  );
}
