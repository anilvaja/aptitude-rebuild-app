import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";

export default function History() {
  const [attempts, setAttempts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/api/attempts").then(setAttempts).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1>Your test history</h1>
      {error && <div className="error-banner">{error}</div>}
      {!attempts && <p>Loading…</p>}
      {attempts?.length === 0 && <p style={{ color: "var(--ink-500)" }}>You haven't completed any tests yet.</p>}
      <div style={{ display: "grid", gap: "0.8em" }}>
        {attempts?.map((a) => (
          <Link
            key={a.id}
            to={`/result/${a.id}`}
            className="card"
            style={{ padding: "1.2em 1.4em", display: "flex", justifyContent: "space-between", textDecoration: "none", color: "inherit" }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{a.testTitle}</div>
              <div style={{ fontSize: "0.82rem", color: "var(--ink-500)" }}>
                {a.submittedAt ? new Date(a.submittedAt).toLocaleString() : "—"}
                {a.status === "AUTO_SUBMITTED" && " · auto-submitted"}
              </div>
            </div>
            <div className="mono" style={{ fontSize: "1.1rem", fontWeight: 600, alignSelf: "center" }}>
              {a.scoreAwarded ?? "—"} / {a.totalMarks ?? "—"}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
