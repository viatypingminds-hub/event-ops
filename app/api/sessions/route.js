import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { attendeeFromRow, attendeeToRow, sessionFromRow } from "../../../lib/map";

export async function POST(req) {
  const body = await req.json();
  const db = supabaseAdmin();
  const id = "s" + Date.now();

  const { data: session, error: sErr } = await db
    .from("sessions")
    .insert({ id, date: body.date, time: body.time, room: body.room, capacity: body.capacity })
    .select()
    .single();
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  let attendees = [];
  if (Array.isArray(body.attendees) && body.attendees.length) {
    const rows = body.attendees.map((a, i) =>
      Object.assign({ id: "i" + Date.now() + "-" + i, session_id: id }, attendeeToRow(a))
    );
    const { data, error: aErr } = await db.from("attendees").insert(rows).select();
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
    attendees = data.map(attendeeFromRow);
  }

  return NextResponse.json({ session: sessionFromRow(session), attendees });
}
