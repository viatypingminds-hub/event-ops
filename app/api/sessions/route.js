import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";
import { attendeeFromRow, attendeeToRow, sessionFromRow } from "../../../lib/map";

export async function POST(req) {
  const body = await req.json();
  const db = supabaseServer();

  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const id = "s" + Date.now();

  const { data: session, error: sErr } = await db
    .from("sessions")
    .insert({ id, date: body.date, time: body.time, room: body.room, capacity: body.capacity })
    .select()
    .single();
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: sErr.code === "42501" ? 403 : 500 });

  let attendees = [];
  if (Array.isArray(body.attendees) && body.attendees.length) {
    const rows = body.attendees.map((a, i) =>
      Object.assign({ id: "i" + Date.now() + "-" + i, session_id: id }, attendeeToRow(a), { created_by: user.id })
    );
    const { data, error: aErr } = await db.from("attendees").insert(rows).select();
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
    attendees = data.map(attendeeFromRow);
  }

  return NextResponse.json({ session: sessionFromRow(session), attendees });
}
