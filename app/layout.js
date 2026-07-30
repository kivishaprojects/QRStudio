import "./globals.css";
import PWARegister from "../components/PWARegister";

const DESC = "Create, brand, and track dynamic QR codes for URLs, WiFi, UPI, contacts and more. 1 free code, then affordable annual plans in INR. Made in India.";

export const metadata = {
  metadataBase: new URL("https://www.indiaqrcode.com"),
  title: { default: "India QRCode — Dynamic QR Codes for Everything", template: "%s — India QRCode" },
  description: DESC,
  keywords: ["QR code generator", "dynamic QR code", "QR code India", "UPI QR", "WiFi QR", "QR analytics", "custom QR code", "India QRCode"],
  applicationName: "India QRCode",
  authors: [{ name: "Jupiter Technologies" }],
  alternates: { canonical: "/" },
  openGraph: {
    title: "India QRCode — Dynamic QR Codes for Everything",
    description: DESC,
    url: "https://www.indiaqrcode.com",
    siteName: "India QRCode",
    locale: "en_IN",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "India QRCode — Dynamic QR Codes for Everything", description: DESC },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "India QRCode", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/apple-icon.png" },
};

export const viewport = { themeColor: "#5566f2", width: "device-width", initialScale: 1 };

const JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "India QRCode",
  url: "https://www.indiaqrcode.com",
  legalName: "Jupiter Technologies",
  description: "Dynamic QR code generation, branding and scan analytics.",
  areaServed: "IN",
  contactPoint: { "@type": "ContactPoint", email: "kivishaprojects@gmail.com", contactType: "customer support" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }} />
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
