// Public Supabase connection values. The anon key is designed to be exposed in
// the browser; all privileged mutations run inside SECURITY DEFINER SQL functions.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jzsiqbvrdheaewxxwlmk.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6c2lxYnZyZGhlYWV3eHh3bG1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MDI0MTQsImV4cCI6MjEwMDI3ODQxNH0.4r9nwRkS2oLCoEHDwEt2sAe0aZ8jJhUJ66M1xWbk0p4";
