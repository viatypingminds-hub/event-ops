import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";
import { attendeeFromRow, attendeeToRow } from "../../../lib/map";

export async function POST(req) {
  const body = await req.json();
  const db = supabaseServer();

  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const id = "a" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  const row = Object.assign({ id }, attendeeToRow(body), { created_by: user.id });

  const { data, error } = await db.from("attendees").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attendee: attendeeFromRow(data) });
}
