import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api } from "../../api/client";

export default function Result() {
  const { id } = useParams();
  const location = useLocation();
  const [attempt, setAttempt] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("ALL"); // ALL | CORRECT | INCORRECT | UNANSWERED

  useEffect(() => {
    api.get(`/api/attempts/${id}`).then(setAttempt).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="error-banner">{error}</div>;
  if (!attempt) return <p style={{ padding: "2em", color: "var(--ink-500)" }}>Loading result report…</p>;

  const r = attempt.result;
  const questions = attempt.questions || [];
  const percent = r?.totalMarks && r.totalMarks > 0 
    ? Math.max(0, Math.round((r.scoreAwarded / r.totalMarks) * 1000) / 10) 
    : 0;
  const isPassed = percent >= 72.0;
  const hasDescriptive = questions.some((q) => q.type === "DESCRIPTIVE");

  const filteredQuestions = questions.filter((q) => {
    if (filter === "ALL") return true;
    const isAnswered = q.savedAnswer && (q.savedAnswer.selectedChoice || q.savedAnswer.descriptiveAnswer);
    if (filter === "UNANSWERED") return !isAnswered;
    if (filter === "CORRECT") return q.savedAnswer?.isCorrect === true;
    if (filter === "INCORRECT") return isAnswered && q.savedAnswer?.isCorrect === false;
    return true;
  });

  return (
    <div style={{ maxWidth: "920px", margin: "0 auto", paddingBottom: "4em" }}>
      {/* Navigation Breadcrumb */}
      <div style={{ marginBottom: "1.2em", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/history" style={{ fontSize: "0.9rem", color: "var(--ink-500)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3em" }}>
          ← Back to Test History
        </Link>
        <button onClick={() => window.print()} className="btn btn-ghost" style={{ fontSize: "0.85rem", padding: "0.4em 0.8em" }}>
          🖨️ Print / Save PDF
        </button>
      </div>

      {location.state?.auto && (
        <div className="error-banner" style={{ background: "var(--warn-100)", color: "var(--warn-500)", border: "1px solid var(--warn-500)" }}>
          ⏱️ Time ran out — your test was submitted automatically.
        </div>
      )}

      {/* Header Banner */}
      <div style={{ marginBottom: "1.6em" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8em", flexWrap: "wrap", marginBottom: "0.4em" }}>
          <h1 style={{ margin: 0 }}>{attempt.testTitle}</h1>
          <span className={`badge ${attempt.status === "AUTO_SUBMITTED" ? "badge-warn" : "badge-neutral"}`}>
            {attempt.status === "AUTO_SUBMITTED" ? "Auto-Submitted" : "Completed"}
          </span>
        </div>
        <div style={{ fontSize: "0.88rem", color: "var(--ink-500)" }}>
          Submitted on {attempt.startedAt ? new Date(attempt.startedAt).toLocaleString() : "—"} · Duration: {Math.round(attempt.durationSeconds / 60)} mins
        </div>
      </div>

      {/* Score Summary Overview Card */}
      <div className="card" style={{ padding: "1.8em 2em", marginBottom: "2em", border: "1px solid var(--line)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "1.6em", alignItems: "center" }}>
          {/* Total Score */}
          <div style={{ borderRight: "1px solid var(--line)", paddingRight: "1.2em" }}>
            <div className="label">Final Score</div>
            <div className="mono" style={{ fontSize: "2.2rem", fontWeight: 700, color: isPassed ? "var(--ok-500)" : "var(--ink-900)" }}>
              {r?.scoreAwarded ?? 0} <span style={{ fontSize: "1.2rem", color: "var(--ink-500)", fontWeight: 400 }}>/ {r?.totalMarks ?? 0}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6em", marginTop: "0.4em" }}>
              <span className="mono" style={{ fontWeight: 600, fontSize: "1.1rem" }}>{percent}%</span>
              <span className={`badge ${isPassed ? "badge-ok" : "badge-danger"}`}>
                {isPassed ? "PASSED (≥ 72%)" : "NEEDS REVIEW (< 72%)"}
              </span>
            </div>
          </div>

          {/* Correct Count */}
          <div>
            <div className="label">Correct Answers</div>
            <div className="mono" style={{ fontSize: "1.8rem", fontWeight: 600, color: "var(--ok-500)" }}>
              {r?.correctCount ?? 0}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--ok-500)", marginTop: "0.2em" }}>
              +{r?.correctCount ?? 0} marks gained
            </div>
          </div>

          {/* Incorrect Count */}
          <div>
            <div className="label">Incorrect Answers</div>
            <div className="mono" style={{ fontSize: "1.8rem", fontWeight: 600, color: "var(--danger-500)" }}>
              {r?.incorrectCount ?? 0}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--danger-500)", marginTop: "0.2em" }}>
              -{(r?.incorrectCount ? r.incorrectCount * 0.25 : 0).toFixed(2)} negative penalty
            </div>
          </div>

          {/* Unanswered Count */}
          <div>
            <div className="label">Unanswered</div>
            <div className="mono" style={{ fontSize: "1.8rem", fontWeight: 600, color: "var(--ink-500)" }}>
              {r?.unansweredCount ?? 0}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--ink-500)", marginTop: "0.2em" }}>
              0 marks awarded
            </div>
          </div>
        </div>

        {hasDescriptive && (
          <div style={{ marginTop: "1.4em", paddingTop: "1.2em", borderTop: "1px dashed var(--line)", fontSize: "0.88rem", color: "var(--ink-500)" }}>
            ℹ️ This test includes written-answer questions. The score above reflects auto-graded questions until an instructor reviews the descriptive answers.
          </div>
        )}
      </div>

      {/* Questions Filter Navigation Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2em", flexWrap: "wrap", gap: "0.8em" }}>
        <h2 style={{ fontSize: "1.3rem", margin: 0 }}>
          Detailed Question Review ({questions.length})
        </h2>
        <div style={{ display: "inline-flex", background: "var(--paper-100)", padding: "4px", borderRadius: "var(--radius-sm)", gap: "4px" }}>
          {[
            { key: "ALL", label: `All (${questions.length})` },
            { key: "CORRECT", label: `Correct (${r?.correctCount ?? 0})` },
            { key: "INCORRECT", label: `Incorrect (${r?.incorrectCount ?? 0})` },
            { key: "UNANSWERED", label: `Unanswered (${r?.unansweredCount ?? 0})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                border: "none",
                background: filter === tab.key ? "#fff" : "transparent",
                color: filter === tab.key ? "var(--ink-900)" : "var(--ink-500)",
                fontWeight: filter === tab.key ? 700 : 500,
                padding: "0.4em 0.8em",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.82rem",
                cursor: "pointer",
                boxShadow: filter === tab.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s ease"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List of Questions with All Options, Selected Choice, Correct Answer & Explanations */}
      <div style={{ display: "grid", gap: "1.6em" }}>
        {filteredQuestions.length === 0 ? (
          <div className="card" style={{ padding: "3em", textAlign: "center", color: "var(--ink-500)" }}>
            No questions match the selected filter.
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const studentSelected = q.savedAnswer?.selectedChoice;
            const isCorrect = q.savedAnswer?.isCorrect === true;
            const isAnswered = Boolean(studentSelected || q.savedAnswer?.descriptiveAnswer);

            return (
              <div
                key={q.id}
                className="card"
                style={{
                  padding: "1.8em",
                  borderLeft: isCorrect
                    ? "6px solid var(--ok-500)"
                    : isAnswered
                    ? "6px solid var(--danger-500)"
                    : "6px solid var(--ink-500)",
                }}
              >
                {/* Question Header Meta */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.9em", flexWrap: "wrap", gap: "0.5em" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6em", flexWrap: "wrap" }}>
                    <span className="mono" style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--ink-900)" }}>
                      Question #{q.index}
                    </span>
                    {q.subject && (
                      <span className="badge badge-accent" style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                        📚 {q.subject}
                      </span>
                    )}
                    {q.category && (
                      <span className="badge badge-neutral" style={{ fontSize: "0.75rem", textTransform: "none", fontWeight: 600 }}>
                        🏷️ {q.category}
                      </span>
                    )}
                    {q.subCategory && (
                      <span className="badge badge-neutral" style={{ fontSize: "0.75rem", textTransform: "none", background: "var(--paper-100)" }}>
                        🔹 {q.subCategory}
                      </span>
                    )}
                    <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>
                      {q.difficulty}
                    </span>
                  </div>

                  {/* Status Indicator Pill */}
                  <div>
                    {isCorrect ? (
                      <span className="badge badge-ok" style={{ fontSize: "0.82rem", padding: "0.3em 0.8em" }}>
                        ✓ Correct (+{q.marks} pt)
                      </span>
                    ) : isAnswered ? (
                      <span className="badge badge-danger" style={{ fontSize: "0.82rem", padding: "0.3em 0.8em" }}>
                        ✗ Incorrect (-{q.negativeMarks} pt)
                      </span>
                    ) : (
                      <span className="badge badge-neutral" style={{ fontSize: "0.82rem", padding: "0.3em 0.8em" }}>
                        ⚪ Not Answered (0 pt)
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Statement */}
                <div style={{ fontSize: "1.05rem", lineHeight: "1.55", fontWeight: 500, color: "var(--ink-900)", marginBottom: "1.2em" }}>
                  {q.text}
                </div>

                {/* MCQ Options Breakdown */}
                {q.type === "MCQ" && q.choices && (
                  <div style={{ display: "grid", gap: "0.65em", marginBottom: "1.3em" }}>
                    {Object.entries(q.choices)
                      .filter(([_, choiceText]) => Boolean(choiceText))
                      .map(([choiceKey, choiceText]) => {
                        const isThisCorrect = choiceKey === q.correctChoice;
                        const isThisStudentChoice = choiceKey === studentSelected;

                        let borderStyle = "1px solid var(--line)";
                        let bgStyle = "#fff";
                        let tag = null;

                        if (isThisCorrect && isThisStudentChoice) {
                          borderStyle = "2px solid var(--ok-500)";
                          bgStyle = "var(--ok-100)";
                          tag = (
                            <span className="badge badge-ok" style={{ fontSize: "0.72rem" }}>
                              ✓ Your Answer & Correct
                            </span>
                          );
                        } else if (isThisCorrect) {
                          borderStyle = "2px solid var(--ok-500)";
                          bgStyle = "rgba(47, 122, 77, 0.08)";
                          tag = (
                            <span className="badge badge-ok" style={{ fontSize: "0.72rem" }}>
                              ✓ Correct Answer
                            </span>
                          );
                        } else if (isThisStudentChoice) {
                          borderStyle = "2px solid var(--danger-500)";
                          bgStyle = "var(--danger-100)";
                          tag = (
                            <span className="badge badge-danger" style={{ fontSize: "0.72rem" }}>
                              ✗ Your Choice
                            </span>
                          );
                        }

                        return (
                          <div
                            key={choiceKey}
                            style={{
                              border: borderStyle,
                              background: bgStyle,
                              borderRadius: "var(--radius-sm)",
                              padding: "0.8em 1em",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: "0.8em",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div style={{ display: "flex", gap: "0.8em", alignItems: "flex-start" }}>
                              <span
                                className="mono"
                                style={{
                                  fontWeight: 700,
                                  color: isThisCorrect ? "var(--ok-500)" : isThisStudentChoice ? "var(--danger-500)" : "var(--ink-500)",
                                  minWidth: "1.4em",
                                }}
                              >
                                {choiceKey}.
                              </span>
                              <span style={{ fontSize: "0.95rem", color: "var(--ink-900)", lineHeight: "1.4" }}>
                                {choiceText}
                              </span>
                            </div>
                            {tag && <div style={{ flexShrink: 0 }}>{tag}</div>}
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Descriptive Answer Review */}
                {q.type === "DESCRIPTIVE" && (
                  <div style={{ marginBottom: "1.2em" }}>
                    <div className="label">Your Submitted Answer:</div>
                    <div style={{ background: "var(--paper-100)", padding: "0.9em 1.1em", borderRadius: "var(--radius-sm)", fontSize: "0.95rem", whiteSpace: "pre-wrap", color: "var(--ink-900)" }}>
                      {q.savedAnswer?.descriptiveAnswer || <span style={{ color: "var(--ink-500)", fontStyle: "italic" }}>No answer submitted</span>}
                    </div>
                    {q.savedAnswer?.marksAwarded !== null && q.savedAnswer?.marksAwarded !== undefined && (
                      <div style={{ marginTop: "0.5em", fontWeight: 600, color: "var(--ok-500)" }}>
                        Instructor Awarded: {q.savedAnswer.marksAwarded} / {q.marks} pts
                      </div>
                    )}
                  </div>
                )}

                {/* Architectural Explanation / Solution Box */}
                {q.solution && (
                  <div
                    style={{
                      background: "rgba(201, 150, 47, 0.09)",
                      border: "1px solid var(--brass-500)",
                      borderRadius: "var(--radius-sm)",
                      padding: "1em 1.2em",
                      marginTop: "0.8em",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4em", fontWeight: 700, fontSize: "0.88rem", color: "var(--brass-600)", marginBottom: "0.4em" }}>
                      💡 Architectural Rationale & Explanation:
                    </div>
                    <div style={{ fontSize: "0.92rem", lineHeight: "1.55", color: "var(--ink-900)" }}>
                      {q.solution}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Actions */}
      <div style={{ marginTop: "2.5em", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1em" }}>
        <Link to="/" className="btn btn-ghost">
          ← Back to All Tests
        </Link>
        <div style={{ display: "flex", gap: "0.8em" }}>
          <Link to="/history" className="btn btn-ghost">
            View Test History
          </Link>
          <Link to={`/runner/${attempt.testId}`} className="btn btn-primary">
            Retake This Test ↻
          </Link>
        </div>
      </div>
    </div>
  );
}
