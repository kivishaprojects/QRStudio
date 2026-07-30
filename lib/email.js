// Best-effort transactional email via Resend. No-ops if RESEND_API_KEY is unset.
async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return;
  const from = process.env.RESEND_FROM || "India QRCode <onboarding@resend.dev>";
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
  } catch (_) {}
}

// Fetches a paid order + its owner email and sends a receipt. Call after fulfillment.
export async function sendOrderReceipt(admin, orderId) {
  try {
    const { data: o } = await admin.from("qs_orders").select("*").eq("id", orderId).single();
    if (!o) return;
    const { data: prof } = await admin.from("qr_profiles").select("email").eq("id", o.user_id).single();
    const to = prof && prof.email;
    if (!to) return;
    const item = o.kind === "plan" ? (o.plan || "Plan") + " package" : (o.qty || "") + " addon credits";
    const when = new Date(o.paid_at || Date.now()).toLocaleString();
    let RATE = 18, BIZ = "India QRCode", LOGO = "";
    try {
      const { data: st } = await admin.from("qs_settings").select("gst_rate,biz_name,logo_url").eq("id", 1).single();
      if (st) { if (st.gst_rate != null) RATE = Number(st.gst_rate); if (st.biz_name) BIZ = st.biz_name; if (st.logo_url) LOGO = st.logo_url; }
    } catch (_) {}
    const gross = Number(o.amount) || 0;
    const taxable = (gross / (1 + RATE / 100)).toFixed(2);
    const gst = (gross - taxable).toFixed(2);
    const isIgst = o.tax_type === "igst";
    const taxLabel = isIgst ? "IGST @ " + RATE + "%" : "GST @ " + RATE + "% (CGST+SGST)";
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1b2138">
        ${LOGO ? '<img src="' + LOGO + '" alt="logo" style="max-height:52px;max-width:180px;margin-bottom:10px"/>' : ""}
        <h2 style="margin:0 0 4px">${BIZ} — Payment Receipt</h2>
        <p style="color:#5f6982;margin:0 0 16px">Invoice ${o.invoice_no || o.id}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#5f6982">Item</td><td style="text-align:right"><b>${item}</b></td></tr>
          <tr><td style="padding:6px 0;color:#5f6982">Taxable value</td><td style="text-align:right">₹${taxable}</td></tr>
          <tr><td style="padding:6px 0;color:#5f6982">${taxLabel}</td><td style="text-align:right">₹${gst}</td></tr>
          ${o.buyer_gstin ? '<tr><td style="padding:6px 0;color:#5f6982">Your GSTIN</td><td style="text-align:right">' + o.buyer_gstin + '</td></tr>' : ""}
          ${o.buyer_state ? '<tr><td style="padding:6px 0;color:#5f6982">Place of supply</td><td style="text-align:right">' + o.buyer_state + '</td></tr>' : ""}
          <tr><td style="padding:6px 0;color:#5f6982"><b>Total paid</b></td><td style="text-align:right"><b>₹${gross}</b></td></tr>
          <tr><td style="padding:6px 0;color:#5f6982">Order ID</td><td style="text-align:right">${o.id}</td></tr>
          <tr><td style="padding:6px 0;color:#5f6982">Date</td><td style="text-align:right">${when}</td></tr>
        </table>
        <p style="color:#5f6982;font-size:12px;margin-top:20px">Prices are inclusive of GST @ ${RATE}%. Thank you for using ${BIZ} · Developed by Jupiter Technologies.</p>
      </div>`;
    await sendEmail({ to, subject: "Your India QRCode receipt — " + (o.invoice_no || o.id), html });
  } catch (_) {}
}
