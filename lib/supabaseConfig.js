// Public Supabase connection values. The anon key is designed to be exposed in
// the browser; all privileged mutations run inside SECURITY DEFINER SQL functions.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jzsiqbvrdheaewxxwlmk.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6c2lxYnZyZGhlYWV3eHh3bG1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MDI0MTQsImV4cCI6MjEwMDI3ODQxNH0.4r9nwRkS2oLCoEHDwEt2sAe0aZ8jJhUJ66M1xWbk0p4";

// Public base URL used to build dynamic-QR redirect links (/r/<id>). Printed
// dynamic codes point here, so it must be your live domain. Override via env.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://qr-studio-portal-kivishaprojects-1681s-projects.vercel.app";

// Cashfree checkout mode for the browser SDK ("sandbox" or "production"). Public, non-secret.
export const CASHFREE_MODE = process.env.NEXT_PUBLIC_CASHFREE_MODE || "sandbox";
