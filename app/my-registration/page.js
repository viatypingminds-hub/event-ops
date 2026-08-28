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

const STATUS_STYLE = {
  "registered": { bg: "#eef1f4", fg: "#4a525b", label: "Registered" },
  "checked-in": { bg: "#e7f3ea", fg: "#2f6b40", label: "Checked in" },
  "cancelled": { bg: "#f6eceb", fg: "#9b3025", label: "Cancelled" }
};

export default function MyRegistrationPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [attendee, setAttendee] = useState(null);
  const [session, setSession] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    Promise.all([
      supabaseBrowser().auth.getUser(),
      fetch("/api/bootstrap").then((r) => r.json())
    ])
      .then(([{ data: userData }, boot]) => {
        if (boot.error) { setLoadError(boot.error); return; }
        setUserEmail(userData?.user?.email || "");
        const active = boot.attendees.find((a) => a.status !== "cancelled") || boot.attendees[0] || null;
        setAttendee(active);
        setSession(active ? boot.sessions.find((s) => s.id === active.sessionId) : null);
      })
      .catch((e) => setLoadError(String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    window.location.href = "/login";
  }

  async function cancel() {
    if (!attendee) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/attendees/" + attendee.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" })
    });
    const data = await res.json();
    setBusy(false);
    if (data.error) { setError(data.error); return; }
    load();
  }

  if (loading) {
    return <div style={css("min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: Roboto, Helvetica, Arial, sans-serif; color: #6b7480;")}>Loading…</div>;
  }
  if (loadError) {
    return <div style={css("min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: Roboto, Helvetica, Arial, sans-serif; color: #9b3025; padding: 24px; text-align: center;")}>Could not load data: {loadError}</div>;
  }

  const ss = attendee ? STATUS_STYLE[attendee.status] : null;

  return (
    <div style={css("min-height: 100vh; background: #f6f7f9; font-family: Roboto, Helvetica, Arial, sans-serif; color: #1a1d21;")}>
      <header style={css("background: #ffffff; border-bottom: 1px solid #e3e6ea; padding: 0 20px;")}>
        <div style={css("max-width: 640px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 16px 0;")}>
          <div style={css("display: flex; align-items: center; gap: 12px;")}>
            <div style={css("width: 36px; height: 36px; border-radius: 9px; background: #a8261f; color: #fff; display: grid; place-items: center; font-size: 15px; font-weight: 500;")}>EO</div>
            <div style={css("font-size: 16px; font-weight: 500;")}>Event Ops</div>
          </div>
          <div style={css("display: flex; align-items: center; gap: 12px;")}>
            <span style={css("font-size: 12.5px; color: #8a919b;")}>{userEmail}</span>
            <button type="button" onClick={signOut} style={css("border: none; background: transparent; color: #6b7480; font-size: 13px; font-weight: 500; cursor: pointer; padding: 0;")}>Sign out</button>
          </div>
        </div>
      </header>

      <main style={css("max-width: 560px; margin: 0 auto; padding: 48px 20px;")}>
        <div style={css("font-size: 20px; font-weight: 500; letter-spacing: -0.3px; margin-bottom: 20px;")}>My registration</div>

        {!attendee && (
          <div style={css("background: #fff; border: 1px solid #e3e6ea; border-radius: 12px; padding: 32px; text-align: center;")}>
            <div style={css("font-size: 15px; font-weight: 500; color: #4a525b;")}>You haven't registered yet</div>
            <a href="/register" style={css("display: inline-flex; margin-top: 16px; height: 42px; padding: 0 20px; align-items: center; border: 1px solid #a8261f; background: #a8261f; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 500; text-decoration: none;")}>
              Register for a session
            </a>
          </div>
        )}

        {attendee && session && (
          <div style={css("background: #fff; border: 1px solid #e3e6ea; border-radius: 12px; padding: 24px;")}>
            <div style={css("display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;")}>
              <div>
                <div style={css("font-size: 17px; font-weight: 500;")}>Masterclass</div>
                <div style={css("font-size: 13.5px; color: #6b7480; margin-top: 4px;")}>{fmt(session.date, { weekday: "long", month: "long", day: "numeric" })} · {session.time}</div>
                <div style={css("font-size: 13.5px; color: #6b7480;")}>{session.room}</div>
              </div>
              <span style={css("display: inline-flex; align-items: center; height: 28px; padding: 0 12px; border-radius: 999px; font-size: 12.5px; font-weight: 500; background: " + ss.bg + "; color: " + ss.fg + ";")}>{ss.label}</span>
            </div>

            <div style={css("margin-top: 18px; padding-top: 18px; border-top: 1px solid #eceff2; font-size: 13.5px; color: #4a525b; display: flex; flex-direction: column; gap: 4px;")}>
              <div>{attendee.name}</div>
              <div>{attendee.email}</div>
              {attendee.phone && <div>{attendee.phone}</div>}
            </div>

            {error && (
              <div style={css("margin-top: 16px; padding: 10px 14px; border-radius: 8px; background: #fdf4e3; color: #8a5a12; font-size: 13px; font-weight: 500;")}>
                {error}
              </div>
            )}

            {attendee.status !== "cancelled" && (
              <button
                type="button"
                onClick={cancel}
                disabled={busy}
                style={css("margin-top: 20px; height: 40px; padding: 0 16px; border: 1px solid #d5dae0; background: #fff; color: #9b3025; border-radius: 8px; font-size: 13.5px; font-weight: 500; cursor: pointer;")}
              >
                {busy ? "Cancelling…" : "Cancel registration"}
              </button>
            )}

            {attendee.status === "cancelled" && (
              <a href="/register" style={css("display: inline-flex; margin-top: 20px; height: 40px; padding: 0 16px; align-items: center; border: 1px solid #a8261f; background: #a8261f; color: #fff; border-radius: 8px; font-size: 13.5px; font-weight: 500; text-decoration: none;")}>
                Register for another session
              </a>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
