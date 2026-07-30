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
            <label>Password</label>
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
