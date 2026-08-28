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

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setError("");
    setStatus("saving");
    const supabase = supabaseBrowser();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setStatus("idle");
      setError(updateError.message);
      return;
    }
    setStatus("saved");
    window.location.href = "/";
  }

  return (
    <div style={css("min-height: 100vh; background: #f6f7f9; display: flex; align-items: center; justify-content: center; padding: 20px; font-family: Roboto, Helvetica, Arial, sans-serif;")}>
      <div style={css("width: 100%; max-width: 380px; background: #fff; border: 1px solid #e3e6ea; border-radius: 14px; padding: 32px 28px;")}>
        <div style={css("display: flex; align-items: center; gap: 12px; margin-bottom: 22px;")}>
          <div style={css("width: 36px; height: 36px; border-radius: 9px; background: #a8261f; color: #fff; display: grid; place-items: center; font-size: 15px; font-weight: 500;")}>EO</div>
          <div style={css("font-size: 17px; font-weight: 500; color: #1a1d21;")}>Event Ops</div>
        </div>

        <form onSubmit={submit}>
          <div style={css("font-size: 15px; font-weight: 500; color: #1a1d21; margin-bottom: 4px;")}>Set your password</div>
          <div style={css("font-size: 13px; color: #6b7480; margin-bottom: 18px;")}>You're signed in — choose a password for future sign-ins.</div>

          <label style={css("display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #4a525b;")}>
            New password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoFocus
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
            disabled={status === "saving"}
            style={css("margin-top: 18px; width: 100%; height: 42px; border: 1px solid #a8261f; background: #a8261f; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;")}
          >
            {status === "saving" ? "Saving…" : "Save password and continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
