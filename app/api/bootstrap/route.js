import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { supabaseServer } from "../../../lib/supabaseServer";
import { attendeeFromRow, sessionFromRow } from "../../../lib/map";

export async function GET() {
  const admin = supabaseAdmin();
  const scoped = supabaseServer();

  const [{ data: sessions, error: sErr }, { data: attendees, error: aErr }, { data: counts, error: cErr }] = await Promise.all([
    scoped.from("sessions").select("*").order("date", { ascending: true }),
    scoped.from("attendees").select("*"),
    admin.from("attendees").select("session_id").neq("status", "cancelled")
  ]);

  if (sErr || aErr || cErr) {
    return NextResponse.json({ error: (sErr || aErr || cErr).message }, { status: 500 });
  }

  const taken = {};
  counts.forEach((row) => { taken[row.session_id] = (taken[row.session_id] || 0) + 1; });

  return NextResponse.json({
    sessions: sessions.map((s) => Object.assign(sessionFromRow(s), { taken: taken[s.id] || 0 })),
    attendees: attendees.map(attendeeFromRow)
  });
}
