import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "India QRCode — Dynamic QR Codes for Everything";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px", background: "linear-gradient(135deg,#152a63,#0f1e47)", color: "#fff", fontFamily: "sans-serif", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 14, display: "flex" }}>
          <div style={{ flex: 1, background: "#f47a1f" }} /><div style={{ flex: 1, background: "#fff" }} /><div style={{ flex: 1, background: "#2ea24d" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 46, fontWeight: 800 }}>
          <div style={{ width: 76, height: 76, borderRadius: 18, background: "rgba(255,255,255,.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46 }}>▦</div>
          <span>India <span style={{ color: "#f47a1f" }}>QR</span> Code</span>
        </div>
        <div style={{ fontSize: 62, fontWeight: 800, marginTop: 36, lineHeight: 1.1, letterSpacing: "-2px" }}>Smart QR solutions for every business</div>
        <div style={{ fontSize: 30, marginTop: 24, opacity: 0.9 }}>Create · Connect · Grow · Made in India 🇮🇳</div>
      </div>
    ),
    { ...size }
  );
}
