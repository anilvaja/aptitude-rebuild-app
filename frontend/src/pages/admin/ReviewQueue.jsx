import { useEffect, useState } from "react";
import { api } from "../../api/client";

export default function ReviewQueue() {
  const [items, setItems] = useState(null);
  const [scores, setScores] = useState({});

  function refresh() {
    api.get("/api/admin/review-queue").then(setItems);
  }
  useEffect(refresh, []);

  async function grade(item) {
    const marksAwarded = Number(scores[item.id]);
    if (Number.isNaN(marksAwarded)) return;
    await api.put(`/api/attempts/${item.attemptId}/answers/${item.questionId}/grade`, { marksAwarded });
    refresh();
  }

  return (
    <div>
      <h1>Review queue</h1>
      <p style={{ color: "var(--ink-500)" }}>Written-answer questions waiting on a grade.</p>
      {!items && <p>Loading…</p>}
      {items?.length === 0 && <p style={{ color: "var(--ink-500)" }}>Nothing to review right now.</p>}
      <div style={{ display: "grid", gap: "1em" }}>
        {items?.map((item) => (
          <div key={item.id} className="card" style={{ padding: "1.4em" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.6em" }}>
              <strong>{item.attempt.test.title}</strong>
              <span style={{ fontSize: "0.85rem", color: "var(--ink-500)" }}>
                {item.attempt.user.name} ({item.attempt.user.email})
              </span>
            </div>
            <p style={{ fontWeight: 600 }}>{item.question.text}</p>
            <p style={{ whiteSpace: "pre-wrap", background: "var(--paper-100)", padding: "1em", borderRadius: "var(--radius-sm)" }}>
              {item.descriptiveAnswer}
            </p>
            <div style={{ display: "flex", gap: "0.6em", alignItems: "center" }}>
              <input
                className="input"
                type="number"
                min="0"
                max={item.question.marks}
                step="0.5"
                placeholder={`Out of ${item.question.marks}`}
                style={{ width: 140 }}
                value={scores[item.id] || ""}
                onChange={(e) => setScores((s) => ({ ...s, [item.id]: e.target.value }))}
              />
              <button className="btn btn-primary" onClick={() => grade(item)}>Save grade</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
