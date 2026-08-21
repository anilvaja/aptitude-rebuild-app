import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";

export default function Overview() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/api/admin/analytics/overview").then(setStats);
  }, []);

  return (
    <div style={{ paddingBottom: "3em" }}>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          padding: "2em 2.2em",
          marginBottom: "2em",
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          color: "#fff",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.5em",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6em", marginBottom: "0.4em" }}>
            <span style={{ fontSize: "1.5rem" }}>🛡️</span>
            <h1 style={{ margin: 0, fontSize: "1.75rem", color: "#fff" }}>
              Administrator Command Center
            </h1>
          </div>
          <p style={{ color: "rgba(255,255,255,0.75)", margin: 0, fontSize: "0.95rem" }}>
            Manage curriculum tracks, author diagram questions, configure exams, and monitor student performance.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.8em", flexWrap: "wrap" }}>
          <Link to="/admin/questions" className="btn btn-accent" style={{ fontWeight: 700 }}>
            📝 Question Bank
          </Link>
          <Link to="/admin/tests" className="btn btn-ghost" style={{ background: "rgba(255,255,255,0.1)", color: "#fff", borderColor: "rgba(255,255,255,0.2)" }}>
            🎓 Exam Papers
          </Link>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.2em", marginBottom: "2.2em" }}>
        <div className="card" style={{ padding: "1.5em 1.6em", borderRadius: "var(--radius-md)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5em" }}>
            <span className="label" style={{ margin: 0 }}>Enrolled Students</span>
            <span style={{ fontSize: "1.3rem" }}>👥</span>
          </div>
          <div className="mono" style={{ fontSize: "2rem", fontWeight: 700, color: "var(--ink-900)" }}>
            {stats ? stats.studentCount : "—"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--ink-500)", marginTop: "0.3em" }}>
            Primary & Professional candidates
          </div>
        </div>

        <div className="card" style={{ padding: "1.5em 1.6em", borderRadius: "var(--radius-md)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5em" }}>
            <span className="label" style={{ margin: 0 }}>Published Exams</span>
            <span style={{ fontSize: "1.3rem" }}>🎓</span>
          </div>
          <div className="mono" style={{ fontSize: "2rem", fontWeight: 700, color: "#2563eb" }}>
            {stats ? stats.testCount : "—"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--ink-500)", marginTop: "0.3em" }}>
            Active & timed assessment papers
          </div>
        </div>

        <div className="card" style={{ padding: "1.5em 1.6em", borderRadius: "var(--radius-md)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5em" }}>
            <span className="label" style={{ margin: 0 }}>Total Questions</span>
            <span style={{ fontSize: "1.3rem" }}>📚</span>
          </div>
          <div className="mono" style={{ fontSize: "2rem", fontWeight: 700, color: "var(--brass-600)" }}>
            {stats ? stats.questionCount : "—"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--ink-500)", marginTop: "0.3em" }}>
            MCQ, diagrams & descriptive
          </div>
        </div>

        <div className="card" style={{ padding: "1.5em 1.6em", borderRadius: "var(--radius-md)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5em" }}>
            <span className="label" style={{ margin: 0 }}>Completed Attempts</span>
            <span style={{ fontSize: "1.3rem" }}>📝</span>
          </div>
          <div className="mono" style={{ fontSize: "2rem", fontWeight: 700, color: "var(--ok-500)" }}>
            {stats ? stats.attemptCount : "—"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--ink-500)", marginTop: "0.3em" }}>
            Evaluated & recorded tests
          </div>
        </div>

        <div className="card" style={{ padding: "1.5em 1.6em", borderRadius: "var(--radius-md)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5em" }}>
            <span className="label" style={{ margin: 0 }}>Average Score</span>
            <span style={{ fontSize: "1.3rem" }}>📊</span>
          </div>
          <div className="mono" style={{ fontSize: "2rem", fontWeight: 700, color: "var(--ink-900)" }}>
            {stats?.avgScorePercent !== null && stats?.avgScorePercent !== undefined ? `${stats.avgScorePercent}%` : "—"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--ink-500)", marginTop: "0.3em" }}>
            Across all submitted exams
          </div>
        </div>
      </div>

      {/* Quick Access Action Grid */}
      <h2 style={{ fontSize: "1.25rem", marginBottom: "0.9em" }}>⚡ Quick Management Launchpads</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.2em" }}>
        <Link
          to="/admin/questions"
          className="card card-interactive"
          style={{ padding: "1.6em", textDecoration: "none", color: "inherit", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}
        >
          <div style={{ fontSize: "1.8rem", marginBottom: "0.4em" }}>📝</div>
          <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--ink-900)", marginBottom: "0.3em" }}>
            Question Bank Hierarchy
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--ink-500)", lineHeight: "1.4" }}>
            Browse parent-child categories, author diagram questions, and bulk import Excel/CSV files.
          </div>
        </Link>

        <Link
          to="/admin/tests"
          className="card card-interactive"
          style={{ padding: "1.6em", textDecoration: "none", color: "inherit", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}
        >
          <div style={{ fontSize: "1.8rem", marginBottom: "0.4em" }}>🎓</div>
          <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--ink-900)", marginBottom: "0.3em" }}>
            Examination Papers
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--ink-500)", lineHeight: "1.4" }}>
            Configure exam duration, target grades, anti-cheat shuffle, and question pool assignments.
          </div>
        </Link>

        <Link
          to="/admin/users"
          className="card card-interactive"
          style={{ padding: "1.6em", textDecoration: "none", color: "inherit", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}
        >
          <div style={{ fontSize: "1.8rem", marginBottom: "0.4em" }}>👥</div>
          <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--ink-900)", marginBottom: "0.3em" }}>
            Students Roster
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--ink-500)", lineHeight: "1.4" }}>
            Enroll students, edit profiles, reset passwords, and bulk import rosters.
          </div>
        </Link>

        <Link
          to="/admin/review"
          className="card card-interactive"
          style={{ padding: "1.6em", textDecoration: "none", color: "inherit", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}
        >
          <div style={{ fontSize: "1.8rem", marginBottom: "0.4em" }}>✍️</div>
          <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--ink-900)", marginBottom: "0.3em" }}>
            Review & Grading Queue
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--ink-500)", lineHeight: "1.4" }}>
            Grade pending written descriptive responses submitted by candidates.
          </div>
        </Link>
      </div>
    </div>
  );
}
