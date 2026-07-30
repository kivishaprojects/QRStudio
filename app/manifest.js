export default function manifest() {
  return {
    name: "India QRCode — Dynamic QR Codes",
    short_name: "India QRCode",
    description: "Create, brand and track dynamic QR codes.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f5f7fc",
    theme_color: "#5566f2",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Create a QR code", url: "/dashboard?tab=create" },
      { name: "Scan a QR code", url: "/scan" },
    ],
  };
}
