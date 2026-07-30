// GST helpers shared by the checkout flow, payment API, and invoice/receipt rendering.
// Place-of-supply rule: intra-state (buyer state == seller state) -> CGST + SGST;
// inter-state -> IGST. Seller state is derived from the business GSTIN in settings
// (defaults to Gujarat / code 24 if not set).

export const GST_STATE_CODES = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "25": "Daman & Diu", "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala",
  "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar Islands", "36": "Telangana",
  "37": "Andhra Pradesh", "38": "Ladakh", "97": "Other Territory", "99": "Centre Jurisdiction",
};

export const DEFAULT_SELLER_STATE_CODE = "24"; // Gujarat

// Standard GSTIN: 2-digit state code + 10-char PAN + entity digit + 'Z' + checksum.
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function normalizeGstin(g) {
  return String(g || "").toUpperCase().replace(/\s/g, "");
}
export function isValidGstin(g) {
  return GSTIN_RE.test(normalizeGstin(g));
}
export function stateCodeFromGstin(g) {
  const n = normalizeGstin(g);
  return n.slice(0, 2);
}
export function stateFromGstin(g) {
  return GST_STATE_CODES[stateCodeFromGstin(g)] || "";
}
export function isValidPincode(p) {
  return /^[1-9][0-9]{5}$/.test(String(p || "").trim());
}

// Decide CGST/SGST vs IGST from a buyer GSTIN and the seller's own GSTIN.
export function taxTypeFor(buyerGstin, sellerGstin) {
  const seller = (sellerGstin && stateCodeFromGstin(sellerGstin)) || DEFAULT_SELLER_STATE_CODE;
  const buyer = stateCodeFromGstin(buyerGstin);
  if (!buyer) return "cgst_sgst"; // no buyer GSTIN -> treat as intra-state B2C
  return buyer === seller ? "cgst_sgst" : "igst";
}

// Back-calculate the tax split for an order (prices are GST-inclusive).
export function taxBreakup(amount, rate, taxType) {
  const gross = Number(amount) || 0;
  const r = Number(rate) || 0;
  const taxable = +(gross / (1 + r / 100)).toFixed(2);
  const tax = +(gross - taxable).toFixed(2);
  const igst = taxType === "igst";
  return {
    gross, taxable, tax, igst, rate: r,
    igstAmt: igst ? tax : 0,
    cgst: igst ? 0 : +(tax / 2).toFixed(2),
    sgst: igst ? 0 : +(tax / 2).toFixed(2),
  };
}
