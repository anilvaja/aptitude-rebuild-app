import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(form.name, form.email, form.password);
      setDone(true);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.details?.[0]?.message || err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper-100)" }}>
      <form onSubmit={handleSubmit} className="card" style={{ width: 400, padding: "2.2em" }}>
        <h1 style={{ fontSize: "1.4rem" }}>Create your account</h1>
        {error && <div className="error-banner">{error}</div>}
        {done ? (
          <p>Account created. Redirecting to sign in…</p>
        ) : (
          <>
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" className="input" required value={form.name} onChange={update("name")} style={{ marginBottom: "1em" }} />
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" required value={form.email} onChange={update("email")} style={{ marginBottom: "1em" }} />
            <label className="label" htmlFor="password">Password</label>
            <input id="password" className="input" type="password" required value={form.password} onChange={update("password")} style={{ marginBottom: "0.4em" }} />
            <p style={{ fontSize: "0.78rem", color: "var(--ink-500)", marginTop: 0, marginBottom: "1.4em" }}>
              At least 10 characters, with an uppercase letter, a lowercase letter, and a number.
            </p>
            <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
              {busy ? "Creating…" : "Create account"}
            </button>
          </>
        )}
        <p style={{ fontSize: "0.85rem", color: "var(--ink-500)", marginTop: "1.2em", textAlign: "center" }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
