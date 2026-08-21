import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../api/client";

export default function TestAnalytics() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/api/admin/analytics/tests/${id}`).then(setData).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="error-banner">⚠️ {error}</div>;
  if (!data) return <p style={{ padding: "2em", color: "var(--ink-500)" }}>Loading test analytics report…</p>;

  const totalAttempts = data.attempts?.length || 0;
  const avgScore = totalAttempts > 0
    ? (data.attempts.reduce((sum, a) => sum + (a.scoreAwarded || 0), 0) / totalAttempts).toFixed(1)
    : 0;

  return (
    <div style={{ maxWidth: "1020px", margin: "0 auto", paddingBottom: "3em" }}>
      {/* Navigation Breadcrumb */}
      <div style={{ marginBottom: "1.2em" }}>
        <Link to="/admin/tests" style={{ fontSize: "0.88rem", color: "var(--ink-500)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3em" }}>
          ← Back to Examination Papers
        </Link>
      </div>

      {/* Header */}
      <div style={{ marginBottom: "2em" }}>
        <h1 style={{ margin: "0 0 0.3em 0", fontSize: "1.75rem" }}>Exam Performance Analytics</h1>
        <p style={{ color: "var(--ink-500)", margin: 0, fontSize: "0.92rem" }}>
          Inspect question-level accuracy, item difficulty, and candidate submission records.
        </p>
      </div>

      {/* Analytics KPI Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.2em", marginBottom: "2.2em" }}>
        <div className="card" style={{ padding: "1.4em" }}>
          <div className="label">Total Submissions</div>
          <div className="mono" style={{ fontSize: "2rem", fontWeight: 700, color: "var(--ink-900)" }}>
            {totalAttempts}
          </div>
        </div>

        <div className="card" style={{ padding: "1.4em" }}>
          <div className="label">Average Score</div>
          <div className="mono" style={{ fontSize: "2rem", fontWeight: 700, color: "var(--brass-600)" }}>
            {avgScore} pts
          </div>
        </div>

        <div className="card" style={{ padding: "1.4em" }}>
          <div className="label">Questions in Pool</div>
          <div className="mono" style={{ fontSize: "2rem", fontWeight: 700, color: "#2563eb" }}>
            {data.perQuestion?.length || 0}
          </div>
        </div>
      </div>

      {/* Question Difficulty & Accuracy Table */}
      <div style={{ marginBottom: "2.5em" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.9em" }}>
          📊 Question Item Difficulty & Accuracy
        </h2>

        <div className="card" style={{ overflowX: "auto", borderRadius: "var(--radius-lg)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--paper-100)", borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: "0.9em 1.2em", fontSize: "0.82rem", textTransform: "uppercase", color: "var(--ink-600)" }}>#</th>
                <th style={{ padding: "0.9em 1.2em", fontSize: "0.82rem", textTransform: "uppercase", color: "var(--ink-600)" }}>Question Text</th>
                <th style={{ padding: "0.9em 1.2em", fontSize: "0.82rem", textTransform: "uppercase", color: "var(--ink-600)" }}>Attempts</th>
                <th style={{ padding: "0.9em 1.2em", fontSize: "0.82rem", textTransform: "uppercase", color: "var(--ink-600)", minWidth: "160px" }}>Accuracy Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.perQuestion.map((q, idx) => {
                const acc = q.accuracyPercent !== null && q.accuracyPercent !== undefined ? q.accuracyPercent : null;
                const accColor = acc === null ? "var(--ink-500)" : acc >= 75 ? "var(--ok-500)" : acc >= 40 ? "var(--brass-600)" : "var(--danger-500)";

                return (
                  <tr key={q.questionId} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td className="mono" style={{ padding: "1em 1.2em", color: "var(--ink-500)", fontWeight: 700 }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: "1em 1.2em", fontWeight: 500, color: "var(--ink-900)", maxWidth: "450px" }}>
                      {q.text}
                    </td>
                    <td className="mono" style={{ padding: "1em 1.2em", color: "var(--ink-700)", fontWeight: 600 }}>
                      {q.attemptedCount}
                    </td>
                    <td style={{ padding: "1em 1.2em" }}>
                      {acc !== null ? (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 700, color: accColor, marginBottom: "4px" }}>
                            <span>{acc}%</span>
                            <span style={{ fontWeight: 500, fontSize: "0.75rem", color: "var(--ink-500)" }}>
                              {acc >= 75 ? "Easy" : acc >= 40 ? "Moderate" : "Challenging"}
                            </span>
                          </div>
                          <div style={{ height: "6px", background: "var(--paper-100)", borderRadius: "999px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${acc}%`, background: accColor, borderRadius: "999px" }} />
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: "var(--ink-500)", fontSize: "0.82rem" }}>— Not yet attempted</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Submissions Records */}
      <div>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.9em" }}>
          👥 Candidate Submissions
        </h2>

        {data.attempts.length === 0 ? (
          <div className="card" style={{ padding: "3em", textAlign: "center", color: "var(--ink-500)" }}>
            No candidate submissions recorded yet for this exam.
          </div>
        ) : (
          <div className="card" style={{ overflowX: "auto", borderRadius: "var(--radius-lg)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "var(--paper-100)", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "0.9em 1.2em", fontSize: "0.82rem", textTransform: "uppercase", color: "var(--ink-600)" }}>Student</th>
                  <th style={{ padding: "0.9em 1.2em", fontSize: "0.82rem", textTransform: "uppercase", color: "var(--ink-600)" }}>Score Awarded</th>
                  <th style={{ padding: "0.9em 1.2em", fontSize: "0.82rem", textTransform: "uppercase", color: "var(--ink-600)" }}>Evaluation</th>
                  <th style={{ padding: "0.9em 1.2em", fontSize: "0.82rem", textTransform: "uppercase", color: "var(--ink-600)" }}>Submitted Date</th>
                </tr>
              </thead>
              <tbody>
                {data.attempts.map((a) => (
                  <tr key={a.attemptId} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "1em 1.2em" }}>
                      <div style={{ fontWeight: 700, color: "var(--ink-900)" }}>{a.student}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--ink-500)" }}>{a.email}</div>
                    </td>
                    <td className="mono" style={{ padding: "1em 1.2em", fontWeight: 700, fontSize: "1rem", color: "var(--ink-900)" }}>
                      {a.scoreAwarded} <span style={{ fontSize: "0.82rem", color: "var(--ink-500)", fontWeight: 400 }}>/ {a.totalMarks}</span>
                    </td>
                    <td style={{ padding: "1em 1.2em" }}>
                      {a.hasPendingReview ? (
                        <span className="badge badge-warn">Pending Review</span>
                      ) : (
                        <span className="badge badge-ok">✓ Graded</span>
                      )}
                    </td>
                    <td style={{ padding: "1em 1.2em", fontSize: "0.85rem", color: "var(--ink-600)" }}>
                      {a.submittedAt ? new Date(a.submittedAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
