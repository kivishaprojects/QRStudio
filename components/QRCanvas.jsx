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
