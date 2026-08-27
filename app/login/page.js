"use client";

import { useState } from "react";
import { supabaseBrowser } from "../../lib/supabaseBrowser";

const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "";

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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    if (ALLOWED_DOMAIN && !trimmed.endsWith("@" + ALLOWED_DOMAIN)) {
      setError("Access is restricted to @" + ALLOWED_DOMAIN + " email addresses.");
      return;
    }
    setError("");
    setStatus("sending");
    const supabase = supabaseBrowser();
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: window.location.origin + "/auth/callback" }
    });
    if (sendError) {
      setStatus("idle");
      setError(sendError.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <div style={css("min-height: 100vh; background: #f6f7f9; display: flex; align-items: center; justify-content: center; padding: 20px; font-family: Roboto, Helvetica, Arial, sans-serif;")}>
      <div style={css("width: 100%; max-width: 380px; background: #fff; border: 1px solid #e3e6ea; border-radius: 14px; padding: 32px 28px;")}>
        <div style={css("display: flex; align-items: center; gap: 12px; margin-bottom: 22px;")}>
          <div style={css("width: 36px; height: 36px; border-radius: 9px; background: #a8261f; color: #fff; display: grid; place-items: center; font-size: 15px; font-weight: 500;")}>EO</div>
          <div style={css("font-size: 17px; font-weight: 500; color: #1a1d21;")}>Event Ops</div>
        </div>

        {status === "sent" ? (
          <div>
            <div style={css("font-size: 15px; font-weight: 500; color: #1a1d21;")}>Check your inbox</div>
            <div style={css("font-size: 13.5px; color: #6b7480; margin-top: 8px; line-height: 1.5;")}>
              We sent a sign-in link to {email.trim()}. Open it on this device to finish signing in.
            </div>
            <button
              type="button"
              onClick={() => { setStatus("idle"); setEmail(""); }}
              style={css("margin-top: 18px; height: 38px; padding: 0 14px; border: 1px solid #d5dae0; background: #fff; color: #4a525b; border-radius: 8px; font-size: 13.5px; font-weight: 500; cursor: pointer;")}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={css("font-size: 15px; font-weight: 500; color: #1a1d21; margin-bottom: 4px;")}>Sign in</div>
            <div style={css("font-size: 13px; color: #6b7480; margin-bottom: 18px;")}>
              {ALLOWED_DOMAIN
                ? "Enter your @" + ALLOWED_DOMAIN + " email — we'll send you a one-time sign-in link."
                : "Enter your email — we'll send you a one-time sign-in link."}
            </div>
            <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b;")}>
              Email address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={ALLOWED_DOMAIN ? "you@" + ALLOWED_DOMAIN : "you@example.com"}
                autoFocus
                style={css("height: 42px; padding: 0 12px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; color: #1a1d21;")}
              />
            </label>

            {error && (
              <div style={css("margin-top: 12px; padding: 10px 14px; border-radius: 8px; background: #fdf4e3; color: #8a5a12; font-size: 13px; font-weight: 500;")}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              style={css("margin-top: 18px; width: 100%; height: 42px; border: 1px solid #a8261f; background: #a8261f; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;")}
            >
              {status === "sending" ? "Sending…" : "Send sign-in link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
