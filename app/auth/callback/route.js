import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");

  const supabase = supabaseServer();
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  if (next && next.startsWith("/")) {
    return NextResponse.redirect(new URL(next, url.origin));
  }

  const { data: { user } } = await supabase.auth.getUser();
  let dest = "/my-registration";
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role === "admin") dest = "/dashboard";
  }

  return NextResponse.redirect(new URL(dest, url.origin));
}
