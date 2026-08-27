import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || "").toLowerCase();

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const email = (user?.email || "").toLowerCase();
  const authorized = !!user && (!ALLOWED_DOMAIN || email.endsWith("@" + ALLOWED_DOMAIN));

  if (!authorized) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
