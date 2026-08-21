import { useEffect, useState } from "react";
import { api } from "../../api/client";

export default function ReviewQueue() {
  const [items, setItems] = useState(null);
  const [scores, setScores] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  function refresh() {
    api.get("/api/admin/review-queue").then(setItems);
  }
  useEffect(refresh, []);

  async function grade(item) {
    const marksAwarded = Number(scores[item.id]);
    if (Number.isNaN(marksAwarded)) return;
    setSavingId(item.id);
    setFeedback(null);
    try {
      await api.put(`/api/attempts/${item.attemptId}/answers/${item.questionId}/grade`, { marksAwarded });
      setFeedback(`Awarded ${marksAwarded} mark(s) for ${item.attempt.user.name}'s answer.`);
      refresh();
    } catch (err) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", paddingBottom: "3em" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.8em" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6em", marginBottom: "0.3em" }}>
          <span style={{ fontSize: "1.4rem" }}>✍️</span>
          <h1 style={{ margin: 0, fontSize: "1.75rem" }}>Descriptive Review Queue</h1>
        </div>
        <p style={{ color: "var(--ink-500)", margin: 0, fontSize: "0.92rem" }}>
          Evaluate and grade open-ended, architectural, and written responses submitted by candidates.
        </p>
      </div>

      {feedback && (
        <div
          style={{
            background: "rgba(34, 197, 94, 0.1)",
            color: "var(--ok-500)",
            padding: "0.8em 1.2em",
            borderRadius: "var(--radius-md)",
            marginBottom: "1.2em",
            fontWeight: 600,
            border: "1px solid var(--ok-500)",
          }}
        >
          ✓ {feedback}
        </div>
      )}

      {!items ? (
        <p style={{ color: "var(--ink-500)" }}>Loading pending submissions…</p>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: "4em 2em", textAlign: "center", color: "var(--ink-500)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.4em" }}>🎉</div>
          <h3 style={{ color: "var(--ink-800)", margin: "0 0 0.3em 0" }}>All Caught Up!</h3>
          <p style={{ margin: 0, fontSize: "0.92rem" }}>There are currently no descriptive answers waiting for evaluation.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1.4em" }}>
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="card"
              style={{
                padding: "1.8em 2em",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--line)",
                display: "grid",
                gap: "1em",
              }}
            >
              {/* Submission Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.6em" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6em", marginBottom: "0.3em" }}>
                    <span className="mono" style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--ink-500)" }}>
                      #{idx + 1}
                    </span>
                    <span className="badge badge-accent" style={{ fontSize: "0.76rem", fontWeight: 700 }}>
                      🎓 {item.attempt.test.title}
                    </span>
                    {item.question.subject && (
                      <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>
                        📚 {item.question.subject}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.88rem", color: "var(--ink-600)" }}>
                    <strong>Candidate:</strong> {item.attempt.user.name} ({item.attempt.user.email})
                  </div>
                </div>

                <div className="mono badge badge-neutral" style={{ fontSize: "0.82rem" }}>
                  Max Marks: {item.question.marks} pt{item.question.marks !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Question Statement */}
              <div style={{ fontSize: "1.02rem", fontWeight: 600, color: "var(--ink-900)", lineHeight: "1.45" }}>
                {item.question.text}
              </div>

              {/* Candidate Submitted Response */}
              <div>
                <div className="label" style={{ fontSize: "0.78rem" }}>Candidate's Written Response:</div>
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    background: "var(--paper-100)",
                    padding: "1.2em",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.95rem",
                    color: "var(--ink-900)",
                    lineHeight: "1.5",
                    borderLeft: "3px solid var(--brass-500)",
                  }}
                >
                  {item.descriptiveAnswer || <span style={{ color: "var(--ink-500)", fontStyle: "italic" }}>No response submitted</span>}
                </div>
              </div>

              {/* Model Solution if available */}
              {item.question.solution && (
                <div style={{ background: "rgba(201, 150, 47, 0.08)", padding: "0.8em 1em", borderRadius: "var(--radius-sm)", border: "1px solid var(--brass-500)", fontSize: "0.84rem" }}>
                  <strong style={{ color: "var(--brass-600)" }}>💡 Model Answer / Rubric:</strong> {item.question.solution}
                </div>
              )}

              {/* Grading Input Form */}
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.8em", paddingTop: "0.6em", borderTop: "1px solid var(--line)" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink-700)" }}>
                  Assign Score:
                </span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max={item.question.marks}
                  step="0.5"
                  placeholder={`0 to ${item.question.marks}`}
                  style={{ width: "130px", fontWeight: 700 }}
                  value={scores[item.id] !== undefined ? scores[item.id] : ""}
                  onChange={(e) => setScores((s) => ({ ...s, [item.id]: e.target.value }))}
                />
                <button
                  className="btn btn-primary"
                  disabled={savingId === item.id || scores[item.id] === undefined || scores[item.id] === ""}
                  onClick={() => grade(item)}
                  style={{ fontWeight: 700, padding: "0.55em 1.3em" }}
                >
                  {savingId === item.id ? "Saving…" : "Submit Grade ✓"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
