"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../../lib/supabaseBrowser";

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

export default function RegisterPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [email, setEmail] = useState("");
  const [sessions, setSessions] = useState([]);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const [sessionId, setSessionId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      supabaseBrowser().auth.getUser(),
      fetch("/api/bootstrap").then((r) => r.json())
    ])
      .then(([{ data: userData }, boot]) => {
        if (boot.error) { setLoadError(boot.error); return; }
        setEmail(userData?.user?.email || "");
        setSessions(boot.sessions);
        const active = boot.attendees.find((a) => a.status !== "cancelled");
        if (active) {
          setAlreadyRegistered(true);
          window.location.href = "/my-registration";
          return;
        }
        if (boot.sessions[0]) setSessionId(boot.sessions[0].id);
      })
      .catch((e) => setLoadError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  function seatsLeft(s) {
    return Math.max(0, Number(s.capacity) - Number(s.taken || 0));
  }

  async function submit(e) {
    e.preventDefault();
    if (!sessionId) { setError("Choose a session date."); return; }
    if (!name.trim()) { setError("Enter your full name."); return; }
    setError("");
    setBusy(true);
    const res = await fetch("/api/attendees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email,
        phone: phone.trim(),
        category: "Referral",
        sessionId,
        status: "registered",
        notes: notes.trim(),
        registeredAt: new Date().toISOString().slice(0, 10)
      })
    });
    const data = await res.json();
    setBusy(false);
    if (data.error) { setError(data.error); return; }
    window.location.href = "/my-registration";
  }

  if (loading || alreadyRegistered) {
    return <div style={css("min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: Roboto, Helvetica, Arial, sans-serif; color: #6b7480;")}>Loading…</div>;
  }
  if (loadError) {
    return <div style={css("min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: Roboto, Helvetica, Arial, sans-serif; color: #9b3025; padding: 24px; text-align: center;")}>Could not load data: {loadError}</div>;
  }

  return (
    <div style={css("min-height: 100vh; background: #f6f7f9; display: flex; align-items: center; justify-content: center; padding: 20px; font-family: Roboto, Helvetica, Arial, sans-serif;")}>
      <div style={css("width: 100%; max-width: 460px; background: #fff; border: 1px solid #e3e6ea; border-radius: 14px; padding: 32px 28px;")}>
        <div style={css("display: flex; align-items: center; gap: 12px; margin-bottom: 22px;")}>
          <div style={css("width: 36px; height: 36px; border-radius: 9px; background: #a8261f; color: #fff; display: grid; place-items: center; font-size: 15px; font-weight: 500;")}>EO</div>
          <div style={css("font-size: 17px; font-weight: 500; color: #1a1d21;")}>Register for Masterclass</div>
        </div>
        <div style={css("font-size: 13px; color: #6b7480; margin-bottom: 18px;")}>Registering as {email}</div>

        <form onSubmit={submit}>
          <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b;")}>
            Session date
            <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} style={css("height: 42px; padding: 0 10px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; background: #fff; color: #1a1d21; cursor: pointer;")}>
              {sessions.map((s) => {
                const left = seatsLeft(s);
                return (
                  <option key={s.id} value={s.id} disabled={left <= 0}>
                    {fmt(s.date, { weekday: "long", month: "long", day: "numeric" }) + " · " + s.time + (left <= 0 ? " — full" : " — " + left + " seats left")}
                  </option>
                );
              })}
            </select>
          </label>

          <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b; margin-top: 14px;")}>
            Full name
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Ellis" autoFocus style={css("height: 42px; padding: 0 12px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; color: #1a1d21;")} />
          </label>

          <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b; margin-top: 14px;")}>
            Phone (optional)
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 010-2233" style={css("height: 42px; padding: 0 12px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; color: #1a1d21;")} />
          </label>

          <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b; margin-top: 14px;")}>
            Notes (optional)
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Accessibility needs, arrival time…" style={css("padding: 10px 12px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; color: #1a1d21; resize: vertical;")}></textarea>
          </label>

          {error && (
            <div style={css("margin-top: 12px; padding: 10px 14px; border-radius: 8px; background: #fdf4e3; color: #8a5a12; font-size: 13px; font-weight: 500;")}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            style={css("margin-top: 18px; width: 100%; height: 44px; border: 1px solid #a8261f; background: #a8261f; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;")}
          >
            {busy ? "Registering…" : "Complete registration"}
          </button>
        </form>
      </div>
    </div>
  );
}
