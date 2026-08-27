export function attendeeFromRow(r) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone || "",
    category: r.category || "Referral",
    sessionId: r.session_id,
    status: r.status,
    guestOf: r.guest_of || "",
    registeredAt: r.registered_at,
    notes: r.notes || "",
    giftClaimed: !!r.gift_claimed,
    giftAt: r.gift_at || "",
    bonusClaimed: !!r.bonus_claimed,
    bonusAt: r.bonus_at || "",
    walkIn: !!r.walk_in,
    source: r.source || ""
  };
}

export function attendeeToRow(a) {
  const row = {};
  if (a.name !== undefined) row.name = a.name;
  if (a.email !== undefined) row.email = a.email;
  if (a.phone !== undefined) row.phone = a.phone;
  if (a.category !== undefined) row.category = a.category;
  if (a.sessionId !== undefined) row.session_id = a.sessionId;
  if (a.status !== undefined) row.status = a.status;
  if (a.guestOf !== undefined) row.guest_of = a.guestOf || null;
  if (a.registeredAt !== undefined) row.registered_at = a.registeredAt;
  if (a.notes !== undefined) row.notes = a.notes;
  if (a.giftClaimed !== undefined) row.gift_claimed = a.giftClaimed;
  if (a.giftAt !== undefined) row.gift_at = a.giftAt;
  if (a.giftSig !== undefined) row.gift_sig = a.giftSig;
  if (a.bonusClaimed !== undefined) row.bonus_claimed = a.bonusClaimed;
  if (a.bonusAt !== undefined) row.bonus_at = a.bonusAt;
  if (a.bonusSig !== undefined) row.bonus_sig = a.bonusSig;
  if (a.walkIn !== undefined) row.walk_in = a.walkIn;
  if (a.source !== undefined) row.source = a.source;
  return row;
}

export function sessionFromRow(r) {
  return { id: r.id, date: r.date, time: r.time, room: r.room, capacity: r.capacity };
}
