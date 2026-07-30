"use client";
import { useEffect, useRef } from "react";
import qrcode from "qrcode-generator";

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export function drawQR(canvas, { data, fg = "#181b3a", bg = "#ffffff", dot = "square", ecl = "M", size = 460 }) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let qr;
  try {
    qr = qrcode(0, ecl);
    qr.addData(data || " ");
    qr.make();
  } catch (e) {
    return;
  }
  const n = qr.getModuleCount();
  const m = 4;
  const tot = n + m * 2;
  const cell = Math.max(1, Math.floor(size / tot));
  const d = cell * tot;
  canvas.width = d;
  canvas.height = d;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, d, d);
  ctx.fillStyle = fg;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (!qr.isDark(r, c)) continue;
      const x = (c + m) * cell;
      const y = (r + m) * cell;
      if (dot === "dots") {
        ctx.beginPath();
        ctx.arc(x + cell / 2, y + cell / 2, cell * 0.46, 0, 7);
        ctx.fill();
      } else if (dot === "rounded") {
        rr(ctx, x, y, cell, cell, cell * 0.32);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, cell, cell);
      }
    }
}

// Build a branded image: optional logo + title on top, QR in the middle,
// optional short text at the bottom. Returns a canvas.
export function composeBranded({ qrData, fg = "#181b3a", bg = "#ffffff", dot = "square", topText = "", bottomText = "", logoImg = null }) {
  const S = 760;       // QR render size
  const margin = 64;
  const gap = 18;
  const topFont = 44;
  const botFont = 30;
  const logoMaxH = 100;

  let logoH = 0, logoW = 0;
  if (logoImg && logoImg.width) {
    logoH = Math.min(logoMaxH, logoImg.height);
    logoW = logoImg.width * (logoH / logoImg.height);
  }
  const hasTopText = !!(topText && topText.trim());
  const hasBottom = !!(bottomText && bottomText.trim());

  const meas = document.createElement("canvas").getContext("2d");
  function fitFont(text, base, maxW, weight) {
    let s = base;
    const set = () => (meas.font = weight + " " + s + "px 'Plus Jakarta Sans', Arial, sans-serif");
    set();
    while (meas.measureText(text).width > maxW && s > 14) { s -= 2; set(); }
    return s;
  }

  const W = S + margin * 2;
  let topBlockH = 0;
  if (logoH) topBlockH += logoH + (hasTopText ? 10 : 0);
  if (hasTopText) topBlockH += Math.round(topFont * 1.15);
  if (topBlockH) topBlockH += gap;
  const bottomBlockH = hasBottom ? gap + Math.round(botFont * 1.4) : 0;
  const H = margin + topBlockH + S + bottomBlockH + margin;

  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#e2e7f1"; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, H - 2);

  let y = margin;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  if (logoH) {
    ctx.drawImage(logoImg, (W - logoW) / 2, y, logoW, logoH);
    y += logoH + (hasTopText ? 10 : 0);
  }
  if (hasTopText) {
    const fs = fitFont(topText, topFont, S, "700");
    ctx.font = "700 " + fs + "px 'Plus Jakarta Sans', Arial, sans-serif";
    ctx.fillStyle = "#1b2138";
    ctx.fillText(topText, W / 2, y);
    y += Math.round(topFont * 1.15);
  }
  if (topBlockH) y += gap;

  const qc = document.createElement("canvas");
  drawQR(qc, { data: qrData, fg, bg, dot, ecl: "M", size: S });
  ctx.drawImage(qc, (W - qc.width) / 2, y, qc.width, qc.width);
  y += S;

  if (hasBottom) {
    y += gap;
    const fs = fitFont(bottomText, botFont, S, "500");
    ctx.font = "500 " + fs + "px Inter, Arial, sans-serif";
    ctx.fillStyle = "#5f6982";
    ctx.fillText(bottomText, W / 2, y);
  }
  return c;
}

export default function QRCanvas({ value, fg, bg, dot, ecl, display = 230 }) {
  const ref = useRef(null);
  useEffect(() => {
    drawQR(ref.current, { data: value, fg, bg, dot, ecl });
  }, [value, fg, bg, dot, ecl]);
  return (
    <canvas
      ref={ref}
      style={{ width: display, height: display, maxWidth: "100%", borderRadius: 6, display: "block" }}
    />
  );
}
