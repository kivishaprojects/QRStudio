"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function Scan() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const [status, setStatus] = useState("idle"); // idle | scanning | unsupported | denied | result
  const [result, setResult] = useState("");

  useEffect(() => () => stop(), []);

  function stop() {
    cancelAnimationFrame(rafRef.current);
    const s = streamRef.current;
    if (s) s.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function start() {
    setResult("");
    if (typeof window === "undefined" || !("BarcodeDetector" in window)) { setStatus("unsupported"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      const v = videoRef.current;
      v.srcObject = stream; await v.play();
      setStatus("scanning");
      // eslint-disable-next-line no-undef
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const tick = async () => {
        if (!streamRef.current) return;
        try {
          const codes = await detector.detect(v);
          if (codes && codes.length) { setResult(codes[0].rawValue || ""); setStatus("result"); stop(); return; }
        } catch (_) {}
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setStatus(/denied|permission/i.test(e.message || "") ? "denied" : "unsupported");
    }
  }

  const isUrl = /^https?:\/\//i.test(result);
  const wrap = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "#f5f7fc" };

  return (
    <main style={wrap}>
      <div className="card" style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <Link href="/" style={{ display: "block", marginBottom: 14 }}>
          <img src="/logo.png" alt="India QR Code" style={{ height: 72 }} />
        </Link>
        <h2 style={{ fontSize: 20, marginBottom: 6 }}>Scan a QR code</h2>
        <p style={{ color: "var(--soft)", fontSize: 13.5, marginBottom: 16 }}>Point your camera at any QR code.</p>

        <div style={{ background: "#0b1020", borderRadius: 14, overflow: "hidden", aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: status === "scanning" ? "block" : "none" }} />
          {status !== "scanning" && <div style={{ color: "#8792b5", fontSize: 13, padding: 20 }}>{status === "result" ? "✓ Scanned" : "Camera preview"}</div>}
          {status === "scanning" && <div style={{ position: "absolute", inset: "18%", border: "3px solid rgba(255,255,255,.75)", borderRadius: 14 }} />}
        </div>

        {status === "result" && (
          <div style={{ marginTop: 16, textAlign: "left", background: "var(--card2)", border: "1px solid var(--line)", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12, color: "var(--soft)", marginBottom: 5 }}>Result</div>
            <div style={{ fontSize: 14, wordBreak: "break-all", marginBottom: 12 }}>{result}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {isUrl && <a className="btn btn-primary btn-sm" href={result} target="_blank" rel="noreferrer">Open link ↗</a>}
              <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(result); }}>Copy</button>
              <button className="btn btn-ghost btn-sm" onClick={start}>Scan another</button>
            </div>
          </div>
        )}

        {status === "idle" && <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 16 }} onClick={start}>Start camera</button>}
        {status === "scanning" && <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", marginTop: 16 }} onClick={() => { stop(); setStatus("idle"); }}>Stop</button>}
        {status === "denied" && <p style={{ color: "var(--gold)", fontSize: 13, marginTop: 16 }}>Camera permission was blocked. Enable it in your browser settings and try again.</p>}
        {status === "unsupported" && <p style={{ color: "var(--gold)", fontSize: 13, marginTop: 16 }}>Your browser doesn’t support in-browser scanning. Please use your phone’s native camera app to scan, or try Chrome on Android.</p>}

        <Link href="/dashboard" style={{ display: "block", marginTop: 16, fontSize: 13, color: "var(--soft)" }}>← Back to dashboard</Link>
      </div>
    </main>
  );
}
