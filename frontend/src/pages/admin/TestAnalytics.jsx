import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../api/client";

export default function TestAnalytics() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/api/admin/analytics/tests/${id}`).then(setData);
  }, [id]);

  if (!data) return <p>Loading…</p>;

  return (
    <div>
      <Link to="/admin/tests" style={{ fontSize: "0.85rem", color: "var(--ink-500)" }}>← Back to tests</Link>
      <h1>Test analytics</h1>

      <h3>Question difficulty</h3>
      <div className="card" style={{ overflow: "hidden", marginBottom: "1.6em" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--paper-100)", textAlign: "left" }}>
              <th style={{ padding: "0.7em 1em" }}>Question</th>
              <th style={{ padding: "0.7em 1em" }}>Attempted</th>
              <th style={{ padding: "0.7em 1em" }}>Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {data.perQuestion.map((q) => (
              <tr key={q.questionId} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: "0.7em 1em" }}>{q.text}</td>
                <td className="mono" style={{ padding: "0.7em 1em" }}>{q.attemptedCount}</td>
                <td className="mono" style={{ padding: "0.7em 1em" }}>
                  {q.accuracyPercent === null ? "—" : `${q.accuracyPercent}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Student results</h3>
      <div className="card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--paper-100)", textAlign: "left" }}>
              <th style={{ padding: "0.7em 1em" }}>Student</th>
              <th style={{ padding: "0.7em 1em" }}>Score</th>
              <th style={{ padding: "0.7em 1em" }}>Status</th>
              <th style={{ padding: "0.7em 1em" }}>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {data.attempts.map((a) => (
              <tr key={a.attemptId} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: "0.7em 1em" }}>{a.student}<br /><span style={{ fontSize: "0.78rem", color: "var(--ink-500)" }}>{a.email}</span></td>
                <td className="mono" style={{ padding: "0.7em 1em" }}>{a.scoreAwarded} / {a.totalMarks}</td>
                <td style={{ padding: "0.7em 1em" }}>
                  {a.hasPendingReview ? <span className="badge badge-warn">Pending review</span> : <span className="badge badge-ok">Final</span>}
                </td>
                <td style={{ padding: "0.7em 1em", fontSize: "0.85rem", color: "var(--ink-500)" }}>
                  {a.submittedAt ? new Date(a.submittedAt).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
