import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";

function totalDuration(selectedIds, overrides, questionsById) {
  return selectedIds.reduce((sum, id) => {
    const override = overrides[id]?.timeOverrideSeconds;
    return sum + (override || questionsById[id]?.defaultTimeSeconds || 60);
  }, 0);
}

export default function TestBuilder() {
  const [tests, setTests] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);

  function refresh() {
    api.get("/api/tests").then(setTests);
  }
  useEffect(refresh, []);

  function startCreate() {
    api.get("/api/questions?status=ACTIVE").then(setQuestions);
    setForm({ title: "", description: "", shuffleQuestions: true, autoSubmit: true, status: "DRAFT", selectedIds: [], overrides: {} });
  }

  async function startEdit(testSummary) {
    const [full, allQuestions] = await Promise.all([
      api.get(`/api/tests/${testSummary.id}`),
      api.get("/api/questions?status=ACTIVE"),
    ]);
    setQuestions(allQuestions);
    const overrides = {};
    full.testQuestions.forEach((tq) => {
      if (tq.timeOverrideSeconds || tq.marksOverride) {
        overrides[tq.questionId] = { timeOverrideSeconds: tq.timeOverrideSeconds, marksOverride: tq.marksOverride };
      }
    });
    setForm({
      id: full.id,
      title: full.title,
      description: full.description || "",
      shuffleQuestions: full.shuffleQuestions,
      autoSubmit: full.autoSubmit,
      status: full.status,
      selectedIds: full.testQuestions.map((tq) => tq.questionId),
      overrides,
    });
  }

  function toggleQuestion(id) {
    setForm((f) => ({
      ...f,
      selectedIds: f.selectedIds.includes(id) ? f.selectedIds.filter((x) => x !== id) : [...f.selectedIds, id],
    }));
  }

  async function save(e) {
    e.preventDefault();
    setError(null);
    if (form.selectedIds.length === 0) {
      setError("Select at least one question.");
      return;
    }
    const payload = {
      title: form.title,
      description: form.description,
      shuffleQuestions: form.shuffleQuestions,
      autoSubmit: form.autoSubmit,
      status: form.status,
      questionIds: form.selectedIds,
      overrides: form.overrides,
    };
    try {
      if (form.id) {
        await api.put(`/api/tests/${form.id}`, payload);
      } else {
        await api.post("/api/tests", payload);
      }
      setForm(null);
      refresh();
    } catch (err) {
      setError(err.details ? err.details.map((d) => d.message).join(" ") : err.message);
    }
  }

  async function archive(id) {
    if (!confirm("Archive this test? Students will no longer see it.")) return;
    await api.delete(`/api/tests/${id}`);
    refresh();
  }

  if (form) {
    const questionsById = Object.fromEntries(questions.map((q) => [q.id, q]));
    const duration = totalDuration(form.selectedIds, form.overrides, questionsById);
    return (
      <div>
        <h1>{form.id ? "Edit test" : "New test"}</h1>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={save}>
          <div className="card" style={{ padding: "1.6em", display: "grid", gap: "1em", marginBottom: "1.4em" }}>
            <div>
              <label className="label">Title</label>
              <input className="input" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: "2em" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5em" }}>
                <input type="checkbox" checked={form.shuffleQuestions} onChange={(e) => setForm((f) => ({ ...f, shuffleQuestions: e.target.checked }))} />
                Shuffle question order per student
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5em" }}>
                <input type="checkbox" checked={form.autoSubmit} onChange={(e) => setForm((f) => ({ ...f, autoSubmit: e.target.checked }))} />
                Auto-submit when time expires
              </label>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="DRAFT">Draft (hidden from students)</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          <div className="card" style={{ padding: "1.6em" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.8em" }}>
              <h3>Question pool ({form.selectedIds.length} selected)</h3>
              <span className="mono" style={{ color: "var(--ink-500)" }}>
                Total time: {Math.floor(duration / 60)}m {duration % 60}s
              </span>
            </div>
            <p style={{ color: "var(--ink-500)", fontSize: "0.85rem", marginTop: 0 }}>
              Selected questions appear to every student in shuffled order (if enabled). Test duration is the sum of
              each question's time budget — override a question's time or marks for this test only.
            </p>
            <div style={{ display: "grid", gap: "0.5em", maxHeight: 480, overflowY: "auto" }}>
              {questions.map((q) => {
                const selected = form.selectedIds.includes(q.id);
                return (
                  <div
                    key={q.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.8em",
                      padding: "0.7em 0.9em",
                      border: `1px solid ${selected ? "var(--brass-500)" : "var(--line)"}`,
                      borderRadius: "var(--radius-sm)",
                      background: selected ? "var(--brass-100)" : "#fff",
                    }}
                  >
                    <input type="checkbox" checked={selected} onChange={() => toggleQuestion(q.id)} />
                    <div style={{ flex: 1 }}>
                      <span className="badge badge-neutral" style={{ marginRight: "0.5em" }}>{q.type}</span>
                      {q.text.slice(0, 90)}
                    </div>
                    {selected && (
                      <input
                        className="input"
                        type="number"
                        placeholder={`${q.defaultTimeSeconds}s`}
                        style={{ width: 90 }}
                        value={form.overrides[q.id]?.timeOverrideSeconds || ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            overrides: {
                              ...f.overrides,
                              [q.id]: { ...f.overrides[q.id], timeOverrideSeconds: Number(e.target.value) || undefined },
                            },
                          }))
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.8em", marginTop: "1.4em" }}>
            <button type="submit" className="btn btn-primary">Save test</button>
            <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Tests</h1>
        <button className="btn btn-accent" onClick={startCreate}>New test</button>
      </div>
      {!tests && <p>Loading…</p>}
      <div style={{ display: "grid", gap: "0.7em", marginTop: "1em" }}>
        {tests?.map((t) => (
          <div key={t.id} className="card" style={{ padding: "1.1em 1.4em", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", gap: "0.5em", alignItems: "center", marginBottom: "0.2em" }}>
                <strong>{t.title}</strong>
                <span className={`badge ${t.status === "PUBLISHED" ? "badge-ok" : t.status === "DRAFT" ? "badge-warn" : "badge-neutral"}`}>{t.status}</span>
              </div>
              <span style={{ fontSize: "0.85rem", color: "var(--ink-500)" }}>
                {t.questionCount} questions · {t.attemptCount} attempts
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.5em" }}>
              <Link className="btn btn-ghost" to={`/admin/tests/${t.id}/analytics`}>Analytics</Link>
              <button className="btn btn-ghost" onClick={() => startEdit(t)}>Edit</button>
              <button className="btn btn-danger" onClick={() => archive(t.id)}>Archive</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
