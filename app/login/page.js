"use client";

import { useState } from "react";
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

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function getNextParam() {
  return new URLSearchParams(window.location.search).get("next") || "";
}

async function postSignInRedirect() {
  const nextParam = getNextParam();
  if (nextParam && nextParam.startsWith("/")) {
    window.location.href = nextParam;
    return;
  }
  const { data: { user } } = await supabaseBrowser().auth.getUser();
  const { data: profile } = await supabaseBrowser().from("profiles").select("role").eq("id", user.id).single();
  window.location.href = profile?.role === "admin" ? "/dashboard" : "/my-registration";
}

export default function LoginPage() {
  const [mode, setMode] = useState("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [signupSent, setSignupSent] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState("idle");
  const [resetError, setResetError] = useState("");

  function switchMode(next) {
    setMode(next);
    setError("");
    setSignupSent(false);
  }

  async function submitSignIn(e) {
    e.preventDefault();
    if (!isValidEmail(email.trim())) { setError("Enter a valid email address."); return; }
    if (!password) { setError("Enter your password."); return; }
    setError("");
    setBusy(true);
    const { error: signInError } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setBusy(false);
      setError("Incorrect email or password.");
      return;
    }
    await postSignInRedirect();
  }

  async function submitSignUp(e) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) { setError("Enter a valid email address."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setError("");
    setBusy(true);
    const nextParam = getNextParam();
    const redirectUrl = window.location.origin + "/auth/callback" + (nextParam ? "?next=" + encodeURIComponent(nextParam) : "");
    const { error: signUpError } = await supabaseBrowser().auth.signUp({
      email: trimmed,
      password,
      options: { emailRedirectTo: redirectUrl }
    });
    setBusy(false);
    if (signUpError) { setError(signUpError.message); return; }
    setSignupSent(true);
  }

  async function submitReset(e) {
    e.preventDefault();
    const trimmed = resetEmail.trim();
    if (!isValidEmail(trimmed)) { setResetError("Enter a valid email address."); return; }
    setResetError("");
    setResetStatus("sending");
    const { error: resetErr } = await supabaseBrowser().auth.resetPasswordForEmail(trimmed, {
      redirectTo: window.location.origin + "/auth/callback?next=/set-password"
    });
    if (resetErr) {
      setResetStatus("idle");
      setResetError(resetErr.message);
      return;
    }
    setResetStatus("sent");
  }

  return (
    <div style={css("min-height: 100vh; background: #f6f7f9; display: flex; align-items: center; justify-content: center; padding: 20px; font-family: Roboto, Helvetica, Arial, sans-serif;")}>
      <div style={css("width: 100%; max-width: 380px; background: #fff; border: 1px solid #e3e6ea; border-radius: 14px; padding: 32px 28px;")}>
        <div style={css("display: flex; align-items: center; gap: 12px; margin-bottom: 22px;")}>
          <div style={css("width: 36px; height: 36px; border-radius: 9px; background: #a8261f; color: #fff; display: grid; place-items: center; font-size: 15px; font-weight: 500;")}>EO</div>
          <div style={css("font-size: 17px; font-weight: 500; color: #1a1d21;")}>Event Ops</div>
        </div>

        {mode === "signin" && (
          <form onSubmit={submitSignIn}>
            <div style={css("font-size: 15px; font-weight: 500; color: #1a1d21; margin-bottom: 4px;")}>Sign in</div>
            <div style={css("font-size: 13px; color: #6b7480; margin-bottom: 18px;")}>Enter your email and password.</div>

            <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b;")}>
              Email address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
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

            {error && (
              <div style={css("margin-top: 12px; padding: 10px 14px; border-radius: 8px; background: #fdf4e3; color: #8a5a12; font-size: 13px; font-weight: 500;")}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              style={css("margin-top: 18px; width: 100%; height: 42px; border: 1px solid #a8261f; background: #a8261f; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;")}
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>

            <div style={css("display: flex; align-items: center; justify-content: space-between; margin-top: 14px;")}>
              <button type="button" onClick={() => switchMode("signup")} style={css("border: none; background: transparent; color: #a8261f; font-size: 13px; font-weight: 500; cursor: pointer; padding: 0;")}>
                Create an account
              </button>
              <button
                type="button"
                onClick={() => { setMode("reset"); setResetError(""); setResetStatus("idle"); }}
                style={css("border: none; background: transparent; color: #6b7480; font-size: 13px; font-weight: 500; cursor: pointer; padding: 0;")}
              >
                Forgot password?
              </button>
            </div>
          </form>
        )}

        {mode === "signup" && !signupSent && (
          <form onSubmit={submitSignUp}>
            <div style={css("font-size: 15px; font-weight: 500; color: #1a1d21; margin-bottom: 4px;")}>Create an account</div>
            <div style={css("font-size: 13px; color: #6b7480; margin-bottom: 18px;")}>Sign up with your email and a password.</div>

            <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b;")}>
              Email address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
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
                placeholder="At least 8 characters"
                style={css("height: 42px; padding: 0 12px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; color: #1a1d21;")}
              />
            </label>
            <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b; margin-top: 14px;")}>
              Confirm password
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Retype your password"
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
              disabled={busy}
              style={css("margin-top: 18px; width: 100%; height: 42px; border: 1px solid #a8261f; background: #a8261f; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;")}
            >
              {busy ? "Creating account…" : "Create account"}
            </button>

            <button
              type="button"
              onClick={() => switchMode("signin")}
              style={css("margin-top: 14px; width: 100%; height: 36px; border: none; background: transparent; color: #6b7480; font-size: 13px; font-weight: 500; cursor: pointer;")}
            >
              Already have an account? Sign in
            </button>
          </form>
        )}

        {mode === "signup" && signupSent && (
          <div>
            <div style={css("font-size: 15px; font-weight: 500; color: #1a1d21;")}>Confirm your email</div>
            <div style={css("font-size: 13.5px; color: #6b7480; margin-top: 8px; line-height: 1.5;")}>
              We sent a confirmation link to {email.trim()}. Open it to activate your account, then sign in.
            </div>
            <button
              type="button"
              onClick={() => switchMode("signin")}
              style={css("margin-top: 18px; height: 38px; padding: 0 14px; border: 1px solid #d5dae0; background: #fff; color: #4a525b; border-radius: 8px; font-size: 13.5px; font-weight: 500; cursor: pointer;")}
            >
              Back to sign in
            </button>
          </div>
        )}

        {mode === "reset" && resetStatus !== "sent" && (
          <form onSubmit={submitReset}>
            <div style={css("font-size: 15px; font-weight: 500; color: #1a1d21; margin-bottom: 4px;")}>Reset your password</div>
            <div style={css("font-size: 13px; color: #6b7480; margin-bottom: 18px;")}>Enter your email — we'll send you a link to choose a new password.</div>

            <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b;")}>
              Email address
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                style={css("height: 42px; padding: 0 12px; border: 1px solid #d5dae0; border-radius: 8px; font-size: 14px; color: #1a1d21;")}
              />
            </label>

            {resetError && (
              <div style={css("margin-top: 12px; padding: 10px 14px; border-radius: 8px; background: #fdf4e3; color: #8a5a12; font-size: 13px; font-weight: 500;")}>
                {resetError}
              </div>
            )}

            <button
              type="submit"
              disabled={resetStatus === "sending"}
              style={css("margin-top: 18px; width: 100%; height: 42px; border: 1px solid #a8261f; background: #a8261f; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;")}
            >
              {resetStatus === "sending" ? "Sending…" : "Send reset link"}
            </button>

            <button
              type="button"
              onClick={() => switchMode("signin")}
              style={css("margin-top: 14px; width: 100%; height: 36px; border: none; background: transparent; color: #6b7480; font-size: 13px; font-weight: 500; cursor: pointer;")}
            >
              Back to sign in
            </button>
          </form>
        )}

        {mode === "reset" && resetStatus === "sent" && (
          <div>
            <div style={css("font-size: 15px; font-weight: 500; color: #1a1d21;")}>Check your inbox</div>
            <div style={css("font-size: 13.5px; color: #6b7480; margin-top: 8px; line-height: 1.5;")}>
              We sent a password reset link to {resetEmail.trim()}. Open it on this device to choose a new password.
            </div>
            <button
              type="button"
              onClick={() => switchMode("signin")}
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
