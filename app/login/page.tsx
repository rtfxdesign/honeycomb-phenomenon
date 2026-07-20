"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      window.location.assign("/");
      return;
    }

    const result = await response.json().catch(() => ({ error: "Please try again." }));
    setError(result.error || "Please try again.");
    setLoading(false);
  };

  return (
    <main className="login-page">
      <div className="login-texture" aria-hidden="true" />
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-mark" aria-hidden="true"><i /><i /><i /></div>
        <p className="login-kicker">Private archive</p>
        <h1 id="login-title">Enter the<br /><em>Honeycomb.</em></h1>
        <p className="login-copy">This living archive is shared by invitation. Enter the password to continue.</p>
        <form onSubmit={submit}>
          <label htmlFor="password">Password</label>
          <div className="login-field">
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              required
              aria-describedby={error ? "login-error" : undefined}
            />
            <button type="submit" disabled={loading}>{loading ? "Opening…" : "Enter"}<span aria-hidden="true">→</span></button>
          </div>
          {error && <p className="login-error" id="login-error" role="alert">{error}</p>}
        </form>
        <p className="login-note"><span>◆</span> Your session stays unlocked for 30 days on this device.</p>
      </section>
    </main>
  );
}
