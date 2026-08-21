import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "ADMIN" ? "/admin" : "/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper-100)" }}>
      <form onSubmit={handleSubmit} className="card" style={{ width: 380, padding: "2.2em" }}>
        <h1 style={{ fontSize: "1.4rem" }}>Sign in</h1>
        <p style={{ color: "var(--ink-500)", fontSize: "0.9rem", marginTop: 0, marginBottom: "1.6em" }}>
          Aptitude assessment platform
        </p>
        {error && <div className="error-banner">{error}</div>}
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          className="input"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginBottom: "1em" }}
        />
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          className="input"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: "1.4em" }}
        />
        <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <div style={{ marginTop: "1.4em", padding: "0.85em 1em", background: "var(--paper-100)", borderRadius: "var(--radius-sm)", fontSize: "0.82rem", color: "var(--ink-700)", border: "1px solid var(--line)", lineHeight: "1.45" }}>
          🔒 <strong>Administrator Managed Portal:</strong> Student profiles, grade allocations, and credentials are configured directly by administrators.
        </div>
      </form>
    </div>
  );
}
