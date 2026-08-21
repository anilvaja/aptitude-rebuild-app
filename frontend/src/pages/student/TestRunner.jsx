import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "../../api/client";
import { useActiveTest, fmtTime } from "../../context/ActiveTestContext";

export default function TestRunner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshActiveTest } = useActiveTest();
  const [attempt, setAttempt] = useState(null);
  const [error, setError] = useState(null);
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [answers, setAnswers] = useState({}); // questionId -> {selectedChoice, descriptiveAnswer}
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);
  const submittedRef = useRef(false);

  const load = useCallback(async () => {
    const data = await api.get(`/api/attempts/${id}`);
    setAttempt(data);
    setRemaining(data.remainingSeconds);
    const initial = {};
    data.questions.forEach((q) => {
      if (q.savedAnswer) initial[q.id] = q.savedAnswer;
    });
    setAnswers(initial);
    if (data.status !== "IN_PROGRESS") {
      refreshActiveTest();
      navigate(`/result/${id}`, { replace: true });
    }
  }, [id, navigate, refreshActiveTest]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  // Client-side ticking clock
  useEffect(() => {
    if (!attempt || attempt.status !== "IN_PROGRESS") return;
    const timer = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [attempt]);

  function saveAnswer(questionId, patch) {
    setAnswers((a) => ({ ...a, [questionId]: { ...a[questionId], ...patch } }));
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await api.post(`/api/attempts/${id}/answer`, { questionId, ...patch });
      } catch (e) {
        if (e.status === 409) {
          refreshActiveTest();
          navigate(`/result/${id}`, { replace: true });
        }
      } finally {
        setSaving(false);
      }
    }, 500);
  }

  async function handleSubmit(auto = false) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    clearTimeout(saveTimer.current);
    try {
      await api.post(`/api/attempts/${id}/submit`);
    } catch {
      // fall through
    }
    refreshActiveTest();
    navigate(`/result/${id}`, { replace: true, state: { auto } });
  }

  if (error) return <div className="error-banner">{error}</div>;
  if (!attempt) return <p>Loading test interface…</p>;

  const q = attempt.questions[current];
  const answeredCount = attempt.questions.filter((qq) => {
    const a = answers[qq.id];
    return a && (a.selectedChoice || (a.descriptiveAnswer && a.descriptiveAnswer.trim()));
  }).length;
  const pct = attempt.durationSeconds ? (remaining / attempt.durationSeconds) * 100 : 0;
  const low = remaining <= 60;

  return (
    <div>
      {/* Timer bar */}
      <div style={{ position: "sticky", top: 0, background: "var(--paper-0)", paddingBottom: "1em", zIndex: 5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5em", flexWrap: "wrap", gap: "0.5em" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8em" }}>
            <Link to="/" style={{ fontSize: "0.85rem", color: "var(--ink-500)", textDecoration: "none" }}>
              ← Exit to Tests List
            </Link>
            <h2 style={{ fontSize: "1.1rem", margin: 0 }}>{attempt.testTitle}</h2>
          </div>
          <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 700, color: low ? "var(--danger-500)" : "var(--ink-900)" }}>
            ⏱️ {fmtTime(remaining)}
          </div>
        </div>
        <div style={{ height: 6, background: "var(--paper-100)", borderRadius: 999, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: low ? "var(--danger-500)" : "var(--brass-500)",
              transition: "width 1s linear",
            }}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "1.6em" }}>
        <div className="card" style={{ padding: "1.8em" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.2em", flexWrap: "wrap", gap: "0.6em", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5em", flexWrap: "wrap" }}>
              <span className="badge badge-neutral">Question {current + 1} of {attempt.questions.length}</span>
              {q.subject && (
                <span className="badge badge-accent" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                  📚 {q.subject}
                </span>
              )}
              {q.category && (
                <span className="badge badge-neutral" style={{ textTransform: "none", fontSize: "0.72rem" }}>
                  🏷️ {q.category}
                </span>
              )}
              {q.subCategory && (
                <span className="badge badge-neutral" style={{ textTransform: "none", fontSize: "0.72rem", background: "var(--paper-100)" }}>
                  🔹 {q.subCategory}
                </span>
              )}
            </div>
            <span className="mono badge badge-neutral">
              {q.marks} mark{q.marks !== 1 ? "s" : ""}{q.negativeMarks ? ` · -${q.negativeMarks} if wrong` : ""}
            </span>
          </div>

          <p style={{ fontSize: "1.05rem", lineHeight: 1.5, fontWeight: 500 }}>{q.text}</p>

          {q.type === "MCQ" ? (
            <div style={{ display: "grid", gap: "0.6em", marginTop: "1.2em" }}>
              {["A", "B", "C", "D", "E"]
                .filter((k) => q.choices && q.choices[k])
                .map((k) => (
                  <label
                    key={k}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.7em",
                      padding: "0.75em 1em",
                      border: `1px solid ${answers[q.id]?.selectedChoice === k ? "var(--brass-500)" : "var(--line)"}`,
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      background: answers[q.id]?.selectedChoice === k ? "var(--brass-100)" : "#fff",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={answers[q.id]?.selectedChoice === k}
                      onChange={() => saveAnswer(q.id, { selectedChoice: k })}
                      style={{ marginTop: "0.2em" }}
                    />
                    <span className="mono" style={{ fontWeight: 700, color: "var(--ink-700)" }}>{k}.</span>
                    <span style={{ fontSize: "0.95rem", lineHeight: "1.4" }}>{q.choices[k]}</span>
                  </label>
                ))}
            </div>
          ) : (
            <textarea
              className="input"
              rows={8}
              placeholder="Write your answer…"
              value={answers[q.id]?.descriptiveAnswer || ""}
              onChange={(e) => saveAnswer(q.id, { descriptiveAnswer: e.target.value })}
              style={{ marginTop: "1.2em", resize: "vertical" }}
            />
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.8em", alignItems: "center" }}>
            <button className="btn btn-ghost" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
              ← Previous
            </button>
            <span style={{ fontSize: "0.8rem", color: "var(--ink-500)" }}>
              {saving ? "Saving…" : "Saved"}
            </span>
            {current < attempt.questions.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setCurrent((c) => c + 1)}>
                Next →
              </button>
            ) : (
              <button className="btn btn-accent" onClick={() => handleSubmit(false)}>
                Submit Test
              </button>
            )}
          </div>
        </div>

        <div>
          <div className="card" style={{ padding: "1.2em" }}>
            <p style={{ fontSize: "0.82rem", color: "var(--ink-500)", marginTop: 0, fontWeight: 600 }}>
              {answeredCount} of {attempt.questions.length} answered
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.4em", maxHeight: "380px", overflowY: "auto", paddingRight: "2px" }}>
              {attempt.questions.map((qq, i) => {
                const a = answers[qq.id];
                const done = a && (a.selectedChoice || (a.descriptiveAnswer && a.descriptiveAnswer.trim()));
                return (
                  <button
                    key={qq.id}
                    onClick={() => setCurrent(i)}
                    className="mono"
                    style={{
                      aspectRatio: "1",
                      border: `1px solid ${i === current ? "var(--ink-900)" : "var(--line)"}`,
                      background: done ? "var(--ok-100)" : "#fff",
                      color: done ? "var(--ok-500)" : "var(--ink-900)",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            className="btn btn-accent"
            style={{ width: "100%", justifyContent: "center", marginTop: "1em", padding: "0.75em" }}
            onClick={() => handleSubmit(false)}
          >
            Submit Test
          </button>
        </div>
      </div>
    </div>
  );
}
