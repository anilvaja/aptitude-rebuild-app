import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

export default function Profile() {
  const { user } = useAuth();

  // Profile Edit State
  const [name, setName] = useState(user?.name || "");
  const [age, setAge] = useState(user?.age || "");
  const [education, setEducation] = useState(user?.education || "");
  const [schoolOrCompany, setSchoolOrCompany] = useState(user?.schoolOrCompany || "");
  const [experienceYears, setExperienceYears] = useState(user?.experienceYears ?? "");
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);
    setIsSavingProfile(true);

    try {
      const res = await api.put("/api/auth/profile", {
        name,
        age: age ? Number(age) : null,
        education: education || null,
        schoolOrCompany: schoolOrCompany || null,
        experienceYears: experienceYears !== "" ? Number(experienceYears) : null,
      });

      // Update local storage user session
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem("user", JSON.stringify({ ...parsed, ...res }));
      }

      setProfileSuccess("Your profile details have been successfully updated!");
    } catch (err) {
      setProfileError(err.message || "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    setIsSavingPassword(true);

    try {
      const res = await api.put("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });

      setPasswordSuccess(res.message || "Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err.message || "Failed to change password. Please check your current password.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  const roleTitle = user?.role === "ADMIN" ? "Platform Administrator" : "Candidate / Student";
  const gradeDisplay = user?.grade ? user.grade.replace("_", " ") : "Not Assigned";

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", paddingBottom: "3em" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "2em" }}>
        <h1 style={{ margin: "0 0 0.3em 0", fontSize: "1.75rem" }}>My Account & Profile</h1>
        <p style={{ color: "var(--ink-500)", margin: 0, fontSize: "0.92rem" }}>
          Manage your personal information, security credentials, and account settings.
        </p>
      </div>

      {/* Account Overview Badge Card */}
      <div
        className="card"
        style={{
          padding: "1.6em 2em",
          marginBottom: "2em",
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          color: "#fff",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.2em",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.2em" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--brass-500)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              fontWeight: 700,
            }}
          >
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{user?.name}</div>
            <div style={{ fontSize: "0.88rem", opacity: 0.8 }}>{user?.email}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.6em", flexWrap: "wrap" }}>
          <span
            className="badge"
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              fontSize: "0.78rem",
              padding: "0.4em 0.8em",
            }}
          >
            🛡️ {roleTitle}
          </span>
          {user?.role === "STUDENT" && (
            <span
              className="badge"
              style={{
                background: "var(--brass-500)",
                color: "#fff",
                fontSize: "0.78rem",
                padding: "0.4em 0.8em",
                fontWeight: 700,
              }}
            >
              🎓 {gradeDisplay}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2em" }}>
        {/* Profile Settings Box */}
        <div className="card" style={{ padding: "2em", borderRadius: "var(--radius-lg)" }}>
          <h2 style={{ fontSize: "1.25rem", marginTop: 0, marginBottom: "1.2em" }}>
            👤 Profile Details
          </h2>

          {profileSuccess && (
            <div
              style={{
                background: "rgba(34, 197, 94, 0.1)",
                color: "var(--ok-500)",
                padding: "0.8em 1em",
                borderRadius: "var(--radius-sm)",
                marginBottom: "1.2em",
                fontSize: "0.88rem",
                fontWeight: 600,
                border: "1px solid var(--ok-500)",
              }}
            >
              ✓ {profileSuccess}
            </div>
          )}

          {profileError && (
            <div
              className="error-banner"
              style={{ padding: "0.8em 1em", marginBottom: "1.2em", fontSize: "0.88rem" }}
            >
              ⚠️ {profileError}
            </div>
          )}

          <form onSubmit={handleProfileSubmit} style={{ display: "grid", gap: "1.1em" }}>
            <div>
              <label className="label">Full Name *</label>
              <input
                className="input"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Email Address (Managed by Admin)</label>
              <input
                className="input"
                disabled
                value={user?.email || ""}
                style={{ background: "var(--paper-100)", opacity: 0.8, cursor: "not-allowed" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8em" }}>
              <div>
                <label className="label">Age</label>
                <input
                  className="input"
                  type="number"
                  min="4"
                  max="100"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 7"
                />
              </div>

              <div>
                <label className="label">Experience (Years)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="50"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  placeholder="e.g. 0 or 5"
                />
              </div>
            </div>

            <div>
              <label className="label">Education / Qualification</label>
              <input
                className="input"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g. Class 2 or B.Tech in CS"
              />
            </div>

            <div>
              <label className="label">School / Organization</label>
              <input
                className="input"
                value={schoolOrCompany}
                onChange={(e) => setSchoolOrCompany(e.target.value)}
                placeholder="e.g. DPS International or Anthropic"
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.6em" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSavingProfile}
                style={{ fontWeight: 700 }}
              >
                {isSavingProfile ? "Saving…" : "Save Profile Changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Box */}
        <div className="card" style={{ padding: "2em", borderRadius: "var(--radius-lg)" }}>
          <h2 style={{ fontSize: "1.25rem", marginTop: 0, marginBottom: "1.2em" }}>
            🔑 Change Password
          </h2>

          {passwordSuccess && (
            <div
              style={{
                background: "rgba(34, 197, 94, 0.1)",
                color: "var(--ok-500)",
                padding: "0.8em 1em",
                borderRadius: "var(--radius-sm)",
                marginBottom: "1.2em",
                fontSize: "0.88rem",
                fontWeight: 600,
                border: "1px solid var(--ok-500)",
              }}
            >
              ✓ {passwordSuccess}
            </div>
          )}

          {passwordError && (
            <div
              className="error-banner"
              style={{ padding: "0.8em 1em", marginBottom: "1.2em", fontSize: "0.88rem" }}
            >
              ⚠️ {passwordError}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} style={{ display: "grid", gap: "1.1em" }}>
            <div>
              <label className="label">Current Password *</label>
              <input
                type="password"
                className="input"
                required
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="label">New Password * (Min 6 chars)</label>
              <input
                type="password"
                className="input"
                required
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Confirm New Password *</label>
              <input
                type="password"
                className="input"
                required
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.6em" }}>
              <button
                type="submit"
                className="btn btn-accent"
                disabled={isSavingPassword}
                style={{ fontWeight: 700 }}
              >
                {isSavingPassword ? "Updating…" : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
