import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { parseExcelOrCsv, downloadExcel, downloadCSV, SAMPLE_STUDENTS } from "../../utils/excelImportExport";

export default function Users() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    age: "",
    grade: "Grade 2",
    experienceYears: "",
    education: "",
    schoolOrCompany: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Bulk Import state
  const [importFile, setImportFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  function refresh() {
    api.get("/api/admin/users").then(setUsers).catch((e) => setError(e.message));
  }

  useEffect(refresh, []);

  async function toggleStatus(u) {
    const status = u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await api.put(`/api/admin/users/${u.id}/status`, { status });
    refresh();
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/api/admin/users", {
        ...form,
        age: form.age ? parseInt(form.age, 10) : null,
        experienceYears: form.experienceYears ? parseInt(form.experienceYears, 10) : null,
      });
      setShowModal(false);
      setForm({
        name: "",
        email: "",
        password: "",
        age: "",
        grade: "Grade 2",
        experienceYears: "",
        education: "",
        schoolOrCompany: "",
      });
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle student file selection and parsing
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
      setError(`Failed to parse student file: ${err.message}`);
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
      const res = await api.post("/api/admin/users/bulk-import", { users: parsedRows });
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

  const filteredUsers = users?.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.grade?.toLowerCase().includes(q) ||
      u.schoolOrCompany?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Top Header & Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.6em", flexWrap: "wrap", gap: "1em" }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: "0.2em", fontSize: "1.75rem" }}>Student Profiles & Enrollment</h1>
          <p style={{ color: "var(--ink-500)", margin: 0, fontSize: "0.92rem" }}>
            Manage student academic grades, age eligibility, professional credentials, and bulk import via Excel (.xlsx) or CSV.
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
            📥 Import Students (Excel / CSV)
          </button>

          <button className="btn btn-accent" onClick={() => setShowModal(true)} style={{ fontWeight: 700 }}>
            + Enroll New Student
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Bulk Import Students Modal */}
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
          <div className="card" style={{ width: "100%", maxWidth: "800px", maxHeight: "90vh", overflowY: "auto", padding: "2.2em", borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2em" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.35rem" }}>Bulk Import Students (Excel / CSV)</h2>
                <p style={{ color: "var(--ink-500)", margin: "0.2em 0 0 0", fontSize: "0.88rem" }}>
                  Upload a student roster with grades, ages, and credentials. Passwords will be securely hashed with bcrypt.
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--ink-500)" }}
              >
                ✕
              </button>
            </div>

            {/* Download Sample Template Banner */}
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
                  Need the student roster template?
                </strong>
                <span style={{ fontSize: "0.82rem", color: "var(--ink-500)" }}>
                  Includes required columns: name, email, password, grade, age, experienceYears, education, schoolOrCompany.
                </span>
              </div>

              <div style={{ display: "flex", gap: "0.6em" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => downloadExcel(SAMPLE_STUDENTS, "sample_students_template", "Students")}
                  style={{ background: "#fff", border: "1px solid var(--line)", fontSize: "0.82rem", fontWeight: 600 }}
                >
                  📊 Download Excel (.xlsx)
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => downloadCSV(SAMPLE_STUDENTS, "sample_students_template")}
                  style={{ background: "#fff", border: "1px solid var(--line)", fontSize: "0.82rem", fontWeight: 600 }}
                >
                  📄 Download CSV (.csv)
                </button>
              </div>
            </div>

            {/* File Upload Drop Area */}
            <div style={{ marginBottom: "1.4em" }}>
              <label className="label" style={{ fontWeight: 700 }}>
                Select Student Roster File (.xlsx, .xls, .csv)
              </label>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                className="input"
                onChange={handleFileSelect}
                style={{ padding: "0.6em", background: "#fff" }}
              />
            </div>

            {isParsing && <p style={{ color: "var(--ink-500)" }}>Reading student records…</p>}

            {/* Parsed Rows Preview */}
            {parsedRows.length > 0 && (
              <div style={{ marginBottom: "1.4em" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6em" }}>
                  <strong style={{ fontSize: "0.92rem" }}>
                    ✓ Ready to Enroll: {parsedRows.length} Students Detected
                  </strong>
                  <span className="mono" style={{ fontSize: "0.8rem", color: "var(--ink-500)" }}>
                    Showing first {Math.min(parsedRows.length, 3)} rows
                  </span>
                </div>

                <div style={{ display: "grid", gap: "0.6em", maxHeight: "220px", overflowY: "auto", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "0.6em", background: "var(--paper-100)" }}>
                  {parsedRows.slice(0, 3).map((r, i) => (
                    <div key={i} style={{ background: "#fff", padding: "0.7em", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", fontSize: "0.82rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2em" }}>
                        <strong style={{ color: "var(--ink-900)" }}>{r.name} ({r.email})</strong>
                        <span className="badge badge-emerald" style={{ fontSize: "0.68rem" }}>{r.grade || "General"}</span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--ink-500)" }}>
                        🏫 {r.schoolOrCompany || "N/A"} · Age: {r.age || "N/A"} · Exp: {r.experienceYears || 0} yrs
                      </div>
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
                  🎉 Successfully enrolled {importResult.importedCount} student accounts!
                  {importResult.skippedCount > 0 && ` (${importResult.skippedCount} existing emails skipped)`}
                </div>

                {importResult.errors?.length > 0 && (
                  <div style={{ marginTop: "0.8em", background: "#fef2f2", padding: "0.8em", borderRadius: "var(--radius-sm)", border: "1px solid #f87171" }}>
                    <strong style={{ color: "#991b1b", fontSize: "0.85rem", display: "block", marginBottom: "0.4em" }}>
                      ⚠️ Notifications ({importResult.errors.length} rows):
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
                {isImporting ? "Enrolling…" : `Confirm Enroll (${parsedRows.length} Students)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Single Student Modal */}
      {showModal && (
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
          <div className="card" style={{ width: "100%", maxWidth: "560px", padding: "2em", borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2em" }}>
              <h2 style={{ margin: 0, fontSize: "1.3rem" }}>Enrol New Student Profile</h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--ink-500)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: "grid", gap: "1em" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1em" }}>
                <div>
                  <label className="label">Full Name *</label>
                  <input
                    className="input"
                    required
                    placeholder="e.g. Shivansh Vaja"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Email Address *</label>
                  <input
                    className="input"
                    type="email"
                    required
                    placeholder="student@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Password (min 6 characters) *</label>
                <input
                  className="input"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1em" }}>
                <div>
                  <label className="label">Grade / Track Level *</label>
                  <select
                    className="input"
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  >
                    <option value="Grade 1">Grade 1 (Primary - 6 yrs)</option>
                    <option value="Grade 2">Grade 2 (Primary - 7 yrs)</option>
                    <option value="Grade 3">Grade 3 (Primary - 8 yrs)</option>
                    <option value="Grade 4">Grade 4 (Primary - 9 yrs)</option>
                    <option value="Grade 5">Grade 5 (Primary - 10 yrs)</option>
                    <option value="High School">High School (14-18 yrs)</option>
                    <option value="Masters / Professional">Masters / IT Professional</option>
                  </select>
                </div>
                <div>
                  <label className="label">Student Age (Years)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="e.g. 7"
                    min="4"
                    max="100"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1em" }}>
                <div>
                  <label className="label">School or Company</label>
                  <input
                    className="input"
                    placeholder="e.g. Bright Day School"
                    value={form.schoolOrCompany}
                    onChange={(e) => setForm({ ...form, schoolOrCompany: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">IT Experience (Years)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="e.g. 13 (or 0 for school)"
                    min="0"
                    max="60"
                    value={form.experienceYears}
                    onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Education / Qualification</label>
                <input
                  className="input"
                  placeholder="e.g. M.Sc. IT from Saurashtra University"
                  value={form.education}
                  onChange={(e) => setForm({ ...form, education: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8em", marginTop: "0.8em" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent" disabled={submitting}>
                  {submitting ? "Enrolling…" : "Enroll Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search & Directory Table */}
      <div style={{ marginBottom: "1em", display: "flex", justifyContent: "flex-end" }}>
        <input
          type="text"
          className="input"
          placeholder="🔍 Search students by name, email, grade, school..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: "340px", fontSize: "0.88rem" }}
        />
      </div>

      {!users && <p>Loading student directory…</p>}

      {/* Student List Table */}
      <div className="card" style={{ overflow: "hidden", borderRadius: "var(--radius-lg)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--paper-100)", textAlign: "left", fontSize: "0.85rem", color: "var(--ink-700)" }}>
              <th style={{ padding: "0.8em 1.2em" }}>Student / Professional</th>
              <th style={{ padding: "0.8em 1.2em" }}>Academic Grade & Age</th>
              <th style={{ padding: "0.8em 1.2em" }}>School / Institution & Credentials</th>
              <th style={{ padding: "0.8em 1.2em" }}>Attempts</th>
              <th style={{ padding: "0.8em 1.2em" }}>Status</th>
              <th style={{ padding: "0.8em 1.2em", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers?.map((u) => {
              const isChild = u.grade?.toLowerCase().includes("grade 1") || u.grade?.toLowerCase().includes("grade 2");
              const isPro = u.grade?.toLowerCase().includes("master") || u.grade?.toLowerCase().includes("professional");

              return (
                <tr key={u.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "0.9em 1.2em" }}>
                    <div style={{ fontWeight: 700, color: "var(--ink-900)" }}>{u.name}</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--ink-500)" }}>{u.email}</div>
                  </td>
                  <td style={{ padding: "0.9em 1.2em" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4em", marginBottom: "0.2em" }}>
                      <span className={`badge ${isChild ? "badge-emerald" : isPro ? "badge-indigo" : "badge-neutral"}`}>
                        {isChild ? "🎒 " : isPro ? "🎓 " : "👤 "}
                        {u.grade || "General"}
                      </span>
                    </div>
                    {u.age && <span className="mono" style={{ fontSize: "0.8rem", color: "var(--ink-500)" }}>{u.age} Years Old</span>}
                  </td>
                  <td style={{ padding: "0.9em 1.2em" }}>
                    {u.schoolOrCompany && (
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--ink-900)" }}>
                        🏫 {u.schoolOrCompany}
                      </div>
                    )}
                    {u.education && (
                      <div style={{ fontSize: "0.78rem", color: "var(--ink-500)" }}>
                        📜 {u.education}
                      </div>
                    )}
                    {u.experienceYears ? (
                      <div style={{ fontSize: "0.78rem", color: "var(--brass-600)", fontWeight: 600 }}>
                        💼 {u.experienceYears} Years IT Experience
                      </div>
                    ) : null}
                  </td>
                  <td className="mono" style={{ padding: "0.9em 1.2em", fontWeight: 600 }}>
                    {u._count.attempts}
                  </td>
                  <td style={{ padding: "0.9em 1.2em" }}>
                    <span className={`badge ${u.status === "ACTIVE" ? "badge-ok" : "badge-danger"}`}>{u.status}</span>
                  </td>
                  <td style={{ padding: "0.9em 1.2em", textAlign: "right" }}>
                    <button className="btn btn-ghost" style={{ padding: "0.3em 0.8em", fontSize: "0.82rem" }} onClick={() => toggleStatus(u)}>
                      {u.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
