"use client";
import { useState } from "react";

export default function ContactForm() {
  const [f, setF] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setMsg(null); setBusy(true);
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const j = await res.json();
      if (!res.ok) { setMsg({ ok: false, text: j.error || "Could not send. Please try again." }); }
      else { setMsg({ ok: true, text: "✅ Thanks! Your enquiry has been sent — we'll get back to you soon." }); setF({ name: "", email: "", phone: "", subject: "", message: "" }); }
    } catch (_) { setMsg({ ok: false, text: "Network error. Please try again." }); }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card" style={{ margin: "8px 0 6px" }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Send us an enquiry</h2>
      <p style={{ fontSize: 13.5, color: "var(--soft)", marginBottom: 16 }}>Fill in the form and our team will reply by email.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field"><label>Name *</label><input value={f.name} onChange={set("name")} placeholder="Your name" required /></div>
        <div className="field"><label>Email *</label><input type="email" value={f.email} onChange={set("email")} placeholder="you@email.com" required /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field"><label>Phone</label><input value={f.phone} onChange={set("phone")} placeholder="10-digit mobile" inputMode="numeric" maxLength={15} /></div>
        <div className="field"><label>Subject</label><input value={f.subject} onChange={set("subject")} placeholder="How can we help?" /></div>
      </div>
      <div className="field"><label>Message *</label><textarea value={f.message} onChange={set("message")} placeholder="Tell us a bit about your enquiry…" rows={5} required /></div>
      {msg && <div style={{ fontSize: 13, marginBottom: 12, color: msg.ok ? "var(--accent)" : "#c0392b" }}>{msg.text}</div>}
      <button className="btn btn-cta" disabled={busy}>{busy ? "Sending…" : "Send enquiry →"}</button>
    </form>
  );
}
