// Cashfree Payment Gateway (server-side) helper. Secrets come from env vars.
const MODE = process.env.CASHFREE_ENV || "sandbox";
const BASE = MODE === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";

export function cashfreeConfigured() {
  return !!(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY);
}

function headers() {
  return {
    "Content-Type": "application/json",
    "x-api-version": "2023-08-01",
    "x-client-id": process.env.CASHFREE_APP_ID,
    "x-client-secret": process.env.CASHFREE_SECRET_KEY,
  };
}

export async function createOrder({ orderId, amount, customer, returnUrl, notifyUrl }) {
  const res = await fetch(`${BASE}/orders`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      order_id: orderId,
      order_amount: Number(amount),
      order_currency: "INR",
      customer_details: {
        customer_id: customer.id,
        customer_email: customer.email || "customer@indiaqrcode.com",
        customer_phone: customer.phone || "9999999999",
      },
      order_meta: { return_url: returnUrl, notify_url: notifyUrl },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Cashfree order creation failed");
  return data; // { payment_session_id, order_id, ... }
}

export async function getOrder(orderId) {
  const res = await fetch(`${BASE}/orders/${orderId}`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Cashfree order lookup failed");
  return data; // { order_status: 'PAID' | 'ACTIVE' | ... }
}

// ---- Cashfree Verification Suite: GSTIN verification ----
// Uses separate credentials from the payment gateway (enable "Verification Suite"
// in the Cashfree dashboard). Falls back to the PG env vars if the dedicated
// verification keys aren't set (some accounts share credentials).
const VERIFY_MODE = process.env.CASHFREE_VERIFY_ENV || MODE;
const VERIFY_BASE = VERIFY_MODE === "production" ? "https://api.cashfree.com" : "https://sandbox.cashfree.com";
const VERIFY_ID = process.env.CASHFREE_VERIFY_CLIENT_ID || process.env.CASHFREE_APP_ID;
const VERIFY_SECRET = process.env.CASHFREE_VERIFY_CLIENT_SECRET || process.env.CASHFREE_SECRET_KEY;

export function gstVerifyConfigured() {
  return !!(VERIFY_ID && VERIFY_SECRET);
}

// Returns { valid, legalName, tradeName, state, city, pincode, address, status } or throws.
export async function verifyGstin(gstin) {
  const res = await fetch(`${VERIFY_BASE}/verification/gstin`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-client-id": VERIFY_ID, "x-client-secret": VERIFY_SECRET },
    body: JSON.stringify({ GSTIN: gstin }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.message || "GSTIN verification failed");
  const sp = d.principal_place_split_address || {};
  return {
    valid: d.valid !== false,
    legalName: d.legal_name_of_business || "",
    tradeName: d.trade_name_of_business || "",
    state: sp.state || "",
    city: sp.city || sp.district || sp.location || "",
    pincode: sp.pincode || "",
    address: d.principal_place_address || "",
    status: d.gst_in_status || "",
  };
}

export { MODE as CASHFREE_MODE };
