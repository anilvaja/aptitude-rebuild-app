import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";

function totalDuration(selectedIds, overrides, questionsById) {
  return selectedIds.reduce((sum, id) => {
    const override = overrides[id]?.timeOverrideSeconds;
    return sum + (override || questionsById[id]?.defaultTimeSeconds || 60);
  }, 0);
}

function totalMarks(selectedIds, overrides, questionsById) {
  return selectedIds.reduce((sum, id) => {
    const override = overrides[id]?.marksOverride;
    return sum + (override || questionsById[id]?.marks || 1);
  }, 0);
}

export default function TestBuilder() {
  const [tests, setTests] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [previewTest, setPreviewTest] = useState(null);

  // Question pool filtering inside builder
  const [poolSubjectFilter, setPoolSubjectFilter] = useState("ALL");
  const [poolCatFilter, setPoolCatFilter] = useState("ALL");
  const [poolSearchQuery, setPoolSearchQuery] = useState("");

  function refresh() {
    api.get("/api/tests").then(setTests).catch((e) => setError(e.message));
    api.get("/api/categories").then(setCategories).catch(() => {});
  }

  useEffect(refresh, []);

  async function startCreate() {
    setError(null);
    const allQuestions = await api.get("/api/questions?status=ACTIVE");
    setQuestions(allQuestions);
    setForm({
      title: "",
      description: "",
      targetGrade: "PROFESSIONAL",
      minAge: 18,
      shuffleQuestions: true,
      autoSubmit: true,
      status: "DRAFT",
      selectedIds: [],
      overrides: {},
    });
  }

  async function startEdit(testSummary) {
    setError(null);
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
      targetGrade: full.targetGrade || "PROFESSIONAL",
      minAge: full.minAge || null,
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

  function selectAllFiltered(filteredList) {
    setForm((f) => {
      const newIds = new Set([...f.selectedIds, ...filteredList.map((q) => q.id)]);
      return { ...f, selectedIds: Array.from(newIds) };
    });
  }

  function deselectAllFiltered(filteredList) {
    const idsToRemove = new Set(filteredList.map((q) => q.id));
    setForm((f) => ({
      ...f,
      selectedIds: f.selectedIds.filter((id) => !idsToRemove.has(id)),
    }));
  }

  async function save(e) {
    e.preventDefault();
    setError(null);
    if (form.selectedIds.length === 0) {
      setError("Please select at least one question for this examination paper.");
      return;
    }
    const payload = {
      title: form.title,
      description: form.description,
      targetGrade: form.targetGrade || null,
      minAge: form.minAge ? Number(form.minAge) : null,
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

  async function togglePublishStatus(t) {
    const newStatus = t.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    const full = await api.get(`/api/tests/${t.id}`);
    await api.put(`/api/tests/${t.id}`, {
      title: full.title,
      description: full.description,
      targetGrade: full.targetGrade,
      minAge: full.minAge,
      shuffleQuestions: full.shuffleQuestions,
      autoSubmit: full.autoSubmit,
      status: newStatus,
      questionIds: full.testQuestions.map((tq) => tq.questionId),
    });
    refresh();
  }

  async function archive(id) {
    if (!confirm("Archive this examination paper? It will no longer be visible to students.")) return;
    await api.delete(`/api/tests/${id}`);
    refresh();
  }

  async function openPreview(testSummary) {
    const full = await api.get(`/api/tests/${testSummary.id}`);
    setPreviewTest(full);
  }

  // Filtered test catalog for main page
  const filteredTests = useMemo(() => {
    if (!tests) return [];
    return tests.filter((t) => {
      const isCCAR = t.title.toLowerCase().includes("ccar") || t.title.toLowerCase().includes("claude");
      const isPrimary = t.title.toLowerCase().includes("class 1") || t.title.toLowerCase().includes("class 2");

      if (activeTab === "ccar" && !isCCAR) return false;
      if (activeTab === "primary" && !isPrimary) return false;
      if (activeTab === "draft" && t.status !== "DRAFT") return false;
      if (activeTab === "published" && t.status !== "PUBLISHED") return false;
      if (activeTab === "archived" && t.status !== "ARCHIVED") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tests, activeTab, searchQuery]);

  // Filtered question pool inside builder
  const filteredPoolQuestions = useMemo(() => {
    if (!questions) return [];
    return questions.filter((q) => {
      if (poolSubjectFilter !== "ALL" && q.subject !== poolSubjectFilter) return false;
      if (poolCatFilter !== "ALL" && q.categoryId !== poolCatFilter) return false;

      if (poolSearchQuery.trim()) {
        const query = poolSearchQuery.toLowerCase();
        return (
          q.text.toLowerCase().includes(query) ||
          q.subCategory?.toLowerCase().includes(query) ||
          q.category?.name?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [questions, poolSubjectFilter, poolCatFilter, poolSearchQuery]);

  // Map of questions by ID for live calculation
  const questionsById = useMemo(() => Object.fromEntries(questions.map((q) => [q.id, q])), [questions]);

  // Compute metrics for tabs
  const tabCounts = useMemo(() => {
    if (!tests) return { all: 0, ccar: 0, primary: 0, draft: 0, published: 0, archived: 0 };
    return {
      all: tests.length,
      ccar: tests.filter((t) => t.title.toLowerCase().includes("ccar") || t.title.toLowerCase().includes("claude")).length,
      primary: tests.filter((t) => t.title.toLowerCase().includes("class 1") || t.title.toLowerCase().includes("class 2")).length,
      published: tests.filter((t) => t.status === "PUBLISHED").length,
      draft: tests.filter((t) => t.status === "DRAFT").length,
      archived: tests.filter((t) => t.status === "ARCHIVED").length,
    };
  }, [tests]);

  // -------------------------------------------------------------
  // Test Builder / Editor Workspace Screen
  // -------------------------------------------------------------
  if (form) {
    const duration = totalDuration(form.selectedIds, form.overrides, questionsById);
    const marks = totalMarks(form.selectedIds, form.overrides, questionsById);
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;

    return (
      <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: "3em" }}>
        {/* Workspace Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.4em", flexWrap: "wrap", gap: "1em" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5em", marginBottom: "0.2em" }}>
              <span className="badge badge-accent" style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                EXAMINATION AUTHORING WORKSPACE
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: "1.8rem", letterSpacing: "-0.01em" }}>
              {form.id ? `Edit Examination: ${form.title}` : "Author New Examination Paper"}
            </h1>
          </div>

          <div style={{ display: "flex", gap: "0.8em" }}>
            <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={save} style={{ fontWeight: 700, padding: "0.6em 1.6em" }}>
              💾 Save Examination Paper
            </button>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* Live Calculation Metric Bar */}
        <div
          className="card"
          style={{
            padding: "1.2em 1.6em",
            marginBottom: "1.4em",
            background: "linear-gradient(135deg, #14181f 0%, #1f2530 100%)",
            color: "#fff",
            borderRadius: "var(--radius-lg)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "1.2em",
            boxShadow: "0 8px 24px rgba(20, 24, 31, 0.2)"
          }}
        >
          <div>
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: 700 }}>
              Questions Selected
            </div>
            <div className="mono" style={{ fontSize: "1.4rem", fontWeight: 700, color: form.selectedIds.length > 0 ? "var(--brass-500)" : "#ef4444" }}>
              📝 {form.selectedIds.length} Items
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: 700 }}>
              Total Exam Duration
            </div>
            <div className="mono" style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff" }}>
              ⏱️ {mins}m {secs > 0 ? `${secs}s` : ""}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: 700 }}>
              Maximum Score
            </div>
            <div className="mono" style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff" }}>
              ⚖️ {marks} Marks
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: 700 }}>
              Target Grade Tier
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--brass-500)", marginTop: "0.2em" }}>
              {form.targetGrade === "GRADE_1" ? "🎒 Grade 1 (Primary)" : form.targetGrade === "GRADE_2" ? "🎒 Grade 2 (Primary)" : form.targetGrade === "PROFESSIONAL" ? "🎓 Masters / Professional" : "🌐 Open to All"}
            </div>
          </div>
        </div>

        <form onSubmit={save} style={{ display: "grid", gap: "1.6em" }}>
          {/* General Metadata & Access Settings */}
          <div className="card" style={{ padding: "1.8em", display: "grid", gap: "1.2em", borderRadius: "var(--radius-lg)" }}>
            <h3 style={{ margin: 0, fontSize: "1.15rem", borderBottom: "1px solid var(--line)", paddingBottom: "0.5em" }}>
              1. General Details & Access Policies
            </h3>

            <div>
              <label className="label">Examination Paper Title *</label>
              <input
                className="input"
                required
                placeholder="e.g. Claude Certified Architect – Foundations (CCAR-F) Practice Exam 4"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                style={{ fontSize: "1rem", fontWeight: 600 }}
              />
            </div>

            <div>
              <label className="label">Description & Candidate Instructions</label>
              <textarea
                className="input"
                rows={2}
                placeholder="Describe examination objectives, syllabus scope, and blueprint specifications..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "1.2em" }}>
              <div>
                <label className="label">Target Audience / Grade Tier *</label>
                <select
                  className="input"
                  value={form.targetGrade || "PROFESSIONAL"}
                  onChange={(e) => setForm((f) => ({ ...f, targetGrade: e.target.value }))}
                >
                  <option value="PROFESSIONAL">🎓 Masters / IT Professional (CCAR-F Track)</option>
                  <option value="GRADE_2">🎒 Grade 2 (Class 2 Primary School)</option>
                  <option value="GRADE_1">🎒 Grade 1 (Class 1 Primary School)</option>
                  <option value="GRADE_3">🎒 Grade 3 (Primary School)</option>
                  <option value="ALL">🌐 Open to All Students</option>
                </select>
              </div>

              <div>
                <label className="label">Minimum Age (Years)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="e.g. 18 (or 6 for school)"
                  min="4"
                  max="100"
                  value={form.minAge || ""}
                  onChange={(e) => setForm((f) => ({ ...f, minAge: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Publication Status</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="DRAFT">Draft (Hidden from students)</option>
                  <option value="PUBLISHED">Published (Active in portal)</option>
                  <option value="ARCHIVED">Archived (Retired)</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "2.4em", paddingTop: "0.4em", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.6em", cursor: "pointer", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={form.shuffleQuestions}
                  onChange={(e) => setForm((f) => ({ ...f, shuffleQuestions: e.target.checked }))}
                />
                🔀 Shuffle question order randomly per attempt (Anti-cheating)
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "0.6em", cursor: "pointer", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={form.autoSubmit}
                  onChange={(e) => setForm((f) => ({ ...f, autoSubmit: e.target.checked }))}
                />
                ⏱️ Server auto-submit when countdown hits zero
              </label>
            </div>
          </div>

          {/* Question Pool Selector */}
          <div className="card" style={{ padding: "1.8em", borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8em", flexWrap: "wrap", gap: "0.8em" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem" }}>
                2. Question Pool Selection ({form.selectedIds.length} Selected)
              </h3>

              <div style={{ display: "flex", gap: "0.6em" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: "0.82rem", padding: "0.35em 0.8em" }}
                  onClick={() => selectAllFiltered(filteredPoolQuestions)}
                >
                  ✓ Select All Filtered ({filteredPoolQuestions.length})
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: "0.82rem", padding: "0.35em 0.8em", color: "var(--danger-500)" }}
                  onClick={() => deselectAllFiltered(filteredPoolQuestions)}
                >
                  ✕ Deselect Filtered
                </button>
              </div>
            </div>

            {/* Question Pool Filters Bar */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.2fr 1.5fr",
                gap: "0.8em",
                background: "var(--paper-100)",
                padding: "0.8em 1em",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--line)",
                marginBottom: "1em",
              }}
            >
              <div>
                <label className="label" style={{ fontSize: "0.74rem", marginBottom: "0.2em" }}>Filter Subject</label>
                <select
                  className="input"
                  style={{ fontSize: "0.84rem", padding: "0.35em 0.6em" }}
                  value={poolSubjectFilter}
                  onChange={(e) => {
                    setPoolSubjectFilter(e.target.value);
                    setPoolCatFilter("ALL");
                  }}
                >
                  <option value="ALL">All Subjects</option>
                  <option value="Claude Architecture">Claude Architecture</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="English">English</option>
                </select>
              </div>

              <div>
                <label className="label" style={{ fontSize: "0.74rem", marginBottom: "0.2em" }}>Filter Category</label>
                <select
                  className="input"
                  style={{ fontSize: "0.84rem", padding: "0.35em 0.6em" }}
                  value={poolCatFilter}
                  onChange={(e) => setPoolCatFilter(e.target.value)}
                >
                  <option value="ALL">All Categories</option>
                  {categories
                    .filter((c) => !c.parentId && (poolSubjectFilter === "ALL" || c.subject === poolSubjectFilter))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="label" style={{ fontSize: "0.74rem", marginBottom: "0.2em" }}>Search Question Text</label>
                <input
                  type="text"
                  className="input"
                  placeholder="🔍 Type keywords..."
                  style={{ fontSize: "0.84rem", padding: "0.35em 0.6em" }}
                  value={poolSearchQuery}
                  onChange={(e) => setPoolSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Questions Selection Scroll Area */}
            <div style={{ display: "grid", gap: "0.6em", maxHeight: 520, overflowY: "auto", paddingRight: "4px" }}>
              {filteredPoolQuestions.length === 0 && (
                <div style={{ textAlign: "center", padding: "2.5em 1em", color: "var(--ink-500)" }}>
                  No questions match your filter criteria.
                </div>
              )}

              {filteredPoolQuestions.map((q) => {
                const selected = form.selectedIds.includes(q.id);

                return (
                  <div
                    key={q.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.9em",
                      padding: "0.85em 1em",
                      border: `1px solid ${selected ? "var(--brass-500)" : "var(--line)"}`,
                      borderRadius: "var(--radius-md)",
                      background: selected ? "rgba(201, 150, 47, 0.08)" : "#fff",
                      transition: "all 0.12s ease",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleQuestion(q.id)}
                      style={{ marginTop: "3px", width: "18px", height: "18px", cursor: "pointer" }}
                    />

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: "0.4em", marginBottom: "0.3em", flexWrap: "wrap", alignItems: "center" }}>
                        <span className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>
                          {q.type}
                        </span>
                        {q.subject && (
                          <span className="badge badge-indigo" style={{ fontSize: "0.7rem" }}>
                            📚 {q.subject}
                          </span>
                        )}
                        {q.category && (
                          <span className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>
                            📂 {q.category.name}
                          </span>
                        )}
                        {q.subCategory && (
                          <span className="badge badge-purple" style={{ fontSize: "0.7rem" }}>
                            🔹 {q.subCategory}
                          </span>
                        )}
                        <span className={`badge ${q.difficulty === "HARD" ? "badge-danger" : q.difficulty === "MEDIUM" ? "badge-warn" : "badge-ok"}`} style={{ fontSize: "0.68rem" }}>
                          {q.difficulty}
                        </span>
                      </div>

                      <div style={{ fontSize: "0.92rem", color: "var(--ink-900)", lineHeight: "1.4" }}>
                        {q.text}
                      </div>
                    </div>

                    {/* Per-question overrides */}
                    {selected && (
                      <div style={{ display: "flex", gap: "0.4em", alignItems: "center", flexShrink: 0 }}>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "0.68rem", color: "var(--ink-500)", display: "block" }}>Time (s)</span>
                          <input
                            className="input"
                            type="number"
                            placeholder={`${q.defaultTimeSeconds}s`}
                            style={{ width: 68, fontSize: "0.82rem", padding: "0.25em 0.4em" }}
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
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "0.68rem", color: "var(--ink-500)", display: "block" }}>Marks</span>
                          <input
                            className="input"
                            type="number"
                            step="0.5"
                            placeholder={`${q.marks}`}
                            style={{ width: 55, fontSize: "0.82rem", padding: "0.25em 0.4em" }}
                            value={form.overrides[q.id]?.marksOverride || ""}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                overrides: {
                                  ...f.overrides,
                                  [q.id]: { ...f.overrides[q.id], marksOverride: Number(e.target.value) || undefined },
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8em" }}>
            <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ fontWeight: 700, padding: "0.7em 2em" }}>
              💾 Save Examination Paper
            </button>
          </div>
        </form>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Main Examination Management Hub View
  // -------------------------------------------------------------
  return (
    <div>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.6em", flexWrap: "wrap", gap: "1em" }}>
        <div>
          <h1 style={{ margin: "0 0 0.2em 0", fontSize: "1.85rem", letterSpacing: "-0.01em" }}>
            Examination Papers Management
          </h1>
          <p style={{ color: "var(--ink-500)", margin: 0, fontSize: "0.95rem" }}>
            Configure examination papers, assign target grades & age restrictions, assemble question pools, and inspect analytics.
          </p>
        </div>

        <button className="btn btn-accent" onClick={startCreate} style={{ fontWeight: 700, padding: "0.65em 1.5em" }}>
          + Author New Examination
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* KPI Overview Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1.2em",
          marginBottom: "1.8em",
        }}
      >
        <div className="card" style={{ padding: "1.3em", borderRadius: "var(--radius-lg)", borderLeft: "4px solid var(--ok-500)" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--ink-500)", textTransform: "uppercase", fontWeight: 700 }}>
            Published Papers
          </div>
          <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--ink-900)", marginTop: "0.2em" }}>
            🎓 {tabCounts.published} Active
          </div>
        </div>

        <div className="card" style={{ padding: "1.3em", borderRadius: "var(--radius-lg)", borderLeft: "4px solid var(--brass-500)" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--ink-500)", textTransform: "uppercase", fontWeight: 700 }}>
            Claude Architecture
          </div>
          <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--ink-900)", marginTop: "0.2em" }}>
            🤖 {tabCounts.ccar} Exams
          </div>
        </div>

        <div className="card" style={{ padding: "1.3em", borderRadius: "var(--radius-lg)", borderLeft: "4px solid var(--accent-500)" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--ink-500)", textTransform: "uppercase", fontWeight: 700 }}>
            Primary School (K-2)
          </div>
          <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--ink-900)", marginTop: "0.2em" }}>
            🎒 {tabCounts.primary} Assessments
          </div>
        </div>

        <div className="card" style={{ padding: "1.3em", borderRadius: "var(--radius-lg)", borderLeft: "4px solid var(--warn-500)" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--ink-500)", textTransform: "uppercase", fontWeight: 700 }}>
            Draft Papers
          </div>
          <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--ink-900)", marginTop: "0.2em" }}>
            📝 {tabCounts.draft} Pending
          </div>
        </div>
      </div>

      {/* Navigation Filter Tabs & Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.2em",
          marginBottom: "1.6em",
        }}
      >
        <div style={{ display: "flex", background: "var(--paper-100)", padding: "4px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)", flexWrap: "wrap", gap: "4px" }}>
          <button
            onClick={() => setActiveTab("all")}
            style={{
              border: "none",
              background: activeTab === "all" ? "#fff" : "transparent",
              color: activeTab === "all" ? "var(--ink-900)" : "var(--ink-500)",
              fontWeight: activeTab === "all" ? 700 : 500,
              padding: "0.45em 0.9em",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.85rem",
              cursor: "pointer",
              boxShadow: activeTab === "all" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            🌟 All ({tabCounts.all})
          </button>
          <button
            onClick={() => setActiveTab("ccar")}
            style={{
              border: "none",
              background: activeTab === "ccar" ? "#fff" : "transparent",
              color: activeTab === "ccar" ? "var(--ink-900)" : "var(--ink-500)",
              fontWeight: activeTab === "ccar" ? 700 : 500,
              padding: "0.45em 0.9em",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.85rem",
              cursor: "pointer",
              boxShadow: activeTab === "ccar" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            🤖 Claude Architect ({tabCounts.ccar})
          </button>
          <button
            onClick={() => setActiveTab("primary")}
            style={{
              border: "none",
              background: activeTab === "primary" ? "#fff" : "transparent",
              color: activeTab === "primary" ? "var(--ink-900)" : "var(--ink-500)",
              fontWeight: activeTab === "primary" ? 700 : 500,
              padding: "0.45em 0.9em",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.85rem",
              cursor: "pointer",
              boxShadow: activeTab === "primary" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            🎒 Primary School ({tabCounts.primary})
          </button>
          <button
            onClick={() => setActiveTab("published")}
            style={{
              border: "none",
              background: activeTab === "published" ? "#fff" : "transparent",
              color: activeTab === "published" ? "var(--ink-900)" : "var(--ink-500)",
              fontWeight: activeTab === "published" ? 700 : 500,
              padding: "0.45em 0.9em",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.85rem",
              cursor: "pointer",
              boxShadow: activeTab === "published" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            ✓ Published ({tabCounts.published})
          </button>
          <button
            onClick={() => setActiveTab("draft")}
            style={{
              border: "none",
              background: activeTab === "draft" ? "#fff" : "transparent",
              color: activeTab === "draft" ? "var(--ink-900)" : "var(--ink-500)",
              fontWeight: activeTab === "draft" ? 700 : 500,
              padding: "0.45em 0.9em",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.85rem",
              cursor: "pointer",
              boxShadow: activeTab === "draft" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            📝 Drafts ({tabCounts.draft})
          </button>
        </div>

        <div style={{ minWidth: "260px" }}>
          <input
            type="text"
            className="input"
            placeholder="🔍 Search exam titles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: "0.88rem" }}
          />
        </div>
      </div>

      {!tests && <p style={{ color: "var(--ink-500)", textAlign: "center", padding: "2em 0" }}>Loading examination catalog…</p>}

      {tests && filteredTests.length === 0 && (
        <div className="card" style={{ padding: "3.5em 2em", textAlign: "center", color: "var(--ink-500)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.4em" }}>🔍</div>
          <h3 style={{ color: "var(--ink-700)", margin: "0 0 0.3em 0" }}>No examination papers found</h3>
          <p style={{ margin: 0, fontSize: "0.92rem" }}>
            Try adjusting your search query or tab filter.
          </p>
        </div>
      )}

      {/* Grid of Rich Examination Cards */}
      <div style={{ display: "grid", gap: "1.4em" }}>
        {filteredTests.map((t) => {
          const isCCAR = t.title.includes("CCAR-F") || t.title.includes("Claude");
          const isPrimary = t.title.includes("Class 1") || t.title.includes("Class 2");
          const isPublished = t.status === "PUBLISHED";
          const isDraft = t.status === "DRAFT";

          return (
            <div
              key={t.id}
              className="card card-interactive"
              style={{
                padding: "1.6em 2em",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--line)",
                display: "grid",
                gap: "1em",
              }}
            >
              {/* Card Top: Badges + Publication Toggle */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.6em" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6em", flexWrap: "wrap" }}>
                  <span className={`badge ${isCCAR ? "badge-indigo" : isPrimary ? "badge-purple" : "badge-neutral"}`} style={{ fontWeight: 700 }}>
                    {isCCAR ? "🤖 Claude Certification" : isPrimary ? "🎒 Primary School" : "📝 General Exam"}
                  </span>

                  <span className="badge badge-neutral" style={{ fontSize: "0.75rem" }}>
                    {t.targetGrade === "GRADE_1" ? "🎯 Grade 1 (Class 1)" : t.targetGrade === "GRADE_2" ? "🎯 Grade 2 (Class 2)" : t.targetGrade === "PROFESSIONAL" ? "🎯 Masters / Professional" : "🎯 Open to All"}
                  </span>

                  <span className={`badge ${isPublished ? "badge-ok" : isDraft ? "badge-warn" : "badge-neutral"}`} style={{ fontWeight: 700 }}>
                    {isPublished ? "● PUBLISHED" : isDraft ? "○ DRAFT" : "ARCHIVED"}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.8em" }}>
                  <span className="mono" style={{ fontSize: "0.82rem", color: "var(--ink-500)" }}>
                    Created: {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h2 style={{ fontSize: "1.25rem", margin: "0 0 0.35em 0", color: "var(--ink-900)", lineHeight: "1.35" }}>
                  {t.title}
                </h2>
                {t.description && (
                  <p style={{ color: "var(--ink-500)", margin: 0, fontSize: "0.9rem", lineHeight: "1.5" }}>
                    {t.description}
                  </p>
                )}
              </div>

              {/* Specs Bar */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "0.8em",
                  background: "var(--paper-100)",
                  padding: "0.8em 1.2em",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--line)",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--ink-500)", textTransform: "uppercase", fontWeight: 700 }}>
                    Questions
                  </div>
                  <div className="mono" style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink-900)" }}>
                    📝 {t.questionCount} Items
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--ink-500)", textTransform: "uppercase", fontWeight: 700 }}>
                    Attempts Taken
                  </div>
                  <div className="mono" style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink-900)" }}>
                    👥 {t.attemptCount} Candidates
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--ink-500)", textTransform: "uppercase", fontWeight: 700 }}>
                    Anti-Cheat Shuffle
                  </div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 600, color: t.shuffleQuestions ? "var(--ok-600)" : "var(--ink-500)" }}>
                    {t.shuffleQuestions ? "🔀 Active" : "Disabled"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--ink-500)", textTransform: "uppercase", fontWeight: 700 }}>
                    Auto-Submit
                  </div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 600, color: t.autoSubmit ? "var(--ok-600)" : "var(--ink-500)" }}>
                    {t.autoSubmit ? "⏱️ Active" : "Disabled"}
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.8em", borderTop: "1px solid var(--line)", paddingTop: "0.8em" }}>
                <div style={{ display: "flex", gap: "0.6em" }}>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: "0.84rem", padding: "0.35em 0.8em" }}
                    onClick={() => openPreview(t)}
                  >
                    👁️ Preview Questions
                  </button>

                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: "0.84rem", padding: "0.35em 0.8em" }}
                    onClick={() => togglePublishStatus(t)}
                  >
                    {isPublished ? "Unpublish to Draft" : "Publish to Portal"}
                  </button>
                </div>

                <div style={{ display: "flex", gap: "0.6em" }}>
                  <Link
                    to={`/admin/tests/${t.id}/analytics`}
                    className="btn btn-ghost"
                    style={{ fontSize: "0.84rem", padding: "0.35em 0.9em", fontWeight: 600, border: "1px solid var(--line)" }}
                  >
                    📊 View Analytics
                  </Link>

                  <button
                    className="btn btn-primary"
                    style={{ fontSize: "0.84rem", padding: "0.35em 1em", fontWeight: 600 }}
                    onClick={() => startEdit(t)}
                  >
                    ✏️ Edit Examination
                  </button>

                  <button
                    className="btn btn-danger"
                    style={{ fontSize: "0.84rem", padding: "0.35em 0.8em" }}
                    onClick={() => archive(t.id)}
                  >
                    🗑️ Archive
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Question Preview Modal */}
      {previewTest && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(20, 24, 31, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1.5em",
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: "800px", maxHeight: "85vh", overflowY: "auto", padding: "2.2em", borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2em" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.3rem" }}>{previewTest.title}</h2>
                <span className="mono" style={{ fontSize: "0.82rem", color: "var(--ink-500)" }}>
                  {previewTest.testQuestions?.length} Questions · Total Duration: {Math.round(previewTest.totalDurationSeconds / 60)} mins
                </span>
              </div>
              <button
                onClick={() => setPreviewTest(null)}
                style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--ink-500)" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gap: "0.8em" }}>
              {previewTest.testQuestions?.map((tq, idx) => {
                const q = tq.question;
                return (
                  <div
                    key={tq.id}
                    style={{
                      padding: "0.9em 1.1em",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--paper-100)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3em" }}>
                      <span className="mono" style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--ink-500)" }}>
                        Q#{idx + 1}
                      </span>
                      <span className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>
                        {q.category?.name || "General"}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--ink-900)" }}>{q.text}</div>
                    {q.solution && (
                      <div style={{ fontSize: "0.8rem", color: "var(--ink-600)", marginTop: "0.4em" }}>
                        💡 <strong>Answer:</strong> Choice {q.correctChoice} — {q.solution}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
