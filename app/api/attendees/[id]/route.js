import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { attendeeFromRow, attendeeToRow } from "../../../../lib/map";

export async function PATCH(req, { params }) {
  const body = await req.json();
  const db = supabaseAdmin();
  const row = attendeeToRow(body);

  const { data, error } = await db.from("attendees").update(row).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attendee: attendeeFromRow(data) });
}

export async function DELETE(req, { params }) {
  const db = supabaseAdmin();
  const { error } = await db.from("attendees").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
