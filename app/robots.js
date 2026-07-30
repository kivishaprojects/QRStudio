export default function robots() {
  const base = "https://www.indiaqrcode.com";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/api/", "/r/", "/auth/"] },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
