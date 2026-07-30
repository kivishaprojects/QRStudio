"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "../../../lib/supabaseBrowser";

// Landing page for the password-recovery link. The recovery code is exchanged
// for a session by /auth/callback (redirectTo points here with next=/auth/reset),
// so by the time we render, the user has a temporary session and can set a new
// password. Also used for the admin "forgot password" flow.
export default function ResetPassword() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setOk(!!user);
      setReady(true);
    })();
  }, [supabase]);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    if (pw.length < 6) { setMsg("Password must be at least 6 characters."); return; }
    if (pw !== pw2) { setMsg("Passwords do not match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setMsg("✅ Password updated. Redirecting…");
    setTimeout(() => { router.push("/dashboard"); router.refresh(); }, 1200);
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="card" style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, fontWeight: 800, fontSize: 19, marginBottom: 6 }}>
          <span className="logo">▦</span> QR Studio
        </div>
        <h2 style={{ fontSize: 22, margin: "12px 0 4px" }}>Set a new password</h2>
        {!ready ? (
          <p style={{ color: "var(--soft)", fontSize: 13.5 }}>Verifying your link…</p>
        ) : !ok ? (
          <>
            <p style={{ color: "var(--soft)", fontSize: 13.5, marginBottom: 16 }}>This reset link is invalid or has expired. Please request a new one from the login page.</p>
            <Link href="/login" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>← Back to login</Link>
          </>
        ) : (
          <form onSubmit={submit}>
            <p style={{ color: "var(--soft)", fontSize: 13.5, marginBottom: 16 }}>Choose a new password for your account.</p>
            <div className="field">
              <label>New password</label>
              <input type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input type="password" required minLength={6} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••" />
            </div>
            {msg && <div style={{ background: "var(--card2)", border: "1px solid var(--line)", borderRadius: 10, padding: 11, fontSize: 13, color: "var(--gold)", marginBottom: 12 }}>{msg}</div>}
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={busy}>{busy ? "Saving…" : "Update password →"}</button>
          </form>
        )}
      </div>
    </main>
  );
}
