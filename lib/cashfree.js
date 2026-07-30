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
        customer_email: customer.email || "customer@qrstudio.app",
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

export { MODE as CASHFREE_MODE };
