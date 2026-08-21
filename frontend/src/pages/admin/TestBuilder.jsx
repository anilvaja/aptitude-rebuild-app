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
  const [builderTab, setBuilderTab] = useState("MANUAL"); // MANUAL | AUTO_GENERATOR

  // Auto-Generator Blueprint State
  const [autoTotalCount, setAutoTotalCount] = useState(20);
  const [autoRules, setAutoRules] = useState([
    { subject: "Mathematics", categoryId: "ALL", subCategory: "ALL", difficulty: "ALL", percentage: 50 },
    { subject: "English", categoryId: "ALL", subCategory: "ALL", difficulty: "ALL", percentage: 50 },
  ]);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [autoGenSummary, setAutoGenSummary] = useState(null);

  function refresh() {
    api.get("/api/tests").then(setTests).catch((e) => setError(e.message));
    api.get("/api/categories").then(setCategories).catch(() => {});
  }

  useEffect(refresh, []);

  async function startCreate() {
    setError(null);
    setAutoGenSummary(null);
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
    setBuilderTab("MANUAL");
  }

  async function startEdit(testSummary) {
    setError(null);
    setAutoGenSummary(null);
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
    setBuilderTab("MANUAL");
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

  // Auto-Generator Rule Management
  function addAutoRule() {
    setAutoRules((prev) => [
      ...prev,
      { subject: "Claude Architecture", categoryId: "ALL", subCategory: "ALL", difficulty: "ALL", percentage: 0 },
    ]);
  }

  function updateAutoRule(index, patch) {
    setAutoRules((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      // Reset category if subject changed
      if (patch.subject && patch.subject !== "ALL") {
        next[index].categoryId = "ALL";
        next[index].subCategory = "ALL";
      }
      return next;
    });
  }

  function removeAutoRule(index) {
    setAutoRules((prev) => prev.filter((_, i) => i !== index));
  }

  // Calculate sum of weightages
  const totalWeightagePercent = useMemo(() => {
    return autoRules.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0);
  }, [autoRules]);

  const isWeightageValid = Math.round(totalWeightagePercent) === 100;

  async function executeAutoGeneration() {
    if (!isWeightageValid) return;
    setIsAutoGenerating(true);
    setError(null);
    setAutoGenSummary(null);

    try {
      const res = await api.post("/api/tests/auto-generate", {
        totalCount: autoTotalCount,
        rules: autoRules,
      });

      setForm((f) => ({
        ...f,
        selectedIds: res.selectedQuestionIds,
      }));
      setAutoGenSummary(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAutoGenerating(false);
    }
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

  const questionsById = useMemo(() => {
    const map = {};
    questions.forEach((q) => {
      map[q.id] = q;
    });
    return map;
  }, [questions]);

  // Unique subjects and categories for builder dropdowns
  const availableSubjects = useMemo(() => {
    const set = new Set();
    questions.forEach((q) => {
      if (q.subject) set.add(q.subject);
    });
    return Array.from(set);
  }, [questions]);

  return (
    <div>
      {/* Top Main Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.6em", flexWrap: "wrap", gap: "1em" }}>
        <div>
          <h1 style={{ margin: "0 0 0.2em 0", fontSize: "1.75rem", letterSpacing: "-0.01em" }}>
            Examination Papers & Assessments
          </h1>
          <p style={{ color: "var(--ink-500)", margin: 0, fontSize: "0.92rem" }}>
            Configure timed exam papers, assign target grades, shuffle questions, and auto-generate question sets by weightage blueprints.
          </p>
        </div>

        <button className="btn btn-primary" onClick={startCreate} style={{ fontWeight: 700 }}>
          + Create New Exam Paper
        </button>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: "1.2em" }}>⚠️ {error}</div>}

      {/* Test Catalog Filtering & Search */}
      <div
        className="card"
        style={{
          padding: "1em 1.4em",
          marginBottom: "1.6em",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1em",
        }}
      >
        <div style={{ display: "inline-flex", background: "var(--paper-100)", padding: "4px", borderRadius: "var(--radius-sm)", gap: "4px", flexWrap: "wrap" }}>
          {[
            { key: "all", label: "🌟 All Exams" },
            { key: "ccar", label: "🤖 Claude Architecture" },
            { key: "primary", label: "🎒 Primary School" },
            { key: "published", label: "✓ Published" },
            { key: "draft", label: "📝 Drafts" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                border: "none",
                background: activeTab === tab.key ? "#fff" : "transparent",
                color: activeTab === tab.key ? "var(--ink-900)" : "var(--ink-600)",
                fontWeight: activeTab === tab.key ? 700 : 500,
                padding: "0.45em 0.9em",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.84rem",
                cursor: "pointer",
                boxShadow: activeTab === tab.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ minWidth: "260px" }}>
          <input
            className="input"
            type="text"
            placeholder="🔍 Search exams by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: "0.88rem", padding: "0.45em 0.8em" }}
          />
        </div>
      </div>

      {/* Tests Grid */}
      {!tests ? (
        <p style={{ color: "var(--ink-500)" }}>Loading examination catalog…</p>
      ) : filteredTests.length === 0 ? (
        <div className="card" style={{ padding: "3.5em 2em", textAlign: "center", color: "var(--ink-500)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.4em" }}>🔍</div>
          <h3 style={{ color: "var(--ink-700)", margin: "0 0 0.3em 0" }}>No examination papers found</h3>
          <p style={{ margin: 0, fontSize: "0.9rem" }}>Click '+ Create New Exam Paper' to author an assessment.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1.2em" }}>
          {filteredTests.map((t) => {
            const isCCAR = t.title.toLowerCase().includes("ccar") || t.title.toLowerCase().includes("claude");
            const durationMins = Math.round((t.totalDurationSeconds || 0) / 60);

            return (
              <div
                key={t.id}
                className="card card-interactive"
                style={{
                  padding: "1.6em 1.8em",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--line)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1.2em",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6em", marginBottom: "0.4em", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: "1.15rem", color: "var(--ink-900)" }}>
                      {t.title}
                    </span>
                    <span className={`badge ${t.status === "PUBLISHED" ? "badge-ok" : "badge-warn"}`}>
                      {t.status === "PUBLISHED" ? "✓ Published" : "📝 Draft"}
                    </span>
                    <span className={`badge ${isCCAR ? "badge-purple" : "badge-indigo"}`} style={{ fontSize: "0.72rem" }}>
                      {isCCAR ? "🤖 Professional Architecture" : "🎒 Primary Track"}
                    </span>
                    {t.targetGrade && (
                      <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>
                        🎯 {t.targetGrade.replace("_", " ")}
                      </span>
                    )}
                  </div>

                  <p style={{ color: "var(--ink-600)", margin: "0 0 0.6em 0", fontSize: "0.88rem", maxWidth: "680px", lineHeight: "1.4" }}>
                    {t.description || "No description provided."}
                  </p>

                  <div style={{ display: "flex", gap: "1.2em", fontSize: "0.82rem", color: "var(--ink-500)", flexWrap: "wrap" }}>
                    <span>📚 <strong>{t.questionCount}</strong> Questions</span>
                    <span>⏱️ <strong>{durationMins}</strong> Mins Duration</span>
                    <span>🎲 Shuffle: <strong>{t.shuffleQuestions ? "Enabled" : "Off"}</strong></span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.6em", alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: "0.84rem", border: "1px solid var(--line)" }}
                    onClick={() => openPreview(t)}
                  >
                    👁️ Preview
                  </button>

                  <Link
                    to={`/admin/tests/${t.id}/analytics`}
                    className="btn btn-ghost"
                    style={{ fontSize: "0.84rem", border: "1px solid var(--line)" }}
                  >
                    📊 Analytics
                  </Link>

                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: "0.84rem", border: "1px solid var(--line)" }}
                    onClick={() => togglePublishStatus(t)}
                  >
                    {t.status === "PUBLISHED" ? "🔒 Unpublish" : "🚀 Publish"}
                  </button>

                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: "0.84rem", border: "1px solid var(--line)", fontWeight: 600 }}
                    onClick={() => startEdit(t)}
                  >
                    ✏️ Edit
                  </button>

                  <button
                    className="btn btn-danger"
                    style={{ fontSize: "0.84rem", padding: "0.4em 0.8em" }}
                    onClick={() => archive(t.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Test Creation / Editing Modal */}
      {form && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(20, 24, 31, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1.5em",
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: "1020px", maxHeight: "92vh", overflowY: "auto", padding: "2.2em", borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.4em" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.4rem" }}>
                  {form.id ? "Edit Examination Paper" : "Create New Examination Paper"}
                </h2>
                <span style={{ fontSize: "0.85rem", color: "var(--ink-500)" }}>
                  Configure assessment parameters, anti-cheat options, and assemble the question pool.
                </span>
              </div>
              <button
                onClick={() => setForm(null)}
                style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--ink-500)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={save} style={{ display: "grid", gap: "1.3em" }}>
              {/* Paper Settings */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1em" }}>
                <div>
                  <label className="label">Exam Paper Title *</label>
                  <input
                    className="input"
                    required
                    placeholder="e.g. Claude Certified Architect Practice Exam 1"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Target Grade / Eligibility *</label>
                  <select
                    className="input"
                    value={form.targetGrade || "PROFESSIONAL"}
                    onChange={(e) => setForm({ ...form, targetGrade: e.target.value })}
                  >
                    <option value="PROFESSIONAL">💼 Masters / Professional</option>
                    <option value="GRADE_2">🎒 Grade 2 (Class 2)</option>
                    <option value="GRADE_1">🎒 Grade 1 (Class 1)</option>
                    <option value="ALL">🌐 Open to All</option>
                  </select>
                </div>

                <div>
                  <label className="label">Initial Status</label>
                  <select
                    className="input"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="DRAFT">📝 Draft</option>
                    <option value="PUBLISHED">✓ Published</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Description / Instructions</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Instructions for students before starting the test..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Toggles */}
              <div style={{ display: "flex", gap: "2em", background: "var(--paper-100)", padding: "0.9em 1.2em", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5em", cursor: "pointer", fontWeight: 600, fontSize: "0.88rem" }}>
                  <input
                    type="checkbox"
                    checked={form.shuffleQuestions}
                    onChange={(e) => setForm({ ...form, shuffleQuestions: e.target.checked })}
                  />
                  🎲 Shuffle Question Order per Candidate (Anti-Cheat)
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "0.5em", cursor: "pointer", fontWeight: 600, fontSize: "0.88rem" }}>
                  <input
                    type="checkbox"
                    checked={form.autoSubmit}
                    onChange={(e) => setForm({ ...form, autoSubmit: e.target.checked })}
                  />
                  ⏱️ Enforce Auto-Submit on Timer Expiry
                </label>
              </div>

              {/* Question Pool Builder Tabs: Manual Selection vs Auto-Generator */}
              <div style={{ borderTop: "2px solid var(--line)", paddingTop: "1.2em" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1em", flexWrap: "wrap", gap: "0.8em" }}>
                  <div style={{ display: "inline-flex", background: "var(--paper-100)", padding: "4px", borderRadius: "var(--radius-sm)", gap: "4px" }}>
                    <button
                      type="button"
                      onClick={() => setBuilderTab("MANUAL")}
                      style={{
                        border: "none",
                        background: builderTab === "MANUAL" ? "#fff" : "transparent",
                        color: builderTab === "MANUAL" ? "var(--ink-900)" : "var(--ink-500)",
                        fontWeight: builderTab === "MANUAL" ? 700 : 500,
                        padding: "0.45em 0.9em",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.84rem",
                        cursor: "pointer",
                        boxShadow: builderTab === "MANUAL" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      }}
                    >
                      📋 Manual Question Selection
                    </button>

                    <button
                      type="button"
                      onClick={() => setBuilderTab("AUTO_GENERATOR")}
                      style={{
                        border: "none",
                        background: builderTab === "AUTO_GENERATOR" ? "#fff" : "transparent",
                        color: builderTab === "AUTO_GENERATOR" ? "var(--ink-900)" : "var(--ink-500)",
                        fontWeight: builderTab === "AUTO_GENERATOR" ? 700 : 500,
                        padding: "0.45em 0.9em",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.84rem",
                        cursor: "pointer",
                        boxShadow: builderTab === "AUTO_GENERATOR" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      }}
                    >
                      ⚡ Weightage & Blueprint Auto-Generator
                    </button>
                  </div>

                  {/* Summary Badges */}
                  <div style={{ display: "flex", gap: "0.8em", alignItems: "center" }}>
                    <span className="badge badge-indigo" style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                      Selected: {form.selectedIds.length} Questions
                    </span>
                    <span className="mono badge badge-neutral" style={{ fontSize: "0.82rem" }}>
                      ⏱️ {Math.round(totalDuration(form.selectedIds, form.overrides, questionsById) / 60)} mins
                    </span>
                    <span className="mono badge badge-neutral" style={{ fontSize: "0.82rem" }}>
                      ⚖️ {totalMarks(form.selectedIds, form.overrides, questionsById)} marks
                    </span>
                  </div>
                </div>

                {/* TAB 1: Weightage & Blueprint Auto-Generator */}
                {builderTab === "AUTO_GENERATOR" && (
                  <div style={{ background: "var(--paper-100)", padding: "1.4em", borderRadius: "var(--radius-md)", border: "1px solid var(--line)", marginBottom: "1.2em" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1em", flexWrap: "wrap", gap: "0.8em" }}>
                      <div>
                        <strong style={{ fontSize: "0.95rem", color: "var(--ink-900)" }}>
                          ⚡ Weightage-Based Blueprint Question Allocator
                        </strong>
                        <div style={{ fontSize: "0.82rem", color: "var(--ink-500)" }}>
                          Set percentage allocations across subjects and domains. The engine randomly samples and shuffles matching questions until 100% distribution is achieved.
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.6em" }}>
                        <label className="label" style={{ margin: 0, fontWeight: 700 }}>Total Questions to Pick:</label>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          className="input"
                          style={{ width: "90px", fontWeight: 700, padding: "0.35em 0.6em" }}
                          value={autoTotalCount}
                          onChange={(e) => setAutoTotalCount(Math.max(1, Number(e.target.value)))}
                        />
                      </div>
                    </div>

                    {/* Weightage Progress Bar & Live Validation Alert */}
                    <div style={{ marginBottom: "1.2em" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4em", fontSize: "0.84rem" }}>
                        <span style={{ fontWeight: 700, color: isWeightageValid ? "var(--ok-500)" : "var(--danger-500)" }}>
                          {isWeightageValid
                            ? "✓ Total Weightage: Exactly 100% Configured (Ready to Generate)"
                            : totalWeightagePercent < 100
                            ? `⚠️ Total Weightage: ${totalWeightagePercent}% / 100% (Add ${100 - totalWeightagePercent}% more)`
                            : `⚠️ Total Weightage: ${totalWeightagePercent}% / 100% (Exceeds 100% by ${totalWeightagePercent - 100}%)`}
                        </span>
                        <span className="mono" style={{ fontWeight: 700 }}>{totalWeightagePercent}% / 100%</span>
                      </div>

                      <div style={{ height: "8px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(100, totalWeightagePercent)}%`,
                            background: isWeightageValid ? "var(--ok-500)" : totalWeightagePercent > 100 ? "var(--danger-500)" : "var(--brass-500)",
                            transition: "all 0.2s ease",
                          }}
                        />
                      </div>
                    </div>

                    {/* Blueprint Rules Table */}
                    <div style={{ display: "grid", gap: "0.6em", marginBottom: "1em" }}>
                      {autoRules.map((rule, rIdx) => {
                        const calculatedCount = Math.round((Number(rule.percentage) / 100) * autoTotalCount);

                        const subjectCategories = categories.filter((c) => !c.parentId && (!rule.subject || rule.subject === "ALL" || c.subject === rule.subject));

                        return (
                          <div
                            key={rIdx}
                            style={{
                              background: "#fff",
                              padding: "0.8em 1em",
                              borderRadius: "var(--radius-sm)",
                              border: "1px solid var(--line)",
                              display: "grid",
                              gridTemplateColumns: "1.4fr 1.4fr 1.2fr 1fr auto",
                              gap: "0.8em",
                              alignItems: "center",
                            }}
                          >
                            {/* Subject */}
                            <div>
                              <label className="label" style={{ fontSize: "0.72rem" }}>Subject</label>
                              <select
                                className="input"
                                style={{ fontSize: "0.82rem", padding: "0.35em" }}
                                value={rule.subject}
                                onChange={(e) => updateAutoRule(rIdx, { subject: e.target.value })}
                              >
                                <option value="ALL">🌐 Any Subject</option>
                                <option value="Claude Architecture">🤖 Claude Architecture</option>
                                <option value="Mathematics">📐 Mathematics</option>
                                <option value="English">📖 English</option>
                                <option value="Computer Science">💻 Computer Science</option>
                              </select>
                            </div>

                            {/* Category */}
                            <div>
                              <label className="label" style={{ fontSize: "0.72rem" }}>Category</label>
                              <select
                                className="input"
                                style={{ fontSize: "0.82rem", padding: "0.35em" }}
                                value={rule.categoryId}
                                onChange={(e) => updateAutoRule(rIdx, { categoryId: e.target.value })}
                              >
                                <option value="ALL">📂 All Categories in Subject</option>
                                {subjectCategories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    📂 {c.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Difficulty */}
                            <div>
                              <label className="label" style={{ fontSize: "0.72rem" }}>Difficulty</label>
                              <select
                                className="input"
                                style={{ fontSize: "0.82rem", padding: "0.35em" }}
                                value={rule.difficulty}
                                onChange={(e) => updateAutoRule(rIdx, { difficulty: e.target.value })}
                              >
                                <option value="ALL">⭐ Any Difficulty</option>
                                <option value="EASY">Easy</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HARD">Hard</option>
                              </select>
                            </div>

                            {/* Percentage */}
                            <div>
                              <label className="label" style={{ fontSize: "0.72rem" }}>Weightage %</label>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.3em" }}>
                                <input
                                  type="number"
                                  min="1"
                                  max="100"
                                  className="input"
                                  style={{ width: "65px", fontWeight: 700, padding: "0.35em", fontSize: "0.84rem" }}
                                  value={rule.percentage}
                                  onChange={(e) => updateAutoRule(rIdx, { percentage: Number(e.target.value) })}
                                />
                                <span style={{ fontSize: "0.78rem", color: "var(--ink-500)" }}>
                                  % (~{calculatedCount} Qs)
                                </span>
                              </div>
                            </div>

                            {/* Delete Rule */}
                            <div style={{ paddingTop: "1.1em" }}>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ color: "var(--danger-500)", padding: "0.3em 0.5em" }}
                                onClick={() => removeAutoRule(rIdx)}
                                title="Remove Rule"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Action Bar for Auto Generator */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.8em" }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={addAutoRule}
                        style={{ background: "#fff", border: "1px solid var(--line)", fontSize: "0.82rem", fontWeight: 600 }}
                      >
                        + Add Category Weightage Rule
                      </button>

                      <button
                        type="button"
                        className="btn btn-accent"
                        disabled={!isWeightageValid || isAutoGenerating}
                        onClick={executeAutoGeneration}
                        style={{ fontWeight: 700, padding: "0.55em 1.4em" }}
                      >
                        {isAutoGenerating ? "Sampling & Shuffling…" : `🎲 Shuffle & Auto-Generate (${autoTotalCount} Questions)`}
                      </button>
                    </div>

                    {/* Generated Breakdown Summary */}
                    {autoGenSummary && (
                      <div style={{ marginTop: "1em", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "var(--radius-sm)", padding: "0.9em 1.1em" }}>
                        <strong style={{ color: "#166534", fontSize: "0.88rem", display: "block", marginBottom: "0.4em" }}>
                          🎉 Successfully selected and shuffled {autoGenSummary.totalGenerated} questions across {autoGenSummary.breakdown.length} blueprint rules!
                        </strong>
                        <div style={{ display: "grid", gap: "0.3em", fontSize: "0.8rem", color: "#15803d" }}>
                          {autoGenSummary.breakdown.map((b, idx) => (
                            <div key={idx}>
                              • <strong>{b.subject}</strong> ({b.percentage}% weightage): Picked <strong>{b.selectedCount}</strong> questions from {b.availableCount} available in bank.
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: Manual Selection & Question Pool Browser */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8em", flexWrap: "wrap", gap: "0.8em" }}>
                    <div style={{ display: "flex", gap: "0.6em", alignItems: "center", flexWrap: "wrap" }}>
                      <select
                        className="input"
                        style={{ fontSize: "0.82rem", padding: "0.35em 0.6em", width: "auto" }}
                        value={poolSubjectFilter}
                        onChange={(e) => {
                          setPoolSubjectFilter(e.target.value);
                          setPoolCatFilter("ALL");
                        }}
                      >
                        <option value="ALL">All Subjects</option>
                        {availableSubjects.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>

                      <select
                        className="input"
                        style={{ fontSize: "0.82rem", padding: "0.35em 0.6em", width: "auto" }}
                        value={poolCatFilter}
                        onChange={(e) => setPoolCatFilter(e.target.value)}
                      >
                        <option value="ALL">All Categories</option>
                        {categories
                          .filter((c) => !c.parentId && (poolSubjectFilter === "ALL" || c.subject === poolSubjectFilter))
                          .map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                      </select>

                      <input
                        type="text"
                        className="input"
                        placeholder="Search pool..."
                        style={{ fontSize: "0.82rem", padding: "0.35em 0.6em", width: "160px" }}
                        value={poolSearchQuery}
                        onChange={(e) => setPoolSearchQuery(e.target.value)}
                      />
                    </div>

                    <div style={{ display: "flex", gap: "0.6em" }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ fontSize: "0.78rem", padding: "0.3em 0.6em", border: "1px solid var(--line)" }}
                        onClick={() => selectAllFiltered(filteredPoolQuestions)}
                      >
                        ✓ Select All Filtered ({filteredPoolQuestions.length})
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ fontSize: "0.78rem", padding: "0.3em 0.6em", border: "1px solid var(--line)" }}
                        onClick={() => deselectAllFiltered(filteredPoolQuestions)}
                      >
                        Deselect All Filtered
                      </button>
                    </div>
                  </div>

                  {/* Pool Questions Scrollbox */}
                  <div
                    style={{
                      maxHeight: "360px",
                      overflowY: "auto",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.8em",
                      display: "grid",
                      gap: "0.5em",
                      background: "var(--paper-100)",
                    }}
                  >
                    {filteredPoolQuestions.map((q, idx) => {
                      const isSelected = form.selectedIds.includes(q.id);

                      return (
                        <div
                          key={q.id}
                          onClick={() => toggleQuestion(q.id)}
                          style={{
                            background: isSelected ? "rgba(201, 150, 47, 0.12)" : "#fff",
                            border: isSelected ? "1px solid var(--brass-500)" : "1px solid var(--line)",
                            borderRadius: "var(--radius-sm)",
                            padding: "0.7em 0.9em",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "0.8em",
                            cursor: "pointer",
                            transition: "all 0.12s ease",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by parent onClick
                            style={{ marginTop: "0.25em", cursor: "pointer" }}
                          />

                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", gap: "0.4em", alignItems: "center", marginBottom: "0.2em", flexWrap: "wrap" }}>
                              <span className="mono" style={{ fontSize: "0.72rem", color: "var(--ink-500)" }}>#{idx + 1}</span>
                              {q.subject && <span className="badge badge-neutral" style={{ fontSize: "0.68rem" }}>{q.subject}</span>}
                              {q.category && <span className="badge badge-indigo" style={{ fontSize: "0.68rem" }}>{q.category.name}</span>}
                              {q.subCategory && <span className="badge badge-purple" style={{ fontSize: "0.68rem" }}>{q.subCategory}</span>}
                              <span className="badge badge-neutral" style={{ fontSize: "0.68rem" }}>{q.difficulty}</span>
                              {q.imageUrl && <span className="badge badge-accent" style={{ fontSize: "0.68rem" }}>🖼️ Diagram</span>}
                            </div>

                            <div style={{ fontSize: "0.88rem", fontWeight: isSelected ? 600 : 400, color: "var(--ink-900)", lineHeight: "1.35" }}>
                              {q.text}
                            </div>
                          </div>

                          <div className="mono" style={{ fontSize: "0.78rem", color: "var(--ink-500)", flexShrink: 0 }}>
                            {q.marks} pt · {q.defaultTimeSeconds}s
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8em", marginTop: "0.6em" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 700, padding: "0.6em 1.6em" }}>
                  Save Examination Paper
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Preview Modal */}
      {previewTest && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(20, 24, 31, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1.5em",
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: "800px", maxHeight: "90vh", overflowY: "auto", padding: "2.2em", borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2em" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.35rem" }}>{previewTest.title}</h2>
                <span style={{ fontSize: "0.85rem", color: "var(--ink-500)" }}>
                  {previewTest.testQuestions.length} Questions Pool · Duration: {Math.round((previewTest.totalDurationSeconds || 0) / 60)} Mins
                </span>
              </div>
              <button
                onClick={() => setPreviewTest(null)}
                style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--ink-500)" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gap: "0.8em", maxHeight: "60vh", overflowY: "auto", paddingRight: "4px" }}>
              {previewTest.testQuestions.map((tq, idx) => (
                <div key={tq.id} style={{ background: "var(--paper-100)", padding: "1em 1.2em", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3em" }}>
                    <div style={{ display: "flex", gap: "0.4em", alignItems: "center" }}>
                      <span className="mono" style={{ fontSize: "0.82rem", fontWeight: 700 }}>#{idx + 1}</span>
                      {tq.question.subject && <span className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>{tq.question.subject}</span>}
                      {tq.question.category && <span className="badge badge-indigo" style={{ fontSize: "0.7rem" }}>{tq.question.category.name}</span>}
                    </div>
                    <span className="mono badge badge-neutral" style={{ fontSize: "0.75rem" }}>
                      {tq.marksOverride || tq.question.marks} pt
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--ink-900)" }}>
                    {tq.question.text}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.2em" }}>
              <button className="btn btn-ghost" onClick={() => setPreviewTest(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
