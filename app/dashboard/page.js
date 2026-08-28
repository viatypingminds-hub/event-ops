"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "../../lib/supabaseBrowser";

const EVENT_NAME = "Masterclass";
const DEFAULT_CAPACITY = 40;
const SHOW_SEATS = true;
const TRACK_GIFTS = true;
const PAD = "14px";

function css(str) {
  const obj = {};
  (str || "").split(";").forEach((rule) => {
    const idx = rule.indexOf(":");
    if (idx === -1) return;
    const prop = rule.slice(0, idx).trim();
    const val = rule.slice(idx + 1).trim();
    if (!prop || !val) return;
    const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    obj[camel] = val;
  });
  return obj;
}

function fmt(date, opts) {
  return new Date(date + "T12:00:00").toLocaleDateString("en-US", opts);
}

function blankForm(sessionId) {
  return { name: "", email: "", phone: "", category: "Referral", sessionId: sessionId, status: "registered", guestOf: "", notes: "", walkIn: false, source: "Staff entry" };
}

const STATUS_STYLE = {
  "registered": { bg: "#eef1f4", fg: "#4a525b", label: "Registered" },
  "checked-in": { bg: "#e7f3ea", fg: "#2f6b40", label: "Checked in" },
  "cancelled": { bg: "#f6eceb", fg: "#9b3025", label: "Cancelled" }
};

