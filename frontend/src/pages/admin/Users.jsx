import { useEffect, useState, useMemo } from "react";
import { api } from "../../api/client";
import { parseExcelOrCsv, downloadExcel, downloadCSV, SAMPLE_STUDENTS } from "../../utils/excelImportExport";

export default function Users() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGradeTab, setSelectedGradeTab] = useState("ALL");

  // Create Form State
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

  // Edit Student State
  const [editingUser, setEditingUser] = useState(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Reset Password State
  const [resettingUser, setResettingUser] = useState(null);
  const [newPasswordVal, setNewPasswordVal] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

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
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      await api.post("/api/admin/users", {
        ...form,
        age: form.age ? parseInt(form.age, 10) : null,
        experienceYears: form.experienceYears ? parseInt(form.experienceYears, 10) : null,
      });
      setShowModal(false);
      setSuccessMsg(`Student "${form.name}" has been successfully enrolled!`);
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

  async function handleUpdateUser(e) {
    e.preventDefault();
    if (!editingUser) return;
    setError(null);
    setSuccessMsg(null);
    setIsUpdatingUser(true);
    try {
      await api.put(`/api/admin/users/${editingUser.id}`, {
        name: editingUser.name,
        email: editingUser.email,
        age: editingUser.age ? parseInt(editingUser.age, 10) : null,
        grade: editingUser.grade || null,
        experienceYears: editingUser.experienceYears !== "" && editingUser.experienceYears !== null ? parseInt(editingUser.experienceYears, 10) : null,
        education: editingUser.education || null,
        schoolOrCompany: editingUser.schoolOrCompany || null,
        status: editingUser.status || "ACTIVE",
      });
      setSuccessMsg(`Student "${editingUser.name}" details updated successfully.`);
      setEditingUser(null);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUpdatingUser(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!resettingUser || !newPasswordVal.trim()) return;
    setError(null);
    setSuccessMsg(null);
    setIsResettingPassword(true);
    try {
      await api.post(`/api/admin/users/${resettingUser.id}/reset-password`, {
        newPassword: newPasswordVal.trim(),
      });
      setSuccessMsg(`Password for ${resettingUser.email} has been successfully reset!`);
      setResettingUser(null);
      setNewPasswordVal("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsResettingPassword(false);
    }
  }

  function generateSecurePassword() {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPasswordVal(pass);
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

  // Filtered Students
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      if (u.role === "ADMIN") return false; // keep admin separate from student list

      if (selectedGradeTab !== "ALL") {
        if (selectedGradeTab === "PRIMARY" && u.grade !== "GRADE_1" && u.grade !== "GRADE_2" && u.grade !== "Grade 1" && u.grade !== "Grade 2") {
          return false;
        }
        if (selectedGradeTab === "PROFESSIONAL" && (u.grade === "GRADE_1" || u.grade === "GRADE_2" || u.grade === "Grade 1" || u.grade === "Grade 2")) {
          return false;
        }
        if (selectedGradeTab === "INACTIVE" && u.status !== "INACTIVE") {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.name?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchSchool = u.schoolOrCompany?.toLowerCase().includes(q);
        const matchGrade = u.grade?.toLowerCase().includes(q);
        return matchName || matchEmail || matchSchool || matchGrade;
      }

      return true;
    });
  }, [users, selectedGradeTab, searchQuery]);

  return (
    <div>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.6em", flexWrap: "wrap", gap: "1em" }}>
        <div>
          <h1 style={{ margin: "0 0 0.2em 0", fontSize: "1.75rem", letterSpacing: "-0.01em" }}>
            Enrolled Students Roster
          </h1>
          <p style={{ color: "var(--ink-500)", margin: 0, fontSize: "0.92rem" }}>
            Manage student enrollments, edit profiles, reset passwords, and bulk import student lists.
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
            style={{ background: "#fff", border: "1px solid var(--line)", fontWeight: 600 }}
          >
            📥 Bulk Import (Excel / CSV)
          </button>

          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
            style={{ fontWeight: 700 }}
          >
            + Enroll New Student
          </button>
        </div>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: "1.2em" }}>⚠️ {error}</div>}
      {successMsg && (
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
          ✓ {successMsg}
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div
        className="card"
        style={{
          padding: "1em 1.4em",
          marginBottom: "1.4em",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1em",
        }}
      >
        <div style={{ display: "inline-flex", background: "var(--paper-100)", padding: "4px", borderRadius: "var(--radius-sm)", gap: "4px" }}>
          {[
            { key: "ALL", label: "🌟 All Students" },
            { key: "PRIMARY", label: "🎒 Primary (Grades 1-2)" },
            { key: "PROFESSIONAL", label: "💼 IT Professionals" },
            { key: "INACTIVE", label: "🔒 Inactive" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedGradeTab(tab.key)}
              style={{
                border: "none",
                background: selectedGradeTab === tab.key ? "#fff" : "transparent",
                color: selectedGradeTab === tab.key ? "var(--ink-900)" : "var(--ink-600)",
                fontWeight: selectedGradeTab === tab.key ? 700 : 500,
                padding: "0.45em 0.9em",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.84rem",
                cursor: "pointer",
                boxShadow: selectedGradeTab === tab.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
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
            placeholder="🔍 Search by name, email, school..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: "0.88rem", padding: "0.45em 0.8em" }}
          />
        </div>
      </div>

      {/* Student List Table */}
      {!users ? (
        <p style={{ color: "var(--ink-500)" }}>Loading student records…</p>
      ) : filteredUsers.length === 0 ? (
        <div className="card" style={{ padding: "3.5em 2em", textAlign: "center", color: "var(--ink-500)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.4em" }}>🔍</div>
          <h3 style={{ color: "var(--ink-700)", margin: "0 0 0.3em 0" }}>No students match your filter</h3>
          <p style={{ margin: 0, fontSize: "0.9rem" }}>Try clearing your search query or enrolling a new student.</p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: "auto", borderRadius: "var(--radius-lg)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--paper-100)", borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: "0.9em 1.2em", fontSize: "0.82rem", textTransform: "uppercase", color: "var(--ink-600)" }}>Student</th>
                <th style={{ padding: "0.9em 1.2em", fontSize: "0.82rem", textTransform: "uppercase", color: "var(--ink-600)" }}>Grade / Track</th>
                <th style={{ padding: "0.9em 1.2em", fontSize: "0.82rem", textTransform: "uppercase", color: "var(--ink-600)" }}>Age & Profile</th>
                <th style={{ padding: "0.9em 1.2em", fontSize: "0.82rem", textTransform: "uppercase", color: "var(--ink-600)" }}>School / Company</th>
                <th style={{ padding: "0.9em 1.2em", fontSize: "0.82rem", textTransform: "uppercase", color: "var(--ink-600)" }}>Status</th>
                <th style={{ padding: "0.9em 1.2em", fontSize: "0.82rem", textTransform: "uppercase", color: "var(--ink-600)", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isPrimary = u.grade === "GRADE_1" || u.grade === "GRADE_2" || u.grade === "Grade 1" || u.grade === "Grade 2";
                const gradeLabel = u.grade ? u.grade.replace("_", " ") : "Not Assigned";

                return (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "1em 1.2em" }}>
                      <div style={{ fontWeight: 700, color: "var(--ink-900)", fontSize: "0.95rem" }}>{u.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--ink-500)" }}>{u.email}</div>
                    </td>

                    <td style={{ padding: "1em 1.2em" }}>
                      <span
                        className="badge"
                        style={{
                          background: isPrimary ? "rgba(99, 102, 241, 0.12)" : "rgba(201, 150, 47, 0.12)",
                          color: isPrimary ? "#4338ca" : "#854d0e",
                          border: isPrimary ? "1px solid #a5b4fc" : "1px solid #fde047",
                          fontSize: "0.76rem",
                          fontWeight: 700,
                        }}
                      >
                        {isPrimary ? "🎒" : "💼"} {gradeLabel}
                      </span>
                    </td>

                    <td style={{ padding: "1em 1.2em", fontSize: "0.85rem", color: "var(--ink-700)" }}>
                      {u.age ? `Age ${u.age}` : "—"}
                      {u.education && ` · ${u.education}`}
                      {u.experienceYears ? ` (${u.experienceYears}y exp)` : ""}
                    </td>

                    <td style={{ padding: "1em 1.2em", fontSize: "0.85rem", color: "var(--ink-700)" }}>
                      {u.schoolOrCompany || "—"}
                    </td>

                    <td style={{ padding: "1em 1.2em" }}>
                      <button
                        onClick={() => toggleStatus(u)}
                        className={`badge ${u.status === "ACTIVE" ? "badge-ok" : "badge-danger"}`}
                        style={{ cursor: "pointer", border: "none", padding: "0.3em 0.7em" }}
                        title="Click to toggle account status"
                      >
                        {u.status === "ACTIVE" ? "✓ Active" : "🔒 Inactive"}
                      </button>
                    </td>

                    <td style={{ padding: "1em 1.2em", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.4em" }}>
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: "0.78rem", padding: "0.3em 0.65em", border: "1px solid var(--line)" }}
                          onClick={() => setEditingUser({ ...u })}
                          title="Edit Student Details"
                        >
                          ✏️ Edit
                        </button>

                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: "0.78rem", padding: "0.3em 0.65em", border: "1px solid var(--line)", color: "var(--brass-600)" }}
                          onClick={() => {
                            setResettingUser(u);
                            setNewPasswordVal("");
                          }}
                          title="Reset Password for this student"
                        >
                          🔑 Reset Pass
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingUser && (
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
          <div className="card" style={{ width: "100%", maxWidth: "580px", maxHeight: "90vh", overflowY: "auto", padding: "2.2em", borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2em" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.3rem" }}>Edit Student Profile</h2>
                <div style={{ fontSize: "0.82rem", color: "var(--ink-500)" }}>Update enrolled candidate attributes and grade</div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--ink-500)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} style={{ display: "grid", gap: "1.1em" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8em" }}>
                <div>
                  <label className="label">Full Name *</label>
                  <input
                    className="input"
                    required
                    value={editingUser.name || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Email Address *</label>
                  <input
                    className="input"
                    type="email"
                    required
                    value={editingUser.email || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "0.8em" }}>
                <div>
                  <label className="label">Grade / Track *</label>
                  <select
                    className="input"
                    value={editingUser.grade || "PROFESSIONAL"}
                    onChange={(e) => setEditingUser({ ...editingUser, grade: e.target.value })}
                  >
                    <option value="PROFESSIONAL">💼 Masters / Professional</option>
                    <option value="GRADE_2">🎒 Grade 2 (Class 2)</option>
                    <option value="GRADE_1">🎒 Grade 1 (Class 1)</option>
                  </select>
                </div>

                <div>
                  <label className="label">Age</label>
                  <input
                    className="input"
                    type="number"
                    min="4"
                    max="100"
                    value={editingUser.age || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, age: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Exp (Years)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="50"
                    value={editingUser.experienceYears ?? ""}
                    onChange={(e) => setEditingUser({ ...editingUser, experienceYears: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Education / Qualification</label>
                <input
                  className="input"
                  value={editingUser.education || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, education: e.target.value })}
                  placeholder="e.g. B.Tech Computer Science or Primary School"
                />
              </div>

              <div>
                <label className="label">School or Company</label>
                <input
                  className="input"
                  value={editingUser.schoolOrCompany || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, schoolOrCompany: e.target.value })}
                  placeholder="e.g. Anthropic, Google, DPS"
                />
              </div>

              <div>
                <label className="label">Account Status</label>
                <select
                  className="input"
                  value={editingUser.status || "ACTIVE"}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                >
                  <option value="ACTIVE">Active (Can take exams)</option>
                  <option value="INACTIVE">Inactive (Access suspended)</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8em", marginTop: "0.8em" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isUpdatingUser} style={{ fontWeight: 700, padding: "0.6em 1.5em" }}>
                  {isUpdatingUser ? "Saving…" : "Save Student Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingUser && (
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
          <div className="card" style={{ width: "100%", maxWidth: "480px", padding: "2.2em", borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2em" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.3rem" }}>Reset Student Password</h2>
                <div style={{ fontSize: "0.82rem", color: "var(--ink-500)" }}>Set a new password for {resettingUser.name}</div>
              </div>
              <button
                onClick={() => setResettingUser(null)}
                style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--ink-500)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPassword} style={{ display: "grid", gap: "1.2em" }}>
              <div style={{ background: "var(--paper-100)", padding: "0.8em 1em", borderRadius: "var(--radius-sm)", fontSize: "0.85rem" }}>
                <strong>Candidate:</strong> {resettingUser.name} ({resettingUser.email})
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4em" }}>
                  <label className="label" style={{ margin: 0 }}>New Password * (Min 6 chars)</label>
                  <button
                    type="button"
                    onClick={generateSecurePassword}
                    style={{ background: "none", border: "none", color: "var(--brass-600)", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}
                  >
                    🎲 Generate Random
                  </button>
                </div>

                <input
                  className="input"
                  required
                  placeholder="Enter or generate new password"
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8em" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setResettingUser(null)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-accent"
                  disabled={isResettingPassword || !newPasswordVal.trim()}
                  style={{ fontWeight: 700 }}
                >
                  {isResettingPassword ? "Resetting…" : "Confirm Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Single Student Modal */}
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
            padding: "1.5em",
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: "580px", maxHeight: "90vh", overflowY: "auto", padding: "2.2em", borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2em" }}>
              <h2 style={{ margin: 0, fontSize: "1.3rem" }}>Enroll New Student</h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--ink-500)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: "grid", gap: "1.1em" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8em" }}>
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
                <label className="label">Initial Password *</label>
                <input
                  type="password"
                  className="input"
                  required
                  placeholder="Set initial password (min 6 chars)"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "0.8em" }}>
                <div>
                  <label className="label">Grade / Track *</label>
                  <select
                    className="input"
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  >
                    <option value="Grade 2">🎒 Grade 2 (Class 2)</option>
                    <option value="Grade 1">🎒 Grade 1 (Class 1)</option>
                    <option value="Professional">💼 Masters / Professional</option>
                  </select>
                </div>

                <div>
                  <label className="label">Age</label>
                  <input
                    className="input"
                    type="number"
                    min="4"
                    max="100"
                    placeholder="e.g. 7"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Exp (Years)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="50"
                    placeholder="0"
                    value={form.experienceYears}
                    onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Education / Qualification</label>
                <input
                  className="input"
                  placeholder="e.g. Primary School Class 2 or B.Tech CS"
                  value={form.education}
                  onChange={(e) => setForm({ ...form, education: e.target.value })}
                />
              </div>

              <div>
                <label className="label">School or Company</label>
                <input
                  className="input"
                  placeholder="e.g. DPS International or Google"
                  value={form.schoolOrCompany}
                  onChange={(e) => setForm({ ...form, schoolOrCompany: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8em", marginTop: "0.8em" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ fontWeight: 700, padding: "0.6em 1.5em" }}>
                  {submitting ? "Enrolling…" : "Enroll Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <h2 style={{ margin: 0, fontSize: "1.35rem" }}>Bulk Enroll Students (Excel / CSV)</h2>
                <p style={{ color: "var(--ink-500)", margin: "0.2em 0 0 0", fontSize: "0.88rem" }}>
                  Import student rosters in bulk with automatic password hashing and grade mapping.
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
                  Need the student roster template?
                </strong>
                <span style={{ fontSize: "0.82rem", color: "var(--ink-500)" }}>
                  Columns: name, email, password, grade, age, schoolOrCompany, education, experienceYears.
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

            {isParsing && <p style={{ color: "var(--ink-500)" }}>Reading student file data…</p>}

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

                <div style={{ display: "grid", gap: "0.5em", maxHeight: "200px", overflowY: "auto", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "0.6em", background: "var(--paper-100)" }}>
                  {parsedRows.slice(0, 3).map((r, i) => (
                    <div key={i} style={{ background: "#fff", padding: "0.6em 0.8em", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", fontSize: "0.82rem" }}>
                      <div style={{ display: "flex", gap: "0.5em", marginBottom: "0.2em", alignItems: "center" }}>
                        <span className="badge badge-neutral" style={{ fontSize: "0.68rem" }}>#{i + 1}</span>
                        <strong style={{ color: "var(--ink-900)" }}>{r.name}</strong>
                        <span style={{ color: "var(--ink-500)" }}>({r.email})</span>
                        <span className="badge badge-purple" style={{ fontSize: "0.68rem" }}>{r.grade || "Primary"}</span>
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
                  🎉 Successfully enrolled {importResult.importedCount} students!
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
                {isImporting ? "Enrolling…" : `Confirm Enrollment (${parsedRows.length} Students)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
