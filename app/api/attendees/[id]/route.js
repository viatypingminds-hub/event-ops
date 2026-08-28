import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { attendeeFromRow, attendeeToRow } from "../../../../lib/map";

export async function PATCH(req, { params }) {
  const body = await req.json();
  const db = supabaseServer();
  const row = attendeeToRow(body);

  const { data, error } = await db.from("attendees").update(row).eq("id", params.id).select().single();
  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json({ error: status === 404 ? "Not found" : error.message }, { status });
  }
  return NextResponse.json({ attendee: attendeeFromRow(data) });
}

export async function DELETE(req, { params }) {
  const db = supabaseServer();
  const { error, count } = await db.from("attendees").delete({ count: "exact" }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
