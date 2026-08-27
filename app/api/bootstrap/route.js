import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { attendeeFromRow, sessionFromRow } from "../../../lib/map";

export async function GET() {
  const db = supabaseAdmin();

  const [{ data: sessions, error: sErr }, { data: attendees, error: aErr }] = await Promise.all([
    db.from("sessions").select("*").order("date", { ascending: true }),
    db.from("attendees").select("*")
  ]);

  if (sErr || aErr) {
    return NextResponse.json({ error: (sErr || aErr).message }, { status: 500 });
  }

  return NextResponse.json({
    sessions: sessions.map(sessionFromRow),
    attendees: attendees.map(attendeeFromRow)
  });
}
