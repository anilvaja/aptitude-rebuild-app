import { useEffect, useState } from "react";
import { api } from "../../api/client";

export default function Users() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.6em", flexWrap: "wrap", gap: "1em" }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: "0.2em" }}>Student Profiles & Enrollment</h1>
          <p style={{ color: "var(--ink-500)", margin: 0, fontSize: "0.95rem" }}>
            Manage student academic grades, age eligibility, professional credentials, and exam access rights.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Add New Student
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Add Student Modal */}
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
            {users?.map((u) => {
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
