import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { attendeeFromRow, attendeeToRow } from "../../../lib/map";

export async function POST(req) {
  const body = await req.json();
  const db = supabaseAdmin();
  const id = "a" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  const row = Object.assign({ id }, attendeeToRow(body));

  const { data, error } = await db.from("attendees").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attendee: attendeeFromRow(data) });
}
