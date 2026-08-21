import { useEffect, useState, useMemo } from "react";
import { api } from "../../api/client";
import { parseExcelOrCsv, downloadExcel, downloadCSV, SAMPLE_QUESTIONS } from "../../utils/excelImportExport";

const EMPTY_FORM = {
  type: "MCQ",
  text: "",
  choiceA: "",
  choiceB: "",
  choiceC: "",
  choiceD: "",
  choiceE: "",
  correctChoice: "A",
  imageUrl: "",
  imageCaption: "",
  solution: "",
  marks: 1,
  negativeMarks: 0,
  defaultTimeSeconds: 60,
  difficulty: "MEDIUM",
  subject: "Claude Architecture",
  categoryId: "",
  subCategory: "",
  status: "ACTIVE",
};

export default function QuestionBank() {
  const [questions, setQuestions] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState({ type: "ALL", id: null, name: "All Categories", parentId: null });
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState(null); // null = list view, object = editing/creating
  const [error, setError] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [expandedParents, setExpandedParents] = useState({});
  const [expandedSolutions, setExpandedSolutions] = useState({});

  // Category creation form state
  const [isSubcategoryMode, setIsSubcategoryMode] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSubject, setNewCatSubject] = useState("Claude Architecture");
  const [newCatParentId, setNewCatParentId] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Bulk Import state
  const [importFile, setImportFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  function refresh() {
    api.get("/api/questions").then(setQuestions);
    api.get("/api/categories").then((cats) => {
      setCategories(cats);
      // Auto-expand all parent categories initially
      const initExpanded = {};
      cats.forEach((c) => {
        if (!c.parentId) initExpanded[c.id] = true;
      });
      setExpandedParents(initExpanded);
    });
  }

  useEffect(refresh, []);

  // Toggle parent category expand/collapse
  function toggleExpandParent(parentId, e) {
    e.stopPropagation();
    setExpandedParents((prev) => ({ ...prev, [parentId]: !prev[parentId] }));
  }

  // Handle file selection and parsing for import
  async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    setIsParsing(true);
    setImportResult(null);
    setError(null);
    try {
      const data = await parseExcelOrCsv(file);
      setParsedRows(data);
    } catch (err) {
      setError(`Failed to read file: ${err.message}`);
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  }

  async function executeBulkImport() {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    setError(null);
    setImportResult(null);
    try {
      const res = await api.post("/api/questions/bulk-import", { questions: parsedRows });
      setImportResult(res);
      refresh();
      if (res.importedCount > 0 && res.errors?.length === 0) {
        setTimeout(() => {
          setShowImportModal(false);
          setImportFile(null);
          setParsedRows([]);
          setImportResult(null);
        }, 2000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsImporting(false);
    }
  }

  // Handle image upload from file picker in Question form
  function handleQuestionImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setForm((f) => ({ ...f, imageUrl: uploadEvent.target.result }));
    };
    reader.readAsDataURL(file);
  }

  // Build hierarchical category tree with subcategories & question counts
  const { categoryTree, totalQuestionsCount } = useMemo(() => {
    if (!questions || !categories) return { categoryTree: {}, totalQuestionsCount: 0 };

    const total = questions.length;

    const parentCats = categories.filter((c) => !c.parentId);
    const childCats = categories.filter((c) => c.parentId);

    const childrenByParent = {};
    childCats.forEach((child) => {
      if (!childrenByParent[child.parentId]) childrenByParent[child.parentId] = [];
      childrenByParent[child.parentId].push(child);
    });

    const countByCatId = {};
    const countByCatAndSub = {};
    let uncategorizedCount = 0;

    questions.forEach((q) => {
      if (q.categoryId) {
        countByCatId[q.categoryId] = (countByCatId[q.categoryId] || 0) + 1;
        if (q.subCategory) {
          const key = `${q.categoryId}:::${q.subCategory.trim().toLowerCase()}`;
          countByCatAndSub[key] = (countByCatAndSub[key] || 0) + 1;
        }
      } else {
        uncategorizedCount++;
      }
    });

    const tree = {};

    parentCats.forEach((parent) => {
      const subject = parent.subject || "Claude Architecture";
      if (!tree[subject]) tree[subject] = [];

      const registeredChildren = childrenByParent[parent.id] || [];
      const subcatSet = new Map();
      registeredChildren.forEach((ch) => subcatSet.set(ch.name.toLowerCase(), { id: ch.id, name: ch.name }));

      questions
        .filter((q) => q.categoryId === parent.id && q.subCategory)
        .forEach((q) => {
          const lower = q.subCategory.trim().toLowerCase();
          if (!subcatSet.has(lower)) {
            subcatSet.set(lower, { id: `SUB_${q.subCategory}`, name: q.subCategory });
          }
        });

      const subcategories = Array.from(subcatSet.values()).map((sub) => {
        const key = `${parent.id}:::${sub.name.trim().toLowerCase()}`;
        return {
          id: sub.id,
          name: sub.name,
          parentId: parent.id,
          count: countByCatAndSub[key] || countByCatId[sub.id] || 0,
        };
      });

      const parentCount = countByCatId[parent.id] || 0;

      tree[subject].push({
        id: parent.id,
        name: parent.name,
        subject,
        count: parentCount,
        subcategories,
      });
    });

    if (uncategorizedCount > 0) {
      if (!tree["General"]) tree["General"] = [];
      tree["General"].push({
        id: "UNCATEGORIZED",
        name: "Uncategorized Questions",
        subject: "General",
        count: uncategorizedCount,
        subcategories: [],
      });
    }

    return { categoryTree: tree, totalQuestionsCount: total };
  }, [questions, categories]);

  // Filtered questions based on selected Parent/Child and search query
  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    return questions.filter((q) => {
      if (selectedFilter.type === "ALL") {
        // match all
      } else if (selectedFilter.type === "PARENT") {
        if (q.categoryId !== selectedFilter.id) return false;
      } else if (selectedFilter.type === "SUBCATEGORY") {
        const matchParent = q.categoryId === selectedFilter.parentId;
        const matchSubName = q.subCategory?.trim().toLowerCase() === selectedFilter.name?.trim().toLowerCase();
        const matchChildCatId = q.categoryId === selectedFilter.id;
        if (!((matchParent && matchSubName) || matchChildCatId)) return false;
      } else if (selectedFilter.type === "UNCATEGORIZED") {
        if (q.categoryId) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchText = q.text?.toLowerCase().includes(query);
        const matchSub = q.subCategory?.toLowerCase().includes(query);
        const matchSubj = q.subject?.toLowerCase().includes(query);
        const matchCat = q.category?.name?.toLowerCase().includes(query);
        return matchText || matchSub || matchSubj || matchCat;
      }

      return true;
    });
  }, [questions, selectedFilter, searchQuery]);

  function toggleSolution(id) {
    setExpandedSolutions((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function edit(q) {
    setForm({
      ...EMPTY_FORM,
      ...q,
      categoryId: q.categoryId || "",
      correctChoice: q.correctChoice || "A",
      imageUrl: q.imageUrl || "",
      imageCaption: q.imageCaption || "",
      subject: q.subject || q.category?.subject || "Claude Architecture",
      subCategory: q.subCategory || "",
    });
  }

  function setField(field) {
    return (e) => {
      const val = e.target.type === "number" ? Number(e.target.value) : e.target.value;
      setForm((f) => ({ ...f, [field]: val }));
    };
  }

  async function save(e) {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        ...form,
        categoryId: form.categoryId || null,
        subject: form.subject || null,
        subCategory: form.subCategory || null,
        imageUrl: form.imageUrl?.trim() || null,
        imageCaption: form.imageCaption?.trim() || null,
        marks: Number(form.marks),
        negativeMarks: Number(form.negativeMarks),
        defaultTimeSeconds: Number(form.defaultTimeSeconds),
      };
      if (form.id) {
        await api.put(`/api/questions/${form.id}`, payload);
      } else {
        await api.post("/api/questions", payload);
      }
      setForm(null);
      refresh();
    } catch (err) {
      setError(err.details ? err.details.map((d) => d.message).join(" ") : err.message);
    }
  }

  async function remove(id) {
    if (!confirm("Retire this question? It will no longer be selectable for new tests.")) return;
    await api.delete(`/api/questions/${id}`);
    refresh();
  }

  async function handleCreateCategory(e) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsAddingCategory(true);
    try {
      await api.post("/api/categories", {
        name: newCatName.trim(),
        subject: newCatSubject || null,
        parentId: isSubcategoryMode ? newCatParentId || null : null,
      });
      setNewCatName("");
      setShowCategoryModal(false);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAddingCategory(false);
    }
  }

  const availableSubcategoriesForForm = useMemo(() => {
    if (!form || !form.categoryId) return [];
    const parent = categories.find((c) => c.id === form.categoryId);
    if (!parent) return [];

    const subcats = new Set();
    categories.filter((c) => c.parentId === parent.id).forEach((c) => subcats.add(c.name));
    if (questions) {
      questions
        .filter((q) => q.categoryId === parent.id && q.subCategory)
        .forEach((q) => subcats.add(q.subCategory));
    }
    return Array.from(subcats);
  }, [form?.categoryId, categories, questions]);

  return (
    <div>
      {/* Top Action Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.6em", flexWrap: "wrap", gap: "1em" }}>
        <div>
          <h1 style={{ margin: "0 0 0.2em 0", fontSize: "1.75rem", letterSpacing: "-0.01em" }}>
            Question Bank Management
          </h1>
          <p style={{ color: "var(--ink-500)", margin: 0, fontSize: "0.92rem" }}>
            Browse hierarchy tree, author questions with diagrams/images, and bulk import question banks via Excel (.xlsx) or CSV.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.8em", alignItems: "center", flexWrap: "wrap" }}>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setShowImportModal(true);
              setImportFile(null);
              setParsedRows([]);
              setImportResult(null);
            }}
            style={{ border: "1px solid var(--line)", background: "#fff", fontWeight: 600 }}
          >
            📥 Import Questions (Excel / CSV)
          </button>

          <button
            className="btn btn-ghost"
            onClick={() => setShowCategoryModal(true)}
            style={{ border: "1px solid var(--line)", background: "#fff", fontWeight: 600 }}
          >
            📁 + Add Category / Subcategory
          </button>

          <button
            className="btn btn-accent"
            onClick={() => {
              const defaultCatId = selectedFilter.type === "PARENT" ? selectedFilter.id : selectedFilter.parentId || "";
              const defaultSub = selectedFilter.type === "SUBCATEGORY" ? selectedFilter.name : "";
              setForm({
                ...EMPTY_FORM,
                categoryId: defaultCatId,
                subCategory: defaultSub,
              });
            }}
            style={{ fontWeight: 700 }}
          >
            + Add New Question
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Bulk Import Questions Modal */}
      {showImportModal && (
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
          <div className="card" style={{ width: "100%", maxWidth: "840px", maxHeight: "90vh", overflowY: "auto", padding: "2.2em", borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2em" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.35rem" }}>Bulk Import Questions (Excel / CSV)</h2>
                <p style={{ color: "var(--ink-500)", margin: "0.2em 0 0 0", fontSize: "0.88rem" }}>
                  Upload an Excel (.xlsx) or CSV file with your questions and diagrams. Missing categories are auto-created.
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--ink-500)" }}
              >
                ✕
              </button>
            </div>

            {/* Download Sample Templates Banner */}
            <div
              style={{
                background: "var(--paper-100)",
                padding: "1.2em 1.4em",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--line)",
                marginBottom: "1.4em",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1em",
              }}
            >
              <div>
                <strong style={{ fontSize: "0.92rem", display: "block", color: "var(--ink-900)" }}>
                  Need the sample format template?
                </strong>
                <span style={{ fontSize: "0.82rem", color: "var(--ink-500)" }}>
                  Includes pre-configured columns: subject, category, subCategory, type, text, choiceA-E, correctChoice, imageUrl, imageCaption, solution, marks, negativeMarks, defaultTimeSeconds, difficulty.
                </span>
              </div>

              <div style={{ display: "flex", gap: "0.6em" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => downloadExcel(SAMPLE_QUESTIONS, "sample_questions_template", "Questions")}
                  style={{ background: "#fff", border: "1px solid var(--line)", fontSize: "0.82rem", fontWeight: 600 }}
                >
                  📊 Download Excel (.xlsx)
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => downloadCSV(SAMPLE_QUESTIONS, "sample_questions_template")}
                  style={{ background: "#fff", border: "1px solid var(--line)", fontSize: "0.82rem", fontWeight: 600 }}
                >
                  📄 Download CSV (.csv)
                </button>
              </div>
            </div>

            {/* File Upload Drop Area */}
            <div style={{ marginBottom: "1.4em" }}>
              <label className="label" style={{ fontWeight: 700 }}>
                Select File to Import (.xlsx, .xls, .csv)
              </label>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                className="input"
                onChange={handleFileSelect}
                style={{ padding: "0.6em", background: "#fff" }}
              />
            </div>

            {isParsing && <p style={{ color: "var(--ink-500)" }}>Reading and validating file data…</p>}

            {/* Parsed Rows Preview */}
            {parsedRows.length > 0 && (
              <div style={{ marginBottom: "1.4em" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6em" }}>
                  <strong style={{ fontSize: "0.92rem" }}>
                    ✓ Ready to Import: {parsedRows.length} Questions Detected
                  </strong>
                  <span className="mono" style={{ fontSize: "0.8rem", color: "var(--ink-500)" }}>
                    Showing first {Math.min(parsedRows.length, 3)} rows
                  </span>
                </div>

                <div style={{ display: "grid", gap: "0.6em", maxHeight: "240px", overflowY: "auto", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "0.6em", background: "var(--paper-100)" }}>
                  {parsedRows.slice(0, 3).map((r, i) => (
                    <div key={i} style={{ background: "#fff", padding: "0.7em", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", fontSize: "0.82rem" }}>
                      <div style={{ display: "flex", gap: "0.4em", marginBottom: "0.2em", alignItems: "center" }}>
                        <span className="badge badge-neutral" style={{ fontSize: "0.68rem" }}>Row #{i + 1}</span>
                        <span className="badge badge-indigo" style={{ fontSize: "0.68rem" }}>{r.subject || "General"}</span>
                        <span className="badge badge-purple" style={{ fontSize: "0.68rem" }}>{r.category || "Uncategorized"}</span>
                        <span className="badge badge-ok" style={{ fontSize: "0.68rem" }}>Ans: {r.correctChoice || "A"}</span>
                        {r.imageUrl && <span className="badge badge-accent" style={{ fontSize: "0.68rem" }}>🖼️ Has Diagram</span>}
                      </div>
                      <div style={{ fontWeight: 600, color: "var(--ink-900)" }}>{r.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Import Status / Errors Display */}
            {importResult && (
              <div style={{ marginBottom: "1.4em" }}>
                <div
                  style={{
                    padding: "0.9em 1.2em",
                    borderRadius: "var(--radius-md)",
                    background: importResult.importedCount > 0 ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                    border: `1px solid ${importResult.importedCount > 0 ? "var(--ok-500)" : "var(--danger-500)"}`,
                    color: "var(--ink-900)",
                    fontWeight: 600,
                  }}
                >
                  🎉 Successfully imported {importResult.importedCount} questions!
                </div>

                {importResult.errors?.length > 0 && (
                  <div style={{ marginTop: "0.8em", background: "#fef2f2", padding: "0.8em", borderRadius: "var(--radius-sm)", border: "1px solid #f87171" }}>
                    <strong style={{ color: "#991b1b", fontSize: "0.85rem", display: "block", marginBottom: "0.4em" }}>
                      ⚠️ Warnings / Errors on {importResult.errors.length} Rows:
                    </strong>
                    <div style={{ display: "grid", gap: "0.3em", maxHeight: "120px", overflowY: "auto", fontSize: "0.78rem", color: "#7f1d1d" }}>
                      {importResult.errors.map((err, idx) => (
                        <div key={idx}>
                          • <strong>Row {err.row}:</strong> {err.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8em" }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowImportModal(false)}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={parsedRows.length === 0 || isImporting}
                onClick={executeBulkImport}
                style={{ fontWeight: 700, padding: "0.6em 1.6em" }}
              >
                {isImporting ? "Importing…" : `Confirm Import (${parsedRows.length} Questions)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category / Subcategory Creation Modal */}
      {showCategoryModal && (
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
            padding: "1em",
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: "540px", padding: "2em", borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2em" }}>
              <h2 style={{ margin: 0, fontSize: "1.3rem" }}>Add Category or Subcategory</h2>
              <button
                onClick={() => setShowCategoryModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--ink-500)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCategory} style={{ display: "grid", gap: "1.1em" }}>
              <div style={{ display: "flex", gap: "1em", background: "var(--paper-100)", padding: "0.8em 1em", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4em", cursor: "pointer", fontWeight: !isSubcategoryMode ? 700 : 400 }}>
                  <input
                    type="radio"
                    name="catType"
                    checked={!isSubcategoryMode}
                    onChange={() => setIsSubcategoryMode(false)}
                  />
                  📂 Top-Level Category
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "0.4em", cursor: "pointer", fontWeight: isSubcategoryMode ? 700 : 400 }}>
                  <input
                    type="radio"
                    name="catType"
                    checked={isSubcategoryMode}
                    onChange={() => setIsSubcategoryMode(true)}
                  />
                  🔹 Child Subcategory
                </label>
              </div>

              {isSubcategoryMode && (
                <div>
                  <label className="label">Parent Category *</label>
                  <select
                    className="input"
                    required={isSubcategoryMode}
                    value={newCatParentId}
                    onChange={(e) => {
                      setNewCatParentId(e.target.value);
                      const parent = categories.find((c) => c.id === e.target.value);
                      if (parent?.subject) setNewCatSubject(parent.subject);
                    }}
                  >
                    <option value="">Select Parent Category...</option>
                    {categories
                      .filter((c) => !c.parentId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          📂 {c.subject ? `[${c.subject}] ` : ""}{c.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="label">
                  {isSubcategoryMode ? "Subcategory Name *" : "Category Name *"}
                </label>
                <input
                  className="input"
                  required
                  placeholder={isSubcategoryMode ? "e.g. 2D Shapes or ReAct Loops" : "e.g. Geometry or Agentic Architecture"}
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Subject / Track *</label>
                <select
                  className="input"
                  value={newCatSubject}
                  onChange={(e) => setNewCatSubject(e.target.value)}
                >
                  <option value="Claude Architecture">Claude Architecture</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="English">English</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="General Aptitude">General Aptitude</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8em", marginTop: "0.6em" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCategoryModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isAddingCategory}>
                  {isAddingCategory ? "Saving…" : isSubcategoryMode ? "Create Subcategory" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Edit / Create Modal Form */}
      {form && (
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
            overflowY: "auto",
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: "780px", maxHeight: "90vh", overflowY: "auto", padding: "2.2em", borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2em" }}>
              <h2 style={{ margin: 0, fontSize: "1.35rem" }}>{form.id ? "Edit Question" : "Create New Question"}</h2>
              <button
                onClick={() => setForm(null)}
                style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--ink-500)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={save} style={{ display: "grid", gap: "1.1em" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.3fr 1.3fr", gap: "0.9em" }}>
                <div>
                  <label className="label">Subject</label>
                  <select
                    className="input"
                    value={form.subject || "Claude Architecture"}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, subject: e.target.value, categoryId: "", subCategory: "" }));
                    }}
                  >
                    <option value="Claude Architecture">Claude Architecture</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="English">English</option>
                    <option value="Computer Science">Computer Science</option>
                  </select>
                </div>

                <div>
                  <label className="label">Category (Parent) *</label>
                  <select
                    className="input"
                    required
                    value={form.categoryId}
                    onChange={(e) => {
                      const selectedCat = categories.find((c) => c.id === e.target.value);
                      setForm((f) => ({
                        ...f,
                        categoryId: e.target.value,
                        subject: selectedCat?.subject || f.subject,
                        subCategory: "",
                      }));
                    }}
                  >
                    <option value="">Select Category...</option>
                    {categories
                      .filter((c) => !c.parentId && (!form.subject || c.subject === form.subject))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          📂 {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="label">Subcategory (Child)</label>
                  <input
                    className="input"
                    list="subcat-options"
                    placeholder="e.g. 2D Shapes or ReAct Loops"
                    value={form.subCategory || ""}
                    onChange={setField("subCategory")}
                  />
                  <datalist id="subcat-options">
                    {availableSubcategoriesForForm.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="label">Question Statement *</label>
                <textarea
                  className="input"
                  rows={3}
                  required
                  placeholder="Enter full question text..."
                  value={form.text}
                  onChange={setField("text")}
                  style={{ lineHeight: "1.45" }}
                />
              </div>

              {/* Question Diagram / Image Upload & URL */}
              <div style={{ background: "var(--paper-100)", padding: "1.1em", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.6em", color: "var(--ink-800)" }}>
                  🖼️ Question Diagram / Illustration (Optional)
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8em", marginBottom: "0.8em" }}>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem" }}>Image URL or Web Link</label>
                    <input
                      className="input"
                      placeholder="https://... or data:image/..."
                      value={form.imageUrl || ""}
                      onChange={setField("imageUrl")}
                      style={{ fontSize: "0.84rem" }}
                    />
                  </div>

                  <div>
                    <label className="label" style={{ fontSize: "0.75rem" }}>Or Upload Local File</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="input"
                      onChange={handleQuestionImageUpload}
                      style={{ fontSize: "0.82rem", padding: "0.3em" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="label" style={{ fontSize: "0.75rem" }}>Figure Caption / Alt Title (Optional)</label>
                  <input
                    className="input"
                    placeholder="e.g. Figure 1: ReAct Agent Architecture Workflow"
                    value={form.imageCaption || ""}
                    onChange={setField("imageCaption")}
                    style={{ fontSize: "0.84rem" }}
                  />
                </div>

                {/* Live Image Preview */}
                {form.imageUrl && (
                  <div style={{ marginTop: "0.8em", textAlign: "center", position: "relative" }}>
                    <div style={{ display: "inline-block", background: "#fff", padding: "6px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)" }}>
                      <img
                        src={form.imageUrl}
                        alt="Question Preview"
                        style={{ maxWidth: "100%", maxHeight: "180px", objectFit: "contain", borderRadius: "var(--radius-sm)" }}
                      />
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, imageUrl: "", imageCaption: "" }))}
                        style={{ display: "block", margin: "4px auto 0", background: "none", border: "none", color: "var(--danger-500)", fontSize: "0.75rem", cursor: "pointer" }}
                      >
                        ✕ Remove Image
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {form.type === "MCQ" && (
                <div style={{ background: "var(--paper-100)", padding: "1.2em", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.8em", color: "var(--ink-700)" }}>
                    Multiple Choice Options
                  </div>
                  <div style={{ display: "grid", gap: "0.8em" }}>
                    {["A", "B", "C", "D", "E"].map((k) => (
                      <div key={k} style={{ display: "flex", alignItems: "center", gap: "0.8em" }}>
                        <span className="mono" style={{ fontWeight: 700, width: "24px", color: "var(--ink-700)" }}>
                          {k}.
                        </span>
                        <input
                          className="input"
                          placeholder={`Option ${k}${k === "A" || k === "B" ? " (required)" : " (optional)"}`}
                          value={form[`choice${k}`] || ""}
                          onChange={setField(`choice${k}`)}
                          style={{ flex: 1 }}
                        />
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: "1em", display: "flex", alignItems: "center", gap: "1em" }}>
                    <label className="label" style={{ margin: 0, fontWeight: 700 }}>
                      Correct Choice:
                    </label>
                    <select
                      className="input"
                      style={{ width: "120px", fontWeight: 700 }}
                      value={form.correctChoice}
                      onChange={setField("correctChoice")}
                    >
                      {["A", "B", "C", "D", "E"]
                        .filter((k) => form[`choice${k}`])
                        .map((k) => (
                          <option key={k} value={k}>
                            Choice {k}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="label">Model Solution / Explanation Rationale</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Explain why the correct answer is right and why other choices are wrong..."
                  value={form.solution || ""}
                  onChange={setField("solution")}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.8em" }}>
                <div>
                  <label className="label">Marks (+)</label>
                  <input className="input" type="number" min="0.5" step="0.5" value={form.marks} onChange={setField("marks")} />
                </div>
                <div>
                  <label className="label">Negative Marks (-)</label>
                  <input className="input" type="number" min="0" step="0.25" value={form.negativeMarks} onChange={setField("negativeMarks")} />
                </div>
                <div>
                  <label className="label">Time (Seconds)</label>
                  <input className="input" type="number" min="10" value={form.defaultTimeSeconds} onChange={setField("defaultTimeSeconds")} />
                </div>
                <div>
                  <label className="label">Difficulty</label>
                  <select className="input" value={form.difficulty} onChange={setField("difficulty")}>
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8em", marginTop: "0.8em" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: "0.6em 1.5em" }}>
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main 2-Column Layout: Left Hierarchical Category/Subcategory Tree + Right Question Bank */}
      <div style={{ display: "grid", gridTemplateColumns: "310px 1fr", gap: "1.6em", alignItems: "start" }}>
        {/* Left Category & Subcategory Sidebar Tree */}
        <div
          className="card"
          style={{
            padding: "1.2em",
            borderRadius: "var(--radius-lg)",
            position: "sticky",
            top: "1.5em",
            maxHeight: "calc(100vh - 3em)",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "1.2em"
          }}
        >
          <div>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em", color: "var(--ink-500)", marginBottom: "0.8em" }}>
              📁 Categories & Subcategories
            </div>

            {/* All Questions Top Tab */}
            <button
              onClick={() => setSelectedFilter({ type: "ALL", id: null, name: "All Categories", parentId: null })}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.7em 0.9em",
                borderRadius: "var(--radius-md)",
                border: "none",
                background: selectedFilter.type === "ALL" ? "var(--ink-900)" : "transparent",
                color: selectedFilter.type === "ALL" ? "#fff" : "var(--ink-800)",
                fontWeight: selectedFilter.type === "ALL" ? 700 : 500,
                fontSize: "0.88rem",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
                marginBottom: "0.4em"
              }}
            >
              <span>🌟 All Questions</span>
              <span
                className="mono"
                style={{
                  fontSize: "0.76rem",
                  background: selectedFilter.type === "ALL" ? "rgba(255,255,255,0.2)" : "var(--paper-100)",
                  color: selectedFilter.type === "ALL" ? "#fff" : "var(--ink-600)",
                  padding: "0.15em 0.55em",
                  borderRadius: "999px"
                }}
              >
                {totalQuestionsCount}
              </span>
            </button>
          </div>

          {/* Grouped Subjects & Parent/Child Categories */}
          {Object.entries(categoryTree).map(([subject, parentList]) => {
            const subjectIcon = subject.includes("Claude") ? "🤖" : subject.includes("Math") ? "📐" : subject.includes("English") ? "📖" : "📁";
            const subjectTotal = parentList.reduce((sum, p) => sum + p.count, 0);

            return (
              <div key={subject}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", color: "var(--ink-500)", marginBottom: "0.5em" }}>
                  <span>{subjectIcon} {subject}</span>
                  <span className="mono" style={{ fontSize: "0.72rem" }}>({subjectTotal})</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  {parentList.map((parent) => {
                    const isParentSelected = selectedFilter.type === "PARENT" && selectedFilter.id === parent.id;
                    const isExpanded = expandedParents[parent.id];
                    const hasChildren = parent.subcategories && parent.subcategories.length > 0;

                    return (
                      <div key={parent.id} style={{ display: "flex", flexDirection: "column" }}>
                        {/* Parent Category Row */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            borderRadius: "var(--radius-sm)",
                            background: isParentSelected ? "var(--brass-500)" : "transparent",
                            color: isParentSelected ? "#fff" : "var(--ink-800)",
                            padding: "0.45em 0.6em",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {hasChildren ? (
                            <button
                              onClick={(e) => toggleExpandParent(parent.id, e)}
                              style={{
                                background: "none",
                                border: "none",
                                padding: "0 0.3em 0 0",
                                cursor: "pointer",
                                color: isParentSelected ? "#fff" : "var(--ink-500)",
                                fontSize: "0.75rem",
                                display: "flex",
                                alignItems: "center",
                              }}
                              title={isExpanded ? "Collapse subcategories" : "Expand subcategories"}
                            >
                              {isExpanded ? "▼" : "▶"}
                            </button>
                          ) : (
                            <span style={{ width: "14px", display: "inline-block" }} />
                          )}

                          <button
                            onClick={() => setSelectedFilter({ type: "PARENT", id: parent.id, name: parent.name, parentId: null })}
                            style={{
                              flex: 1,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background: "none",
                              border: "none",
                              color: "inherit",
                              fontWeight: isParentSelected ? 700 : 600,
                              fontSize: "0.84rem",
                              cursor: "pointer",
                              textAlign: "left",
                              padding: 0,
                              lineHeight: "1.3",
                            }}
                          >
                            <span>📂 {parent.name}</span>
                            <span
                              className="mono"
                              style={{
                                fontSize: "0.72rem",
                                background: isParentSelected ? "rgba(0,0,0,0.2)" : "var(--paper-100)",
                                color: isParentSelected ? "#fff" : "var(--ink-600)",
                                padding: "0.1em 0.45em",
                                borderRadius: "999px",
                                flexShrink: 0,
                                marginLeft: "0.4em"
                              }}
                            >
                              {parent.count}
                            </span>
                          </button>
                        </div>

                        {/* Indented Child Subcategories */}
                        {isExpanded && hasChildren && (
                          <div style={{ display: "flex", flexDirection: "column", paddingLeft: "1.4em", marginTop: "2px", borderLeft: "2px solid var(--line)", marginLeft: "0.7em", gap: "2px" }}>
                            {parent.subcategories.map((sub) => {
                              const isSubSelected = selectedFilter.type === "SUBCATEGORY" && selectedFilter.parentId === parent.id && selectedFilter.name === sub.name;

                              return (
                                <button
                                  key={sub.id}
                                  onClick={() => setSelectedFilter({ type: "SUBCATEGORY", id: sub.id, name: sub.name, parentId: parent.id })}
                                  style={{
                                    width: "100%",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "0.35em 0.6em",
                                    borderRadius: "var(--radius-sm)",
                                    border: "none",
                                    background: isSubSelected ? "var(--ink-900)" : "transparent",
                                    color: isSubSelected ? "#fff" : "var(--ink-600)",
                                    fontWeight: isSubSelected ? 700 : 400,
                                    fontSize: "0.78rem",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    transition: "all 0.12s ease",
                                    lineHeight: "1.25"
                                  }}
                                >
                                  <span style={{ marginRight: "0.4em" }}>🔹 {sub.name}</span>
                                  {sub.count > 0 && (
                                    <span
                                      className="mono"
                                      style={{
                                        fontSize: "0.68rem",
                                        background: isSubSelected ? "rgba(255,255,255,0.2)" : "var(--paper-100)",
                                        color: isSubSelected ? "#fff" : "var(--ink-500)",
                                        padding: "0.08em 0.38em",
                                        borderRadius: "999px",
                                        flexShrink: 0
                                      }}
                                    >
                                      {sub.count}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Main Question Area */}
        <div style={{ display: "grid", gap: "1.2em" }}>
          {/* Active Hierarchy Header & Search Box */}
          <div
            className="card"
            style={{
              padding: "1.1em 1.4em",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1em",
              borderRadius: "var(--radius-md)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.8em", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: "1.08rem", color: "var(--ink-900)" }}>
                {selectedFilter.type === "SUBCATEGORY"
                  ? `Subcategory: 🔹 ${selectedFilter.name}`
                  : selectedFilter.type === "PARENT"
                  ? `Category: 📂 ${selectedFilter.name}`
                  : "All Question Categories"}
              </span>
              <span className="badge badge-neutral" style={{ fontWeight: 600 }}>
                {filteredQuestions.length} Questions Found
              </span>
            </div>

            <div style={{ minWidth: "240px", position: "relative" }}>
              <input
                type="text"
                className="input"
                placeholder="🔍 Search in this category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: "0.88rem", padding: "0.45em 0.8em" }}
              />
            </div>
          </div>

          {!questions && <p style={{ color: "var(--ink-500)" }}>Loading questions…</p>}

          {questions && filteredQuestions.length === 0 && (
            <div className="card" style={{ padding: "3.5em 2em", textAlign: "center", color: "var(--ink-500)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.4em" }}>🔍</div>
              <h3 style={{ color: "var(--ink-700)", margin: "0 0 0.3em 0" }}>No questions found in this subcategory</h3>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>
                {searchQuery ? "Try clearing your search term." : "Click '+ Add New Question' to add one to this subcategory."}
              </p>
            </div>
          )}

          {/* List of Question Cards */}
          {filteredQuestions.map((q, idx) => {
            const isSolutionOpen = expandedSolutions[q.id];
            const diffBadge = q.difficulty === "HARD" ? "badge-danger" : q.difficulty === "MEDIUM" ? "badge-warn" : "badge-ok";

            return (
              <div
                key={q.id}
                className="card card-interactive"
                style={{
                  padding: "1.5em 1.8em",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--line)",
                  display: "grid",
                  gap: "0.9em"
                }}
              >
                {/* Meta Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5em" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5em", flexWrap: "wrap" }}>
                    <span className="mono" style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--ink-500)" }}>
                      #{idx + 1}
                    </span>
                    {q.subject && (
                      <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>
                        📚 {q.subject}
                      </span>
                    )}
                    {q.category && (
                      <span className="badge badge-indigo" style={{ fontSize: "0.72rem" }}>
                        📂 {q.category.name}
                      </span>
                    )}
                    {q.subCategory && (
                      <span className="badge badge-purple" style={{ fontSize: "0.72rem" }}>
                        🔹 {q.subCategory}
                      </span>
                    )}
                    <span className={`badge ${diffBadge}`} style={{ fontSize: "0.7rem" }}>
                      {q.difficulty}
                    </span>
                    {q.imageUrl && (
                      <span className="badge badge-accent" style={{ fontSize: "0.7rem" }}>
                        🖼️ Diagram
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.8em" }}>
                    <span className="mono" style={{ fontSize: "0.78rem", color: "var(--ink-500)" }}>
                      ⏱️ {q.defaultTimeSeconds}s
                    </span>
                    <span className="mono" style={{ fontSize: "0.78rem", color: "var(--ink-500)" }}>
                      ⚖️ +{q.marks} / -{q.negativeMarks}
                    </span>
                    {q.status === "INACTIVE" && <span className="badge badge-danger">Retired</span>}
                  </div>
                </div>

                {/* Question Text */}
                <div style={{ fontSize: "1.02rem", fontWeight: 600, color: "var(--ink-900)", lineHeight: "1.45" }}>
                  {q.text}
                </div>

                {/* Question Diagram / Image */}
                {q.imageUrl && (
                  <div style={{ margin: "0.5em 0", textAlign: "center" }}>
                    <div style={{ display: "inline-block", background: "var(--paper-100)", padding: "8px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
                      <img
                        src={q.imageUrl}
                        alt={q.imageCaption || "Question Diagram"}
                        style={{ maxWidth: "100%", maxHeight: "260px", objectFit: "contain", borderRadius: "var(--radius-sm)", display: "block" }}
                      />
                      {q.imageCaption && (
                        <div style={{ fontSize: "0.82rem", color: "var(--ink-500)", fontStyle: "italic", marginTop: "6px" }}>
                          {q.imageCaption}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Multiple Choice Options Preview */}
                {q.type === "MCQ" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5em", marginTop: "0.2em" }}>
                    {["A", "B", "C", "D", "E"]
                      .filter((k) => q[`choice${k}`])
                      .map((k) => {
                        const isCorrect = q.correctChoice === k;
                        return (
                          <div
                            key={k}
                            style={{
                              padding: "0.55em 0.8em",
                              borderRadius: "var(--radius-sm)",
                              border: isCorrect ? "1px solid var(--brass-500)" : "1px solid var(--line)",
                              background: isCorrect ? "rgba(201, 150, 47, 0.08)" : "var(--paper-100)",
                              fontSize: "0.84rem",
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "0.5em",
                              color: isCorrect ? "var(--ink-900)" : "var(--ink-700)",
                              fontWeight: isCorrect ? 600 : 400,
                            }}
                          >
                            <span className="mono" style={{ fontWeight: 700, color: isCorrect ? "var(--brass-600)" : "var(--ink-500)" }}>
                              {k}.
                            </span>
                            <span style={{ flex: 1 }}>{q[`choice${k}`]}</span>
                            {isCorrect && (
                              <span className="badge badge-ok" style={{ fontSize: "0.68rem", padding: "0.1em 0.4em" }}>
                                ✓ Correct
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Solution / Explanation Expander */}
                {q.solution && (
                  <div>
                    <button
                      onClick={() => toggleSolution(q.id)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: "var(--brass-600)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3em",
                      }}
                    >
                      <span>{isSolutionOpen ? "▼ Hide Solution & Rationale" : "▶ View Model Solution / Rationale"}</span>
                    </button>

                    {isSolutionOpen && (
                      <div
                        style={{
                          marginTop: "0.6em",
                          padding: "0.85em 1em",
                          background: "var(--paper-100)",
                          borderRadius: "var(--radius-sm)",
                          borderLeft: "3px solid var(--brass-500)",
                          fontSize: "0.84rem",
                          color: "var(--ink-800)",
                          lineHeight: "1.5",
                        }}
                      >
                        💡 <strong>Explanation:</strong> {q.solution}
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Actions */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6em", paddingTop: "0.4em", borderTop: "1px solid var(--line)" }}>
                  <button className="btn btn-ghost" style={{ fontSize: "0.82rem", padding: "0.35em 0.8em" }} onClick={() => edit(q)}>
                    ✏️ Edit
                  </button>
                  <button className="btn btn-danger" style={{ fontSize: "0.82rem", padding: "0.35em 0.8em" }} onClick={() => remove(q.id)}>
                    🗑️ Retire
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
