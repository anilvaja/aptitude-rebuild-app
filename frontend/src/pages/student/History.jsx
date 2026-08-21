import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";

export default function History() {
  const [attempts, setAttempts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/api/attempts").then(setAttempts).catch((e) => setError(e.message));
  }, []);

  const total = attempts?.length || 0;
  const passedCount = attempts?.filter((a) => {
    if (!a.totalMarks || a.totalMarks === 0) return false;
    return (a.scoreAwarded / a.totalMarks) >= 0.72;
  }).length || 0;

  return (
    <div style={{ maxWidth: "880px", margin: "0 auto", paddingBottom: "3em" }}>
      {/* Header */}
      <div style={{ marginBottom: "2em" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6em", marginBottom: "0.3em" }}>
          <span style={{ fontSize: "1.4rem" }}>📜</span>
          <h1 style={{ margin: 0, fontSize: "1.75rem" }}>My Assessment History</h1>
        </div>
        <p style={{ color: "var(--ink-500)", margin: 0, fontSize: "0.92rem" }}>
          Review all your completed examination papers, score breakdown reports, and model solutions.
        </p>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}

      {/* Summary KPI Cards */}
      {attempts && attempts.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.2em", marginBottom: "2em" }}>
          <div className="card" style={{ padding: "1.4em" }}>
            <div className="label">Completed Tests</div>
            <div className="mono" style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--ink-900)" }}>
              {total}
            </div>
          </div>

          <div className="card" style={{ padding: "1.4em" }}>
            <div className="label">Passed Assessments</div>
            <div className="mono" style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--ok-500)" }}>
              {passedCount} <span style={{ fontSize: "1rem", color: "var(--ink-500)", fontWeight: 400 }}>/ {total}</span>
            </div>
          </div>

          <div className="card" style={{ padding: "1.4em" }}>
            <div className="label">Passing Rate</div>
            <div className="mono" style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--brass-600)" }}>
              {total > 0 ? `${Math.round((passedCount / total) * 100)}%` : "—"}
            </div>
          </div>
        </div>
      )}

      {/* Attempts List */}
      {!attempts ? (
        <p style={{ color: "var(--ink-500)" }}>Loading your test history records…</p>
      ) : attempts.length === 0 ? (
        <div className="card" style={{ padding: "4em 2em", textAlign: "center", color: "var(--ink-500)", borderRadius: "var(--radius-lg)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.4em" }}>📝</div>
          <h3 style={{ color: "var(--ink-800)", margin: "0 0 0.3em 0" }}>No Test Attempts Yet</h3>
          <p style={{ margin: "0 0 1.2em 0", fontSize: "0.92rem" }}>
            You haven't completed any assessments yet. Choose an exam from the available papers to begin!
          </p>
          <Link to="/" className="btn btn-primary" style={{ fontWeight: 700 }}>
            Browse Available Exams →
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1.2em" }}>
          {attempts.map((a) => {
            const pct = a.totalMarks > 0 ? Math.round((a.scoreAwarded / a.totalMarks) * 1000) / 10 : 0;
            const isPassed = pct >= 72.0;

            return (
              <div
                key={a.id}
                className="card card-interactive"
                style={{
                  padding: "1.5em 1.8em",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1.2em",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--line)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6em", marginBottom: "0.3em", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--ink-900)" }}>
                      {a.testTitle}
                    </span>
                    <span className={`badge ${isPassed ? "badge-ok" : "badge-neutral"}`} style={{ fontSize: "0.72rem" }}>
                      {isPassed ? "PASSED (≥72%)" : "NEEDS REVIEW"}
                    </span>
                    {a.status === "AUTO_SUBMITTED" && (
                      <span className="badge badge-warn" style={{ fontSize: "0.72rem" }}>
                        ⏱️ Auto-Submitted
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.84rem", color: "var(--ink-500)" }}>
                    Submitted: {a.submittedAt ? new Date(a.submittedAt).toLocaleString() : "—"}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1.4em" }}>
                  <div style={{ textAlign: "right" }}>
                    <div className="mono" style={{ fontSize: "1.35rem", fontWeight: 700, color: isPassed ? "var(--ok-500)" : "var(--ink-900)" }}>
                      {a.scoreAwarded ?? 0} <span style={{ fontSize: "0.9rem", color: "var(--ink-500)", fontWeight: 400 }}>/ {a.totalMarks ?? 0}</span>
                    </div>
                    <div className="mono" style={{ fontSize: "0.82rem", color: "var(--ink-500)" }}>
                      {pct}%
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.6em" }}>
                    <Link to={`/result/${a.id}`} className="btn btn-ghost" style={{ fontSize: "0.85rem", padding: "0.45em 0.85em", border: "1px solid var(--line)", fontWeight: 600 }}>
                      🔍 Review Report
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
