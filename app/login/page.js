"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "../../lib/supabaseBrowser";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState(params.get("mode") === "signup" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = supabaseBrowser();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        if (data.session) {
          await supabase.rpc("qr_ensure_profile", { p_name: name || null });
          router.push("/dashboard");
          router.refresh();
        } else {
          setMsg("Check your email to confirm your account, then log in.");
          setMode("login");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await supabase.rpc("qr_ensure_profile", { p_name: null });
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setMsg(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function forgot() {
    setMsg("");
    if (!email) { setMsg("Enter your email above first, then click ‘Forgot password?’."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
    });
    if (error) setMsg(error.message);
    else setMsg("✅ If an account exists for " + email + ", a password-reset link is on its way.");
  }

  async function google() {
    setMsg("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setMsg(error.message);
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="card" style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, fontWeight: 800, fontSize: 19, marginBottom: 6 }}>
          <span className="logo">▦</span> QR Studio
        </div>
        <h2 style={{ fontSize: 22, margin: "12px 0 4px" }}>{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
        <p style={{ color: "var(--soft)", fontSize: 13.5, marginBottom: 20 }}>
          {mode === "signup" ? "Get 1 free QR credit — no card needed." : "Log in to your QR dashboard."}
        </p>
        <button type="button" onClick={google} className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", gap: 10, marginBottom: 14 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.42 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
          Continue with Google
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0 16px", color: "var(--soft)", fontSize: 12 }}>
          <div style={{ flex: 1, height: 1, background: "var(--line)" }} /> or <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
        </div>
        <form onSubmit={submit}>
          {mode === "signup" && (
            <div className="field">
              <label>Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vishal H Raval" />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </div>
          <div className="field">
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Password</span>
              {mode === "login" && <a onClick={forgot} style={{ color: "var(--brand)", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>Forgot password?</a>}
            </label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {msg && <div style={{ background: "var(--card2)", border: "1px solid var(--line)", borderRadius: 10, padding: 11, fontSize: 13, color: "var(--gold)", marginBottom: 12 }}>{msg}</div>}
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
            {loading ? "Please wait…" : mode === "signup" ? "Create account →" : "Log in →"}
          </button>
        </form>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13.5, color: "var(--soft)" }}>
          {mode === "signup" ? (
            <>Already have an account? <a style={{ color: "var(--brand)", cursor: "pointer" }} onClick={() => setMode("login")}>Log in</a></>
          ) : (
            <>New here? <a style={{ color: "var(--brand)", cursor: "pointer" }} onClick={() => setMode("signup")}>Create an account</a></>
          )}
        </div>
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <Link href="/" style={{ fontSize: 12.5, color: "var(--soft)" }}>← Back to home</Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}
