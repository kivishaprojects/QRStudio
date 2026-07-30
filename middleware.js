import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./lib/supabaseConfig";

export async function middleware(request) {
  const { pathname, searchParams } = request.nextUrl;

  // If an auth code (email confirmation / OAuth) lands anywhere other than the
  // callback route, forward it to /auth/callback so the session gets created.
  const code = searchParams.get("code");
  if (code && pathname !== "/auth/callback") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    url.searchParams.set(
      "next",
      pathname.startsWith("/dashboard") || pathname.startsWith("/admin") ? pathname : "/dashboard"
    );
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        list.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if ((pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return response;
}

export const config = {
  // Run on all routes except static assets, so the code-forwarding above works on "/".
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
