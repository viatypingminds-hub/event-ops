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

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function LoginPage() {
  const [mode, setMode] = useState("password");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState("");

  const [linkEmail, setLinkEmail] = useState("");
  const [linkStatus, setLinkStatus] = useState("idle");
  const [linkError, setLinkError] = useState("");

  async function submitPassword(e) {
    e.preventDefault();
    if (!isValidEmail(email.trim())) { setSignInError("Enter a valid email address."); return; }
    if (!password) { setSignInError("Enter your password."); return; }
    setSignInError("");
    setSigningIn(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSigningIn(false);
    if (error) {
      setSignInError("Incorrect email or password.");
      return;
    }
    window.location.href = "/";
  }

  async function submitLink(e) {
    e.preventDefault();
    const trimmed = linkEmail.trim().toLowerCase();
    if (!isValidEmail(trimmed)) { setLinkError("Enter a valid email address."); return; }
    if (ALLOWED_DOMAIN && !trimmed.endsWith("@" + ALLOWED_DOMAIN)) {
      setLinkError("Access is restricted to @" + ALLOWED_DOMAIN + " email addresses.");
      return;
    }
    setLinkError("");
    setLinkStatus("sending");
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: window.location.origin + "/auth/callback?next=/set-password" }
    });
    if (error) {
      setLinkStatus("idle");
      setLinkError(error.message);
      return;
    }
    setLinkStatus("sent");
  }

  return (
    <div style={css("min-height: 100vh; background: #f6f7f9; display: flex; align-items: center; justify-content: center; padding: 20px; font-family: Roboto, Helvetica, Arial, sans-serif;")}>
      <div style={css("width: 100%; max-width: 380px; background: #fff; border: 1px solid #e3e6ea; border-radius: 14px; padding: 32px 28px;")}>
        <div style={css("display: flex; align-items: center; gap: 12px; margin-bottom: 22px;")}>
          <div style={css("width: 36px; height: 36px; border-radius: 9px; background: #a8261f; color: #fff; display: grid; place-items: center; font-size: 15px; font-weight: 500;")}>EO</div>
          <div style={css("font-size: 17px; font-weight: 500; color: #1a1d21;")}>Event Ops</div>
        </div>

        {mode === "password" && (
          <form onSubmit={submitPassword}>
            <div style={css("font-size: 15px; font-weight: 500; color: #1a1d21; margin-bottom: 4px;")}>Sign in</div>
            <div style={css("font-size: 13px; color: #6b7480; margin-bottom: 18px;")}>Enter your email and password.</div>

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
            <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b; margin-top: 14px;")}>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={css("height: 42px; padding: 0 12px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; color: #1a1d21;")}
              />
            </label>

            {signInError && (
              <div style={css("margin-top: 12px; padding: 10px 14px; border-radius: 8px; background: #fdf4e3; color: #8a5a12; font-size: 13px; font-weight: 500;")}>
                {signInError}
              </div>
            )}

            <button
              type="submit"
              disabled={signingIn}
              style={css("margin-top: 18px; width: 100%; height: 42px; border: 1px solid #a8261f; background: #a8261f; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;")}
            >
              {signingIn ? "Signing in…" : "Sign in"}
            </button>

            <button
              type="button"
              onClick={() => { setMode("link"); setSignInError(""); }}
              style={css("margin-top: 14px; width: 100%; height: 36px; border: none; background: transparent; color: #6b7480; font-size: 13px; font-weight: 500; cursor: pointer;")}
            >
              First time here, or forgot your password?
            </button>
          </form>
        )}

        {mode === "link" && linkStatus !== "sent" && (
          <form onSubmit={submitLink}>
            <div style={css("font-size: 15px; font-weight: 500; color: #1a1d21; margin-bottom: 4px;")}>Set up or reset your password</div>
            <div style={css("font-size: 13px; color: #6b7480; margin-bottom: 18px;")}>
              {ALLOWED_DOMAIN
                ? "Enter your @" + ALLOWED_DOMAIN + " email — we'll send you a link to set your password."
                : "Enter your email — we'll send you a link to set your password."}
            </div>
            <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b;")}>
              Email address
              <input
                type="email"
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                placeholder={ALLOWED_DOMAIN ? "you@" + ALLOWED_DOMAIN : "you@example.com"}
                autoFocus
                style={css("height: 42px; padding: 0 12px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; color: #1a1d21;")}
              />
            </label>

            {linkError && (
              <div style={css("margin-top: 12px; padding: 10px 14px; border-radius: 8px; background: #fdf4e3; color: #8a5a12; font-size: 13px; font-weight: 500;")}>
                {linkError}
              </div>
            )}

            <button
              type="submit"
              disabled={linkStatus === "sending"}
              style={css("margin-top: 18px; width: 100%; height: 42px; border: 1px solid #a8261f; background: #a8261f; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;")}
            >
              {linkStatus === "sending" ? "Sending…" : "Send me a link"}
            </button>

            <button
              type="button"
              onClick={() => { setMode("password"); setLinkError(""); }}
              style={css("margin-top: 14px; width: 100%; height: 36px; border: none; background: transparent; color: #6b7480; font-size: 13px; font-weight: 500; cursor: pointer;")}
            >
              Back to sign in
            </button>
          </form>
        )}

        {mode === "link" && linkStatus === "sent" && (
          <div>
            <div style={css("font-size: 15px; font-weight: 500; color: #1a1d21;")}>Check your inbox</div>
            <div style={css("font-size: 13.5px; color: #6b7480; margin-top: 8px; line-height: 1.5;")}>
              We sent a link to {linkEmail.trim()}. Open it on this device to set your password.
            </div>
            <button
              type="button"
              onClick={() => { setMode("password"); setLinkStatus("idle"); setLinkEmail(""); }}
              style={css("margin-top: 18px; height: 38px; padding: 0 14px; border: 1px solid #d5dae0; background: #fff; color: #4a525b; border-radius: 8px; font-size: 13.5px; font-weight: 500; cursor: pointer;")}
            >
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
