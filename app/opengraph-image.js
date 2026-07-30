import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "India QRCode — Dynamic QR Codes for Everything";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px", background: "linear-gradient(135deg,#5566f2,#7c3aed)", color: "#fff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 40, fontWeight: 800 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: "rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>▦</div>
          India QRCode
        </div>
        <div style={{ fontSize: 66, fontWeight: 800, marginTop: 40, lineHeight: 1.1, letterSpacing: "-2px" }}>Dynamic QR codes for everything</div>
        <div style={{ fontSize: 30, marginTop: 26, opacity: 0.92 }}>Create · Brand · Track · 11 content types · Made in India</div>
      </div>
    ),
    { ...size }
  );
}