export default function EventOps() {
  const [attendees, setAttendees] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState("");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(blankForm(""));

  const [toast, setToast] = useState("");
  const [confirming, setConfirming] = useState("");
  const [claimTarget, setClaimTarget] = useState(null);
  const [sigInk, setSigInk] = useState(false);
  const [sigError, setSigError] = useState("");

  const [dateForm, setDateForm] = useState(null);
  const [dateError, setDateError] = useState("");

  const [lastUpdated, setLastUpdated] = useState(null);
  const [userEmail, setUserEmail] = useState("");

  const sigRef = useRef(null);
  const toastTimer = useRef(null);
  const confirmTimer = useRef(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    fetch("/api/bootstrap")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setLoadError(data.error); return; }
        setSessions(data.sessions);
        setAttendees(data.attendees);
        setLastUpdated(new Date());
      })
      .catch((e) => setLoadError(String(e)))
      .finally(() => setLoading(false));
    supabaseBrowser().auth.getUser().then(({ data }) => setUserEmail(data?.user?.email || ""));
    return () => { clearTimeout(toastTimer.current); clearTimeout(confirmTimer.current); };
  }, []);

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    window.location.href = "/login";
  }

  function flash(msg) {
    clearTimeout(toastTimer.current);
    setToast(msg);
    setLastUpdated(new Date());
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  function capFor(sessionId) {
    const s = sessions.find((x) => x.id === sessionId);
    return s && Number(s.capacity) > 0 ? Number(s.capacity) : DEFAULT_CAPACITY;
  }

  function seatsFor(sessionId) {
    return attendees.filter((a) => a.sessionId === sessionId && a.status !== "cancelled").length;
  }

  function prepFor(sessionId) {
    const list = attendees.filter((a) => a.sessionId === sessionId && a.status !== "cancelled");
    const bonuses = list.filter((a) => attendees.some((x) => x.guestOf === a.id && x.status !== "cancelled")).length;
    return { packs: list.length, packsClaimed: list.filter((a) => a.giftClaimed).length, bonuses, bonusesClaimed: list.filter((a) => a.bonusClaimed).length };
  }

  function filteredRows() {
    const q = query.trim().toLowerCase();
    return attendees.filter((a) => {
      if (sessionFilter !== "all" && a.sessionId !== sessionFilter) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (categoryFilter === "hosts") { if (!attendees.some((x) => x.guestOf === a.id)) return false; }
      else if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
      if (!q) return true;
      return (a.name + " " + a.email + " " + a.category).toLowerCase().indexOf(q) > -1;
    }).sort((a, b) => a.sessionId.localeCompare(b.sessionId) || a.name.localeCompare(b.name));
  }

  async function patchAttendee(id, patch) {
    const res = await fetch("/api/attendees/" + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.attendee;
  }

  async function toggleCheckIn(a) {
    const next = a.status === "checked-in" ? "registered" : "checked-in";
    const updated = await patchAttendee(a.id, { status: next });
    setAttendees((list) => list.map((x) => (x.id === a.id ? updated : x)));
    flash(next === "checked-in" ? a.name + " checked in" : a.name + " check-in undone");
  }

  async function reinstate(a) {
    const updated = await patchAttendee(a.id, { status: "registered" });
    setAttendees((list) => list.map((x) => (x.id === a.id ? updated : x)));
    flash(a.name + " reinstated");
  }

  function chip(a, key, atKey, label, accent, tint) {
    const short = label === "Gift pack" ? "Gift pack" : "Referral bonus";
    if (a[key] && confirming === a.id + ":" + key)
      return { mark: "↺", label: "Release " + short.toLowerCase() + "?", bg: "#fdf5e6", fg: "#8a5a12", border: "#e6c98a", cursor: "pointer", title: "Tap again to release" };
    if (a[key])
      return { mark: "✓", label: short + (a[atKey] ? " · " + a[atKey] : ""), bg: tint, fg: accent, border: tint, cursor: "pointer", title: "Signed for" + (a[atKey] ? " at " + a[atKey] : "") + " — tap to release" };
    if (a.status !== "checked-in")
      return { mark: "", label: short, bg: "#fbfcfc", fg: "#b0b6bd", border: "#e8ebee", cursor: "not-allowed", title: "Check in required before claiming" };
    return { mark: "+", label: "Claim " + short.toLowerCase(), bg: "#ffffff", fg: "#4a525b", border: "#d5dae0", cursor: "pointer", title: "Record the " + short.toLowerCase() + " with a signature" };
  }

  async function claim(a, key, label) {
    const atKey = key === "giftClaimed" ? "giftAt" : "bonusAt";
    const token = a.id + ":" + key;
    if (a.status !== "checked-in" && !a[key]) { flash("Check " + a.name + " in before releasing the " + label.toLowerCase()); return; }
    if (!a[key]) {
      clearTimeout(confirmTimer.current);
      setClaimTarget({ id: a.id, key: key, label: label });
      setSigInk(false); setSigError(""); setConfirming("");
      return;
    }
    if (confirming !== token) {
      clearTimeout(confirmTimer.current);
      setConfirming(token);
      confirmTimer.current = setTimeout(() => setConfirming(""), 4000);
      flash("Tap again to release " + a.name + "'s " + label.toLowerCase());
      return;
    }
    clearTimeout(confirmTimer.current);
    const updated = await patchAttendee(a.id, { [key]: false, [atKey]: "" });
    setConfirming("");
    setAttendees((list) => list.map((x) => (x.id === a.id ? updated : x)));
    flash(label + " released for " + a.name);
  }

  function sigCtx() {
    const c = sigRef.current;
    if (!c) return null;
    const ctx = c.getContext("2d");
    ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#1a1d21";
    return ctx;
  }
  function sigPos(e) {
    const r = sigRef.current.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (sigRef.current.width / r.width), y: (e.clientY - r.top) * (sigRef.current.height / r.height) };
  }
  function sigDown(e) {
    const ctx = sigCtx(); if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const p = sigPos(e);
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    if (!sigInk) { setSigInk(true); setSigError(""); }
  }
  function sigMove(e) {
    if (!drawingRef.current) return;
    const ctx = sigCtx(); if (!ctx) return;
    const p = sigPos(e);
    ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  function sigUp() { drawingRef.current = false; }
  function clearSig() {
    const c = sigRef.current;
    if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
    setSigInk(false);
  }

  async function confirmClaim() {
    const t = claimTarget;
    if (!t) return;
    if (!sigInk) { setSigError("Ask the attendee to sign in the box above."); return; }
    const a = attendees.find((x) => x.id === t.id);
    const atKey = t.key === "giftClaimed" ? "giftAt" : "bonusAt";
    const sigKey = t.key === "giftClaimed" ? "giftSig" : "bonusSig";
    const c = sigRef.current;
    const stamp = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const updated = await patchAttendee(t.id, { [t.key]: true, [atKey]: stamp, [sigKey]: c ? c.toDataURL() : "signed" });
    setClaimTarget(null); setSigInk(false); setSigError("");
    setAttendees((list) => list.map((x) => (x.id === t.id ? updated : x)));
    flash(t.label + " signed for by " + a.name);
  }

  function openNew() {
    const s = sessionFilter !== "all" ? sessionFilter : (sessions[0] ? sessions[0].id : "");
    setModalOpen(true); setEditingId(null); setFormError(""); setForm(blankForm(s));
  }
  function openEdit(a) {
    setModalOpen(true); setEditingId(a.id); setFormError("");
    setForm({ name: a.name, email: a.email, phone: a.phone, category: a.category, source: a.source || "Staff entry", sessionId: a.sessionId, status: a.status, guestOf: a.guestOf || "", notes: a.notes });
  }
  function setField(key, value) {
    setForm((f) => Object.assign({}, f, { [key]: value }));
    setFormError("");
  }

  async function save() {
    if (!form.name.trim()) { setFormError("Enter the attendee's full name."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setFormError("Enter a valid email address."); return; }
    const dupe = attendees.some((a) => a.id !== editingId && a.email.toLowerCase() === form.email.trim().toLowerCase() && a.sessionId === form.sessionId);
    if (dupe) { setFormError("This email is already registered for that event date."); return; }

    const editing = editingId ? attendees.find((a) => a.id === editingId) : null;
    const taken = seatsFor(form.sessionId) - (editing && editing.sessionId === form.sessionId && editing.status !== "cancelled" ? 1 : 0);
    if (form.status !== "cancelled" && taken + 1 > capFor(form.sessionId)) {
      setFormError("That date is full — " + Math.max(0, capFor(form.sessionId) - taken) + " seat(s) left.");
      return;
    }
    if (form.category === "Bring a friend" && !form.guestOf) { setFormError("Choose who this attendee is coming with."); return; }
    const guestOf = form.category === "Bring a friend" ? form.guestOf : "";

    if (editingId) {
      try {
        const updated = await patchAttendee(editingId, Object.assign({}, form, { guestOf: guestOf }));
        setAttendees((list) => list.map((a) => (a.id === editingId ? updated : a)));
        setModalOpen(false); setEditingId(null);
        flash("Updated " + form.name.trim());
      } catch (e) { setFormError(String(e.message || e)); }
    } else {
      const body = Object.assign({}, form, {
        name: form.name.trim(), email: form.email.trim(), guestOf: guestOf,
        registeredAt: new Date().toISOString().slice(0, 10)
      });
      const res = await fetch("/api/attendees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) { setFormError(data.error); return; }
      setAttendees((list) => list.concat([data.attendee]));
      setModalOpen(false);
      const s = sessions.find((s2) => s2.id === data.attendee.sessionId);
      flash(data.attendee.name + " registered for " + (s ? fmt(s.date, { month: "short", day: "numeric" }) : "the event"));
    }
  }

  async function remove() {
    const id = editingId;
    if (!id) return;
    const a = attendees.find((x) => x.id === id);
    const res = await fetch("/api/attendees/" + id, { method: "DELETE" });
    const data = await res.json();
    if (data.error) { setFormError(data.error); return; }
    setAttendees((list) => list.filter((x) => x.id !== id));
    setModalOpen(false); setEditingId(null);
    flash("Removed " + a.name);
  }

  function addFriend(host) {
    setModalOpen(true); setEditingId(null); setFormError("");
    setForm({ name: "", email: "", phone: "", category: "Bring a friend", sessionId: host.sessionId, status: "registered", guestOf: host.id, notes: "", walkIn: true, source: "Walk-in with " + host.name });
  }

  function openDateDialog() {
    setDateError("");
    setDateForm({ date: "", time: "9:00 AM – 12:30 PM", room: "Training Room A", capacity: String(DEFAULT_CAPACITY), importText: "", source: "Imported list" });
  }
  function setDateField(key, value) {
    setDateForm((f) => Object.assign({}, f, { [key]: value }));
    setDateError("");
  }
  function parseImportLocal(text) {
    const seen = {};
    return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => l.split(/\s*,\s*/)).map((p) => {
      const name = (p[0] || "").trim();
      if (!name) return null;
      const email = (p[1] || "").trim();
      if (email && seen[email.toLowerCase()]) return null;
      if (email) seen[email.toLowerCase()] = 1;
      const cat = ["Referral", "Bring a friend", "Partner"].indexOf((p[3] || "").trim()) > -1 ? p[3].trim() : "Referral";
      return {
        name: name, email: email, phone: (p[2] || "").trim(),
        category: cat === "Bring a friend" ? "Referral" : cat, status: "registered",
        guestOf: "", registeredAt: new Date().toISOString().slice(0, 10), notes: "",
        giftClaimed: false, giftAt: "", bonusClaimed: false, bonusAt: "", walkIn: false
      };
    }).filter(Boolean);
  }
  async function saveDateDialog() {
    const f = dateForm;
    if (!f) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) { setDateError("Pick a date for the class."); return; }
    if (sessions.some((x) => x.date === f.date)) { setDateError("A class is already scheduled on that date."); return; }
    const cap = Math.max(1, Number(f.capacity) || DEFAULT_CAPACITY);
    const source = f.source.trim() || "Imported list";
    const imported = f.importText.trim() ? parseImportLocal(f.importText).map((a) => Object.assign({}, a, { source: source })) : [];
    if (imported.length > cap) { setDateError("The list has " + imported.length + " people but capacity is " + cap + "."); return; }
    const res = await fetch("/api/sessions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: f.date, time: f.time.trim() || "9:00 AM – 12:30 PM", room: f.room.trim() || "TBD", capacity: cap, attendees: imported })
    });
    const data = await res.json();
    if (data.error) { setDateError(data.error); return; }
    setSessions((list) => list.concat([data.session]).sort((a, b) => a.date.localeCompare(b.date)));
    setAttendees((list) => list.concat(data.attendees));
    setDateForm(null); setSessionFilter(data.session.id);
    flash(data.attendees.length ? "Class date added with " + data.attendees.length + " imported registration" + (data.attendees.length === 1 ? "" : "s") : "Class date added");
  }

  if (loading) {
    return <div style={css("min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: Roboto, Helvetica, Arial, sans-serif; color: #6b7480;")}>Loading Event Ops…</div>;
  }
  if (loadError) {
    return <div style={css("min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: Roboto, Helvetica, Arial, sans-serif; color: #9b3025; padding: 24px; text-align: center;")}>Could not load data: {loadError}</div>;
  }

  const scope = sessionFilter === "all" ? null : sessions.find((s) => s.id === sessionFilter);
  const inScope = attendees.filter((a) => !scope || a.sessionId === scope.id);
  const active = inScope.filter((a) => a.status !== "cancelled");
  const checkedIn = inScope.filter((a) => a.status === "checked-in");
  const bringing = active.filter((a) => a.category === "Bring a friend").length;
  const seatsTaken = scope ? seatsFor(scope.id) : sessions.reduce((n, s) => n + seatsFor(s.id), 0);
  const totalCap = scope ? capFor(scope.id) : sessions.reduce((n, s) => n + capFor(s.id), 0);
  const rows = filteredRows();
  const isEmpty = rows.length === 0;
  const bgBlur = (modalOpen || claimTarget || dateForm) ? "blur(5px)" : "none";
  const guestFieldDisplay = form.category === "Bring a friend" ? "flex" : "none";
  const hostOptions = attendees
    .filter((a) => a.sessionId === form.sessionId && a.id !== editingId && a.status !== "cancelled" && !a.guestOf)
    .sort((a, b) => a.name.localeCompare(b.name));

  const tabs = ["all", "registered", "checked-in", "cancelled"].map((id) => ({
    id: id,
    label: id === "all" ? "All" : id === "registered" ? "Registered" : id === "checked-in" ? "Checked in" : "Cancelled",
    bg: statusFilter === id ? "#ffffff" : "transparent",
    fg: statusFilter === id ? "#a8261f" : "#6b7480",
    shadow: statusFilter === id ? "0 1px 2px rgba(0,0,0,0.12)" : "none"
  }));

  const giftSummary = active.filter((a) => a.giftClaimed).length + " of " + active.length + " gift packs claimed · " + active.filter((a) => a.bonusClaimed).length + " referral bonuses";
  const resultLabel = rows.length + (rows.length === 1 ? " attendee shown" : " attendees shown") + " of " + attendees.length + " total";
  const updatedLabel = "Last updated " + (lastUpdated || new Date()).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div style={css("min-height: 100vh; background: #f6f7f9;")}>

      <header style={css("background: #ffffff; border-bottom: 1px solid #e3e6ea; padding: 0 20px;")}>
        <div style={css("max-width: 1320px; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px 20px; padding: 16px 0;")}>
          <div style={css("display: flex; align-items: center; gap: 14px;")}>
            <div style={css("width: 40px; height: 40px; border-radius: 10px; background: #a8261f; color: #fff; display: grid; place-items: center; font-size: 17px; font-weight: 500; letter-spacing: 0.5px;")}>EO</div>
            <div style={css("display: flex; flex-direction: column; gap: 2px;")}>
              <div style={css("font-size: 19px; font-weight: 500; letter-spacing: -0.2px;")}>{EVENT_NAME}</div>
              <div style={css("font-size: 13px; color: #6b7480; font-weight: 400;")}>Registration Management Portal</div>
            </div>
          </div>
          <div style={css("display: flex; align-items: center; gap: 10px;")}>
            <button type="button" className="ops-btn-ghost" onClick={openDateDialog} style={css("height: 40px; padding: 0 16px; border: 1px solid #d5dae0; background: #fff; color: #33393f; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 7px;")}><span style={css("font-size: 16px; line-height: 1; font-weight: 400;")}>+</span>Add class date</button>
            <button type="button" className="ops-btn-ghost" onClick={() => flash("Exported " + rows.length + " rows to CSV")} style={css("height: 40px; padding: 0 16px; border: 1px solid #d5dae0; background: #fff; color: #33393f; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;")}>Export list</button>
            <button type="button" className="ops-btn-primary" onClick={openNew} style={css("height: 40px; padding: 0 18px; border: 1px solid #a8261f; background: #a8261f; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 8px;")}><span style={css("font-size: 17px; line-height: 1; font-weight: 400;")}>+</span>New registration</button>
            {userEmail && (
              <div style={css("display: flex; align-items: center; gap: 10px; padding-left: 4px; margin-left: 4px; border-left: 1px solid #eceff2;")}>
                <span style={css("font-size: 12.5px; color: #8a919b;")}>{userEmail}</span>
                <button type="button" className="ops-link-muted" onClick={signOut} style={css("height: 40px; padding: 0 4px; border: none; background: transparent; color: #6b7480; font-size: 13px; font-weight: 500; cursor: pointer;")}>Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main style={Object.assign(css("max-width: 1320px; margin: 0 auto; padding: 22px 20px 72px; transition: filter 0.18s ease;"), { filter: bgBlur })}>

        <section style={css("display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px;")}>
          <div style={css("background: #fff; border: 1px solid #e3e6ea; border-radius: 12px; padding: 18px 20px;")}>
            <div style={css("font-size: 12px; font-weight: 500; letter-spacing: 0.6px; text-transform: uppercase; color: #6b7480;")}>Registrations</div>
            <div style={css("font-family: 'Roboto Mono', monospace; font-size: 34px; font-weight: 500; letter-spacing: -1px; margin-top: 8px;")}>{active.length}</div>
            <div style={css("font-size: 13px; color: #6b7480; margin-top: 4px;")}>{scope ? fmt(scope.date, { weekday: "long", month: "long", day: "numeric" }) : "All " + sessions.length + " September dates"}</div>
          </div>
          <div style={css("background: #fff; border: 1px solid #e3e6ea; border-radius: 12px; padding: 18px 20px;")}>
            <div style={css("font-size: 12px; font-weight: 500; letter-spacing: 0.6px; text-transform: uppercase; color: #6b7480;")}>Checked in</div>
            <div style={css("font-family: 'Roboto Mono', monospace; font-size: 34px; font-weight: 500; letter-spacing: -1px; margin-top: 8px; color: #2f6b40;")}>{checkedIn.length}</div>
            <div style={css("font-size: 13px; color: #6b7480; margin-top: 4px;")}>{active.length ? Math.round((checkedIn.length / active.length) * 100) + "%" : "0%"} of expected</div>
          </div>
          <div style={css("background: #fff; border: 1px solid #e3e6ea; border-radius: 12px; padding: 18px 20px;")}>
            <div style={css("font-size: 12px; font-weight: 500; letter-spacing: 0.6px; text-transform: uppercase; color: #6b7480;")}>Awaiting check-in</div>
            <div style={css("font-family: 'Roboto Mono', monospace; font-size: 34px; font-weight: 500; letter-spacing: -1px; margin-top: 8px;")}>{active.length - checkedIn.length}</div>
            <div style={css("font-size: 13px; color: #6b7480; margin-top: 4px;")}>{bringing + (bringing === 1 ? " guest brought by another attendee" : " guests brought by other attendees")}</div>
          </div>
          {SHOW_SEATS && (
            <div style={css("background: #fff; border: 1px solid #e3e6ea; border-radius: 12px; padding: 18px 20px;")}>
              <div style={css("font-size: 12px; font-weight: 500; letter-spacing: 0.6px; text-transform: uppercase; color: #6b7480;")}>Seats remaining</div>
              <div style={css("font-family: 'Roboto Mono', monospace; font-size: 34px; font-weight: 500; letter-spacing: -1px; margin-top: 8px;")}>{Math.max(0, totalCap - seatsTaken)}</div>
              <div style={css("font-size: 13px; color: #6b7480; margin-top: 4px;")}>{scope ? capFor(scope.id) + " seats this date" : totalCap + " across " + sessions.length + " dates"}</div>
            </div>
          )}
        </section>

        <section style={css("margin-top: 24px; background: #fff; border: 1px solid #e3e6ea; border-radius: 12px; overflow: hidden;")}>

          <div style={css("display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 16px 20px; border-bottom: 1px solid #eceff2;")}>
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or category" style={css("flex: 1 1 260px; min-width: 220px; height: 42px; padding: 0 12px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; color: #1a1d21; background: #fff;")} />
            <select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)} style={css("height: 42px; padding: 0 10px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; background: #fff; color: #1a1d21; cursor: pointer;")}>
              <option value="all">All event dates</option>
              {sessions.map((s) => <option key={s.id} value={s.id}>{fmt(s.date, { weekday: "short", month: "short", day: "numeric" })}</option>)}
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={css("height: 42px; padding: 0 10px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; background: #fff; color: #1a1d21; cursor: pointer;")}>
              <option value="all">All statuses</option>
              <option value="Referral">Referral</option>
              <option value="Bring a friend">Bring a friend</option>
              <option value="Partner">Partner</option>
              <option value="hosts">Attendees bringing a friend</option>
            </select>
            <div style={css("display: flex; gap: 4px; background: #f2f4f6; border-radius: 8px; padding: 4px;")}>
              {tabs.map((t) => (
                <button key={t.id} type="button" onClick={() => setStatusFilter(t.id)} style={css("height: 34px; padding: 0 14px; border: none; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; background: " + t.bg + "; color: " + t.fg + "; box-shadow: " + t.shadow + ";")}>{t.label}</button>
              ))}
            </div>
            <button type="button" className="ops-link-muted" onClick={() => { setQuery(""); setSessionFilter("all"); setStatusFilter("all"); setCategoryFilter("all"); }} style={css("height: 42px; padding: 0 12px; border: none; background: transparent; color: #6b7480; font-size: 13px; font-weight: 500; cursor: pointer;")}>Clear filters</button>
          </div>

          <div style={css("overflow-x: auto;")}>
            <table style={css("width: 100%; border-collapse: collapse; font-size: 14px;")}>
              <thead>
                <tr style={css("background: #fafbfc;")}>
                  <th style={css("text-align: left; padding: 11px 20px; font-size: 11.5px; font-weight: 500; letter-spacing: 0.6px; text-transform: uppercase; color: #6b7480; border-bottom: 1px solid #eceff2; min-width: 230px;")}>Attendee</th>
                  <th style={css("text-align: left; padding: 11px 16px; font-size: 11.5px; font-weight: 500; letter-spacing: 0.6px; text-transform: uppercase; color: #6b7480; border-bottom: 1px solid #eceff2;")}>Contact</th>
                  <th style={css("text-align: left; padding: 11px 16px; font-size: 11.5px; font-weight: 500; letter-spacing: 0.6px; text-transform: uppercase; color: #6b7480; border-bottom: 1px solid #eceff2;")}>Status</th>
                  <th style={css("text-align: left; padding: 11px 16px; font-size: 11.5px; font-weight: 500; letter-spacing: 0.6px; text-transform: uppercase; color: #6b7480; border-bottom: 1px solid #eceff2;")}>Event date</th>
                  <th style={css("text-align: left; padding: 11px 16px; font-size: 11.5px; font-weight: 500; letter-spacing: 0.6px; text-transform: uppercase; color: #6b7480; border-bottom: 1px solid #eceff2;")}>Check-in</th>
                  <th style={Object.assign(css("text-align: left; padding: 11px 16px; font-size: 11.5px; font-weight: 500; letter-spacing: 0.6px; text-transform: uppercase; color: #6b7480; border-bottom: 1px solid #eceff2;"), { display: TRACK_GIFTS ? "table-cell" : "none" })}>Gifts claimed</th>
                  <th style={css("text-align: right; padding: 11px 20px; font-size: 11.5px; font-weight: 500; letter-spacing: 0.6px; text-transform: uppercase; color: #6b7480; border-bottom: 1px solid #eceff2;")}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const ss = STATUS_STYLE[a.status];
                  const s = sessions.find((x) => x.id === a.sessionId);
                  const isIn = a.status === "checked-in";
                  const host = a.guestOf ? attendees.find((x) => x.id === a.guestOf) : null;
                  const guests = attendees.filter((x) => x.guestOf === a.id);
                  const relation = host ? (a.walkIn ? "Walk-in guest of " + host.name : "Guest of " + host.name)
                    : (guests.length ? "Bringing " + guests.length + (guests.length === 1 ? " friend: " : " friends: ") + guests.map((g) => g.name).join(", ") : "");
                  const gift = chip(a, "giftClaimed", "giftAt", "Gift pack", "#2f6b40", "#e7f3ea");
                  const bonus = chip(a, "bonusClaimed", "bonusAt", "Referral bonus", "#6a58a8", "#f2effa");
                  const initials = a.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
                  return (
                    <tr key={a.id} className="ops-row" style={css("border-bottom: 1px solid #f1f3f5;")}>
                      <td style={{ ...css("padding: 20px; vertical-align: middle;"), paddingTop: PAD, paddingBottom: PAD }}>
                        <div style={css("display: flex; align-items: center; gap: 12px;")}>
                          <div style={css("width: 34px; height: 34px; border-radius: 50%; background: #eef1f4; color: #4a525b; display: grid; place-items: center; font-size: 13px; font-weight: 500; flex: none;")}>{initials}</div>
                          <div style={css("display: flex; flex-direction: column; gap: 1px;")}>
                            <span style={css("font-weight: 500; color: #1a1d21;")}>{a.name}</span>
                            <span style={css("font-size: 12.5px; color: #8a919b;")}>Registered {fmt(a.registeredAt, { month: "short", day: "numeric" })}</span>
                            {relation && <span style={{ ...css("display: inline-flex; align-items: center; align-self: flex-start; margin-top: 3px; min-height: 20px; padding: 2px 8px; line-height: 1.3; border-radius: 5px; font-size: 11.5px; font-weight: 500;"), background: host ? "#f2effa" : "#eef4ee", color: host ? "#5a4b8a" : "#3c6b48" }}>{relation}</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{ ...css("padding: 16px; vertical-align: middle; color: #4a525b;"), paddingTop: PAD, paddingBottom: PAD }}>
                        <div style={css("display: flex; flex-direction: column; gap: 1px;")}>
                          <span>{a.email}</span>
                          <span style={css("font-size: 12.5px; color: #8a919b; font-family: 'Roboto Mono', monospace;")}>{a.phone}</span>
                        </div>
                      </td>
                      <td style={{ ...css("padding: 16px; vertical-align: middle;"), paddingTop: PAD, paddingBottom: PAD }}><span style={css("display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border-radius: 6px; font-size: 12.5px; font-weight: 500; background: #f2f4f6; color: #4a525b;")}>{a.category || "Referral"}</span></td>
                      <td style={{ ...css("padding: 16px; vertical-align: middle; color: #4a525b; white-space: nowrap;"), paddingTop: PAD, paddingBottom: PAD }}>{s ? fmt(s.date, { month: "short", day: "numeric" }) + " · " + s.time.split(" – ")[0] : ""}</td>
                      <td style={{ ...css("padding: 16px; vertical-align: middle;"), paddingTop: PAD, paddingBottom: PAD }}>
                        <button type="button" onClick={() => (a.status === "cancelled" ? reinstate(a) : toggleCheckIn(a))} title={a.status === "cancelled" ? "Click to reinstate" : (isIn ? "Click to undo check-in" : "Click to check in")} style={css("display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border: none; border-radius: 999px; font-size: 12.5px; font-weight: 500; cursor: pointer; background: " + ss.bg + "; color: " + ss.fg + ";")}><span style={{ ...css("width: 6px; height: 6px; border-radius: 50%;"), background: ss.fg }}></span>{ss.label}</button>
                      </td>
                      <td style={{ ...css("vertical-align: middle;"), paddingTop: PAD, paddingBottom: PAD, paddingLeft: 16, paddingRight: 16, display: TRACK_GIFTS ? "table-cell" : "none" }}>
                        <div style={css("display: flex; flex-direction: column; align-items: flex-start; gap: 6px;")}>
                          <button type="button" onClick={() => claim(a, "giftClaimed", "Gift pack")} title={gift.title} style={{ ...css("display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 12px 0 10px; border-radius: 999px; font-size: 12.5px; font-weight: 500; white-space: nowrap; transition: background 0.14s ease, border-color 0.14s ease;"), border: "1px solid " + gift.border, background: gift.bg, color: gift.fg, cursor: gift.cursor }}><span style={css("font-size: 12px; line-height: 1; width: 12px; text-align: center;")}>{gift.mark}</span>{gift.label}</button>
                          {guests.length > 0 && (
                            <button type="button" onClick={() => claim(a, "bonusClaimed", "Referral bonus")} title={bonus.title} style={{ ...css("display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 12px 0 10px; border-radius: 999px; font-size: 12.5px; font-weight: 500; white-space: nowrap; transition: background 0.14s ease, border-color 0.14s ease;"), border: "1px solid " + bonus.border, background: bonus.bg, color: bonus.fg, cursor: bonus.cursor }}><span style={css("font-size: 12px; line-height: 1; width: 12px; text-align: center;")}>{bonus.mark}</span>{bonus.label}</button>
                          )}
                        </div>
                      </td>
                      <td style={{ ...css("padding: 20px; vertical-align: middle;"), paddingTop: PAD, paddingBottom: PAD }}>
                        <div style={css("display: flex; justify-content: flex-end; gap: 8px;")}>
                          <button type="button" onClick={() => (a.status === "cancelled" ? reinstate(a) : toggleCheckIn(a))} style={{ ...css("display: inline-flex; align-items: center; justify-content: center; width: 92px; flex: none; height: 36px; padding: 0; border-radius: 7px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap;"), border: "1px solid " + (isIn || a.status === "cancelled" ? "#d5dae0" : "#2f6b40"), background: isIn || a.status === "cancelled" ? "#ffffff" : "#2f6b40", color: isIn || a.status === "cancelled" ? "#4a525b" : "#ffffff" }}>{a.status === "cancelled" ? "Reinstate" : (isIn ? "Undo" : "Check in")}</button>
                          <button type="button" className="ops-btn-ghost" onClick={() => addFriend(a)} title={guests.length ? "Add another friend" : "Add a friend"} style={{ ...css("display: inline-flex; align-items: center; justify-content: center; width: 36px; flex: none; height: 36px; padding: 0; border: 1px solid #d5dae0; background: #fff; color: #6b7480; border-radius: 7px; font-size: 16px; font-weight: 400; line-height: 1; cursor: pointer;"), visibility: (a.status !== "cancelled" && !a.guestOf) ? "visible" : "hidden" }}>+</button>
                          <button type="button" className="ops-btn-ghost" onClick={() => openEdit(a)} style={css("display: inline-flex; align-items: center; justify-content: center; width: 60px; flex: none; height: 36px; padding: 0; border: 1px solid #d5dae0; background: #fff; color: #4a525b; border-radius: 7px; font-size: 13px; font-weight: 500; cursor: pointer;")}>Edit</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {isEmpty && (
            <div style={css("padding: 56px 20px; text-align: center;")}>
              <div style={css("font-size: 15px; font-weight: 500; color: #4a525b;")}>No attendees match these filters</div>
              <div style={css("font-size: 13.5px; color: #8a919b; margin-top: 6px;")}>Adjust the search or event date, or add a registration.</div>
            </div>
          )}

          <div style={css("display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-top: 1px solid #eceff2; background: #fafbfc; font-size: 13px; color: #6b7480;")}>
            <span>{resultLabel}</span>
            <span style={{ display: TRACK_GIFTS ? "inline" : "none" }}>{giftSummary}</span>
            <span>{updatedLabel}</span>
          </div>
        </section>

        <section style={css("margin-top: 24px; background: #fff; border: 1px solid #e3e6ea; border-radius: 12px; padding: 20px;")}>
          <div style={css("display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14px;")}>
            <span style={css("font-size: 12px; font-weight: 500; letter-spacing: 0.6px; text-transform: uppercase; color: #6b7480;")}>Upcoming sessions</span>
            <span style={css("font-size: 12.5px; color: #8a919b;")}>Claimed / to prepare · click a date to filter</span>
          </div>
          <div style={css("display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px;")}>
            {sessions.map((s) => {
              const taken = seatsFor(s.id);
              const sCap = capFor(s.id);
              const prep = prepFor(s.id);
              const selected = sessionFilter === s.id;
              return (
                <button key={s.id} type="button" onClick={() => setSessionFilter(selected ? "all" : s.id)} style={{ ...css("text-align: left; border-radius: 10px; padding: 14px 16px; cursor: pointer; display: flex; flex-direction: column; gap: 8px;"), border: "1px solid " + (selected ? "#a8261f" : "#e3e6ea"), background: selected ? "#fdf5f4" : "#ffffff" }}>
                  <span style={css("font-size: 14px; font-weight: 500; color: #1a1d21;")}>{fmt(s.date, { weekday: "short", month: "short", day: "numeric" })}</span>
                  <span style={css("font-size: 12.5px; color: #6b7480;")}>{s.time} · {s.room}</span>
                  <span style={css("height: 5px; border-radius: 3px; background: #eceff2; overflow: hidden; display: block;")}><span style={{ ...css("display: block; height: 5px; background: #a8261f;"), width: Math.min(100, Math.round((taken / sCap) * 100)) + "%" }}></span></span>
                  <span style={css("font-size: 12.5px; color: #4a525b; font-family: 'Roboto Mono', monospace;")}>{taken} / {sCap} seats</span>
                  <span style={css("display: flex; flex-direction: column; gap: 3px; padding-top: 9px; border-top: 1px solid #eceff2; font-size: 12px; color: #6b7480;")}>
                    <span style={css("display: flex; justify-content: space-between; gap: 8px;")}>Gift packs to prepare<span style={css("font-family: 'Roboto Mono', monospace; color: #1a1d21;")}>{prep.packsClaimed} / {prep.packs}</span></span>
                    <span style={css("display: flex; justify-content: space-between; gap: 8px;")}>Referral bonuses<span style={css("font-family: 'Roboto Mono', monospace; color: #1a1d21;")}>{prep.bonusesClaimed} / {prep.bonuses}</span></span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      {toast && (
        <div style={css("position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #1a1d21; color: #fff; padding: 12px 20px; border-radius: 999px; font-size: 13.5px; font-weight: 500; box-shadow: 0 8px 28px rgba(0,0,0,0.22); animation: opsFadeUp 0.22s ease-out; z-index: 60;")}>{toast}</div>
      )}

      {dateForm && (
        <div style={css("position: fixed; inset: 0; background: rgba(20, 24, 28, 0.42); display: flex; align-items: flex-start; justify-content: center; padding: 48px 20px; overflow-y: auto; z-index: 85;")}>
          <div style={css("width: 100%; max-width: 580px; background: #fff; border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,0.28); animation: opsFadeUp 0.2s ease-out; padding: 24px;")}>
            <div style={css("font-size: 18px; font-weight: 500; letter-spacing: -0.2px;")}>Add class date</div>
            <div style={css("font-size: 13px; color: #6b7480; margin-top: 4px;")}>The same training, on a new date. Optionally import a registration list for it.</div>

            <div style={css("display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 20px;")}>
              <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b;")}>Date
                <input type="date" value={dateForm.date} onChange={(e) => setDateField("date", e.target.value)} style={css("height: 40px; padding: 0 12px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; color: #1a1d21; font-weight: 400;")} />
              </label>
              <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b;")}>Seats
                <input type="number" min="1" value={dateForm.capacity} onChange={(e) => setDateField("capacity", e.target.value)} style={css("height: 40px; padding: 0 12px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; color: #1a1d21; font-weight: 400;")} />
              </label>
              <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b;")}>Time
                <input type="text" value={dateForm.time} onChange={(e) => setDateField("time", e.target.value)} style={css("height: 40px; padding: 0 12px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; color: #1a1d21; font-weight: 400;")} />
              </label>
              <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b;")}>Room
                <input type="text" value={dateForm.room} onChange={(e) => setDateField("room", e.target.value)} style={css("height: 40px; padding: 0 12px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; color: #1a1d21; font-weight: 400;")} />
              </label>
            </div>

            <div style={css("display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-top: 20px;")}>
              <span style={css("font-size: 13px; font-weight: 500; color: #4a525b;")}>Import registrations</span>
              <span style={css("font-size: 12px; color: #8a919b; font-family: 'Roboto Mono', monospace;")}>Name, Email, Phone, Status</span>
            </div>
            <textarea rows={5} value={dateForm.importText} onChange={(e) => setDateField("importText", e.target.value)} placeholder={"Jordan Ellis, jordan@example.com, (555) 010-2233, Referral\nSam Whitaker, sam@example.com, (555) 019-8842, Partner"} style={css("width: 100%; box-sizing: border-box; margin-top: 8px; padding: 10px 12px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 13px; font-family: 'Roboto Mono', monospace; color: #1a1d21; resize: vertical;")}></textarea>
            <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b; margin-top: 14px;")}>Source for imported rows
              <input type="text" value={dateForm.source} onChange={(e) => setDateField("source", e.target.value)} style={css("height: 40px; padding: 0 12px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; color: #1a1d21; font-weight: 400;")} />
            </label>

            {dateError && <div style={css("margin-top: 14px; padding: 10px 14px; border-radius: 8px; background: #fdf4e3; color: #8a5a12; font-size: 13px; font-weight: 500;")}>{dateError}</div>}

            <div style={css("display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px;")}>
              <button type="button" onClick={() => { setDateForm(null); setDateError(""); }} style={css("height: 40px; padding: 0 16px; border: 1px solid #d5dae0; background: #fff; color: #4a525b; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;")}>Cancel</button>
              <button type="button" className="ops-btn-primary" onClick={saveDateDialog} style={css("height: 40px; padding: 0 20px; border: 1px solid #a8261f; background: #a8261f; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;")}>Add date</button>
            </div>
          </div>
        </div>
      )}

      {claimTarget && (
        <div style={css("position: fixed; inset: 0; background: rgba(20, 24, 28, 0.42); display: flex; align-items: flex-start; justify-content: center; padding: 64px 20px; overflow-y: auto; z-index: 90;")}>
          <div style={css("width: 100%; max-width: 520px; background: #fff; border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,0.28); animation: opsFadeUp 0.2s ease-out; padding: 24px;")}>
            <div style={css("font-size: 18px; font-weight: 500; letter-spacing: -0.2px;")}>{"Acknowledge " + claimTarget.label.toLowerCase()}</div>
            <div style={css("font-size: 13px; color: #6b7480; margin-top: 4px;")}>{(attendees.find((a) => a.id === claimTarget.id) || {}).name}</div>
            <div style={css("margin-top: 18px; padding: 14px 16px; background: #fafbfc; border: 1px solid #eceff2; border-radius: 10px; font-size: 13.5px; line-height: 1.5; color: #33393f; text-wrap: pretty;")}>{"I confirm I have received one " + claimTarget.label.toLowerCase() + " for this training event, at no cost."}</div>

            <div style={css("display: flex; align-items: baseline; justify-content: space-between; margin-top: 18px;")}>
              <span style={css("font-size: 12px; font-weight: 500; letter-spacing: 0.6px; text-transform: uppercase; color: #6b7480;")}>Attendee signature</span>
              <button type="button" className="ops-link-muted" onClick={clearSig} style={css("border: none; background: transparent; color: #6b7480; font-size: 12.5px; font-weight: 500; cursor: pointer; padding: 0;")}>Clear</button>
            </div>
            <canvas ref={sigRef} width={944} height={280} onPointerDown={sigDown} onPointerMove={sigMove} onPointerUp={sigUp} onPointerLeave={sigUp} style={css("width: 100%; height: 140px; margin-top: 8px; border: 1px dashed #cdd3da; border-radius: 10px; background: #fff; touch-action: none; cursor: crosshair; display: block;")}></canvas>
            <div style={css("font-size: 12.5px; color: #8a919b; margin-top: 7px;")}>{sigInk ? "Signature captured" : "Sign with a finger, stylus or mouse"}</div>

            {sigError && <div style={css("margin-top: 12px; padding: 10px 14px; border-radius: 8px; background: #fdf4e3; color: #8a5a12; font-size: 13px; font-weight: 500;")}>{sigError}</div>}

            <div style={css("display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px;")}>
              <button type="button" onClick={() => { setClaimTarget(null); setSigInk(false); setSigError(""); }} style={css("height: 40px; padding: 0 16px; border: 1px solid #d5dae0; background: #fff; color: #4a525b; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;")}>Cancel</button>
              <button type="button" className="ops-btn-primary" onClick={confirmClaim} style={css("height: 40px; padding: 0 20px; border: 1px solid #a8261f; background: #a8261f; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;")}>Confirm &amp; record</button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div style={css("position: fixed; inset: 0; background: rgba(20, 24, 28, 0.42); display: flex; align-items: flex-start; justify-content: center; padding: 48px 20px; overflow-y: auto; z-index: 80;")}>
          <div style={css("width: 100%; max-width: 560px; background: #fff; border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,0.28); animation: opsFadeUp 0.2s ease-out;")}>
            <div style={css("display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 22px 24px 0;")}>
              <div style={css("display: flex; flex-direction: column; gap: 4px;")}>
                <div style={css("font-size: 18px; font-weight: 500; letter-spacing: -0.2px;")}>{editingId ? "Edit registration" : "New registration"}</div>
                <div style={css("font-size: 13px; color: #6b7480;")}>Free event — no payment details collected.</div>
              </div>
              <button type="button" className="ops-close" onClick={() => { setModalOpen(false); setEditingId(null); setFormError(""); }} style={css("width: 32px; height: 32px; border: none; background: #f2f4f6; border-radius: 8px; color: #4a525b; font-size: 17px; line-height: 1; cursor: pointer; flex: none;")}>×</button>
            </div>

            <div style={css("padding: 20px 24px 4px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;")}>
              <label style={css("grid-column: span 2; display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b;")}>Full name
                <input type="text" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Jordan Ellis" style={css("height: 40px; padding: 0 12px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; color: #1a1d21; font-weight: 400;")} />
              </label>
              <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b;")}>Email
                <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="jordan@example.com" style={css("height: 40px; padding: 0 12px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; color: #1a1d21; font-weight: 400;")} />
              </label>
              <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b;")}>Phone
                <input type="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="(555) 010-2233" style={css("height: 40px; padding: 0 12px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; color: #1a1d21; font-weight: 400;")} />
              </label>
              <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b;")}>Status
                <select value={form.category} onChange={(e) => setField("category", e.target.value)} style={css("height: 40px; padding: 0 10px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; background: #fff; color: #1a1d21; font-weight: 400; cursor: pointer;")}>
                  <option value="Referral">Referral</option>
                  <option value="Bring a friend">Bring a friend</option>
                  <option value="Partner">Partner</option>
                </select>
              </label>
              <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b;")}>Event date
                <select value={form.sessionId} onChange={(e) => setField("sessionId", e.target.value)} style={css("height: 40px; padding: 0 10px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; background: #fff; color: #1a1d21; font-weight: 400; cursor: pointer;")}>
                  {sessions.map((s) => <option key={s.id} value={s.id}>{fmt(s.date, { weekday: "long", month: "long", day: "numeric" }) + " · " + s.time}</option>)}
                </select>
              </label>
              <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b;")}>Check-in
                <select value={form.status} onChange={(e) => setField("status", e.target.value)} style={css("height: 40px; padding: 0 10px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; background: #fff; color: #1a1d21; font-weight: 400; cursor: pointer;")}>
                  <option value="registered">Registered</option>
                  <option value="checked-in">Checked in</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b;")}>Source
                <input type="text" value={form.source} onChange={(e) => setField("source", e.target.value)} placeholder="Online form, referral, partner list…" style={css("height: 40px; padding: 0 12px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; color: #1a1d21; font-weight: 400;")} />
              </label>
              <label style={{ ...css("grid-column: span 2; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b;"), display: guestFieldDisplay }}>Coming with
                <select value={form.guestOf} onChange={(e) => setField("guestOf", e.target.value)} style={css("height: 40px; padding: 0 10px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; background: #fff; color: #1a1d21; font-weight: 400; cursor: pointer;")}>
                  <option value="">Select the attendee who invited them…</option>
                  {hostOptions.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </label>
              <label style={css("grid-column: span 2; display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b;")}>Notes
                <textarea rows={3} value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Accessibility needs, arrival time, referral source" style={css("padding: 10px 12px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; color: #1a1d21; font-weight: 400; resize: vertical;")}></textarea>
              </label>
            </div>

            {formError && <div style={css("margin: 14px 24px 0; padding: 10px 14px; border-radius: 8px; background: #fdf4e3; color: #8a5a12; font-size: 13px; font-weight: 500;")}>{formError}</div>}

            <div style={css("display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 20px 24px 22px; margin-top: 18px; border-top: 1px solid #eceff2;")}>
              <button type="button" onClick={remove} style={{ ...css("height: 40px; padding: 0 14px; border: none; background: transparent; color: #8a5a12; font-size: 13.5px; font-weight: 500; cursor: pointer;"), visibility: editingId ? "visible" : "hidden" }}>Remove registration</button>
              <div style={css("display: flex; gap: 10px;")}>
                <button type="button" onClick={() => { setModalOpen(false); setEditingId(null); setFormError(""); }} style={css("height: 40px; padding: 0 16px; border: 1px solid #d5dae0; background: #fff; color: #4a525b; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;")}>Cancel</button>
                <button type="button" className="ops-btn-primary" onClick={save} style={css("height: 40px; padding: 0 20px; border: 1px solid #a8261f; background: #a8261f; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;")}>{editingId ? "Save changes" : "Add registration"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
