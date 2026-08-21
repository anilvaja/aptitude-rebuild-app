import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useActiveTest, fmtTime } from "../../context/ActiveTestContext";

export default function TestList() {
  const [tests, setTests] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const { user } = useAuth();
  const { activeTest, refreshActiveTest } = useActiveTest();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/api/tests").then(setTests).catch((e) => setError(e.message));
  }, []);

  async function start(testId) {
    setError(null);
    try {
      const attempt = await api.post("/api/attempts/start", { testId });
      refreshActiveTest();
      navigate(`/attempt/${attempt.id}`);
    } catch (e) {
      setError(e.message);
      refreshActiveTest();
    }
  }

  const hasRunningTest = activeTest?.hasActive;

  // Filter tests based on category tab and search query
  const filteredTests = useMemo(() => {
    if (!tests) return [];
    return tests.filter((t) => {
      // Tab filter
      const isCCAR = t.title.toLowerCase().includes("ccar") || t.title.toLowerCase().includes("claude");
      const isPrimary = t.title.toLowerCase().includes("class 1") || t.title.toLowerCase().includes("class 2");
      const isMathEng = t.title.toLowerCase().includes("mathematics") || t.title.toLowerCase().includes("english");

      if (activeTab === "ccar" && !isCCAR) return false;
      if (activeTab === "primary" && !isPrimary) return false;
      if (activeTab === "math-eng" && !isMathEng) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        return matchTitle || matchDesc;
      }

      return true;
    });
  }, [tests, activeTab, searchQuery]);

  // Derive track tags for each test
  function getTestMeta(t) {
    const isCCAR = t.title.includes("CCAR-F") || t.title.includes("Claude");
    const isClass1 = t.title.includes("Class 1");
    const isClass2 = t.title.includes("Class 2");

    if (isCCAR) {
      return {
        track: "Anthropic Certified Track",
        trackBadge: "badge-indigo",
        icon: "🤖",
        targetAudience: "Masters / IT Professionals",
        duration: Math.round((t.questionCount * 90) / 60),
        passMark: "72%",
        marking: "+1.0 / -0.25",
        tags: ["Agentic Systems", "Claude Code", "Prompt Engineering", "MCP Protocols", "Context Caching"]
      };
    }

    if (isClass1) {
      return {
        track: "Primary School (Grade 1)",
        trackBadge: "badge-emerald",
        icon: "🎒",
        targetAudience: "Grade 1 (Age 5-6)",
        duration: 45,
        passMark: "70%",
        marking: "+1.0 (No Negative)",
        tags: ["50% Mathematics", "50% English", "Numbers 1-50", "2D Shapes", "Phonics & Nouns"]
      };
    }

    if (isClass2) {
      return {
        track: "Primary School (Grade 2)",
        trackBadge: "badge-purple",
        icon: "🎒",
        targetAudience: "Grade 2 (Age 6-7)",
        duration: 45,
        passMark: "70%",
        marking: "+1.0 (No Negative)",
        tags: ["50% Mathematics", "50% English", "Place Value", "Multiplication", "Grammar & Reading"]
      };
    }

    return {
      track: "General Assessment",
      trackBadge: "badge-neutral",
      icon: "📝",
      targetAudience: "Open to All",
      duration: Math.round((t.questionCount * 60) / 60),
      passMark: "70%",
      marking: "+1.0",
      tags: ["Assessment", "Aptitude"]
    };
  }

  // Count metrics for tabs
  const counts = useMemo(() => {
    if (!tests) return { all: 0, ccar: 0, primary: 0, mathEng: 0 };
    return {
      all: tests.length,
      ccar: tests.filter((t) => t.title.toLowerCase().includes("ccar") || t.title.toLowerCase().includes("claude")).length,
      primary: tests.filter((t) => t.title.toLowerCase().includes("class 1") || t.title.toLowerCase().includes("class 2")).length,
      mathEng: tests.filter((t) => t.title.toLowerCase().includes("mathematics") || t.title.toLowerCase().includes("english")).length
    };
  }, [tests]);

  const isPrimaryStudent = user?.grade?.toLowerCase().includes("grade 1") || user?.grade?.toLowerCase().includes("grade 2") || user?.grade?.toLowerCase().includes("primary");

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", paddingBottom: "3em" }}>
      {/* Hero Header Section */}
      <div
        style={{
          background: isPrimaryStudent
            ? "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)"
            : "linear-gradient(135deg, #14181f 0%, #1f2530 100%)",
          color: "#fff",
          borderRadius: "var(--radius-lg)",
          padding: "2.4em 2.2em",
          marginBottom: "2em",
          boxShadow: "0 10px 30px rgba(20, 24, 31, 0.15)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Subtle Background Accent Glow */}
        <div
          style={{
            position: "absolute",
            top: "-40%",
            right: "-10%",
            width: "350px",
            height: "350px",
            background: isPrimaryStudent
              ? "radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, rgba(30, 27, 75, 0) 70%)"
              : "radial-gradient(circle, rgba(201, 150, 47, 0.18) 0%, rgba(20, 24, 31, 0) 70%)",
            pointerEvents: "none"
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8em", flexWrap: "wrap", gap: "0.8em" }}>
            <span className="badge badge-accent" style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.3em 0.8em" }}>
              {isPrimaryStudent ? "🎒 PRIMARY SCHOOL EXAMINATION PORTAL" : "⚡ APTITUDE EXAMINATION PORTAL"}
            </span>

            {/* Profile Status Badge */}
            {user && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5em", background: "rgba(255, 255, 255, 0.12)", padding: "0.35em 0.9em", borderRadius: "999px", fontSize: "0.82rem" }}>
                <span>👤 Enrolled as: <strong>{user.name}</strong></span>
                {user.grade && <span className="badge badge-neutral" style={{ background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: "0.7rem" }}>{user.grade}</span>}
                {user.age && <span className="mono" style={{ opacity: 0.85 }}>({user.age} yrs)</span>}
                {user.schoolOrCompany && <span style={{ opacity: 0.85 }}>· {user.schoolOrCompany}</span>}
              </div>
            )}
          </div>

          <h1 style={{ color: "#fff", fontSize: "2.2rem", fontWeight: 700, margin: "0 0 0.35em 0", letterSpacing: "-0.02em" }}>
            {isPrimaryStudent ? `Welcome, ${user.name}!` : "Explore Examination Papers"}
          </h1>

          <p style={{ color: "rgba(250, 249, 246, 0.82)", fontSize: "1.02rem", maxWidth: "720px", lineHeight: "1.55", margin: "0 0 1.6em 0" }}>
            {isPrimaryStudent
              ? `Here are your assigned ${user.grade || "Primary School"} assessment papers. Practice Mathematics (Geometry, Addition, Multiplication) and English (Nouns, Grammar, Reading) with timed questions and full solution reviews!`
              : "Practice on official Claude Certified Architect blueprints or foundational school assessments. Tests feature strict exam-hall clocks, negative marking calibration, and complete post-test solution reviews."}
          </p>

          {/* Quick Stats Pills */}
          <div style={{ display: "flex", gap: "1.4em", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5em", background: "rgba(255, 255, 255, 0.08)", padding: "0.45em 0.9em", borderRadius: "var(--radius-sm)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <span style={{ fontSize: "1.1rem" }}>{isPrimaryStudent ? "🎒" : "🎓"}</span>
              <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff" }}>
                {tests ? `${tests.length} Question Sets Available` : "Loading..."}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5em", background: "rgba(255, 255, 255, 0.08)", padding: "0.45em 0.9em", borderRadius: "var(--radius-sm)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <span style={{ fontSize: "1.1rem" }}>📐</span>
              <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff" }}>
                {isPrimaryStudent ? "50% Mathematics + 50% English" : "300+ Scenario Questions"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5em", background: "rgba(255, 255, 255, 0.08)", padding: "0.45em 0.9em", borderRadius: "var(--radius-sm)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <span style={{ fontSize: "1.1rem" }}>🏫</span>
              <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff" }}>
                {user?.schoolOrCompany || "Bright Day School"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Prominent Active Background Test Callout Card */}
      {hasRunningTest && (
        <div
          className="card"
          style={{
            padding: "1.6em 2em",
            marginBottom: "2.2em",
            background: "linear-gradient(135deg, #1b212c 0%, #14181f 100%)",
            color: "#fff",
            border: "2px solid var(--brass-500)",
            boxShadow: "0 8px 24px rgba(201, 150, 47, 0.22)",
            position: "relative",
            overflow: "hidden"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.4em" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6em", marginBottom: "0.4em" }}>
                <span className="pulse-dot" style={{ background: "#ef4444" }} />
                <span className="badge badge-warn" style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                  ACTIVE TEST IN PROGRESS IN BACKGROUND
                </span>
              </div>
              <h3 style={{ margin: "0.2em 0 0.3em 0", color: "#fff", fontSize: "1.25rem" }}>
                {activeTest.testTitle}
              </h3>
              <div style={{ fontSize: "0.88rem", color: "rgba(250, 249, 246, 0.7)" }}>
                You have a live test clock running. Complete and submit this exam before starting any other assessment.
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1.6em" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.76rem", color: "rgba(250, 249, 246, 0.65)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                  Time Remaining
                </div>
                <div className="mono" style={{ fontSize: "1.8rem", fontWeight: 700, color: activeTest.remainingSeconds <= 60 ? "#ef4444" : "var(--brass-500)" }}>
                  ⏱️ {fmtTime(activeTest.remainingSeconds)}
                </div>
              </div>

              <Link
                to={`/attempt/${activeTest.attemptId}`}
                className="btn btn-accent"
                style={{ padding: "0.75em 1.5em", fontWeight: 700, fontSize: "0.95rem", boxShadow: "0 4px 14px rgba(201, 150, 47, 0.4)" }}
              >
                Resume Examination →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Search & Category Filter Navigation Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.2em",
          marginBottom: "1.8em"
        }}
      >
        {/* Category Tabs (only shown when multiple papers exist) */}
        {counts.all > 1 && (
          <div style={{ display: "flex", background: "var(--paper-100)", padding: "4px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)", flexWrap: "wrap", gap: "4px" }}>
            <button
              onClick={() => setActiveTab("all")}
              style={{
                border: "none",
                background: activeTab === "all" ? "#fff" : "transparent",
                color: activeTab === "all" ? "var(--ink-900)" : "var(--ink-500)",
                fontWeight: activeTab === "all" ? 700 : 500,
                padding: "0.48em 1em",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.88rem",
                cursor: "pointer",
                boxShadow: activeTab === "all" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s ease"
              }}
            >
              {isPrimaryStudent ? "🎒 All School Papers" : "🌟 All Exams"} ({counts.all})
            </button>

            {counts.ccar > 0 && !isPrimaryStudent && (
              <button
                onClick={() => setActiveTab("ccar")}
                style={{
                  border: "none",
                  background: activeTab === "ccar" ? "#fff" : "transparent",
                  color: activeTab === "ccar" ? "var(--ink-900)" : "var(--ink-500)",
                  fontWeight: activeTab === "ccar" ? 700 : 500,
                  padding: "0.48em 1em",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  boxShadow: activeTab === "ccar" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease"
                }}
              >
                🤖 Claude Architecture ({counts.ccar})
              </button>
            )}

            {counts.primary > 0 && !isPrimaryStudent && (
              <button
                onClick={() => setActiveTab("primary")}
                style={{
                  border: "none",
                  background: activeTab === "primary" ? "#fff" : "transparent",
                  color: activeTab === "primary" ? "var(--ink-900)" : "var(--ink-500)",
                  fontWeight: activeTab === "primary" ? 700 : 500,
                  padding: "0.48em 1em",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  boxShadow: activeTab === "primary" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease"
                }}
              >
                🎒 Primary School ({counts.primary})
              </button>
            )}
          </div>
        )}

        {/* Search Box */}
        <div style={{ minWidth: "260px", position: "relative" }}>
          <input
            type="text"
            className="input"
            placeholder="🔍 Search exam titles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "1em", fontSize: "0.9rem" }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--ink-500)",
                cursor: "pointer",
                fontSize: "0.85rem"
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {!tests && <p style={{ color: "var(--ink-500)", padding: "2em 0", textAlign: "center" }}>Loading examination catalog…</p>}

      {tests && filteredTests.length === 0 && (
        <div className="card" style={{ padding: "3.5em 2em", textAlign: "center", color: "var(--ink-500)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.4em" }}>🔍</div>
          <h3 style={{ color: "var(--ink-700)", marginBottom: "0.3em" }}>No examination papers found</h3>
          <p style={{ margin: 0, fontSize: "0.92rem" }}>
            No exams match your search or category filter. Try clearing your search term.
          </p>
        </div>
      )}

      {/* Grid of Rich Examination Cards */}
      <div style={{ display: "grid", gap: "1.5em" }}>
        {filteredTests.map((t) => {
          const meta = getTestMeta(t);
          const isThisActive = hasRunningTest && t.id === activeTest.testId;
          const isLockedByActive = hasRunningTest && t.id !== activeTest.testId;
          const isEligible = t.isEligible !== false;

          return (
            <div
              key={t.id}
              className={`card ${isLockedByActive || !isEligible ? "" : "card-interactive"}`}
              style={{
                padding: "1.8em 2.2em",
                border: isThisActive
                  ? "2px solid var(--brass-500)"
                  : !isEligible
                  ? "1px solid #e5e7eb"
                  : "1px solid var(--line)",
                boxShadow: isThisActive
                  ? "0 4px 18px rgba(201, 150, 47, 0.2)"
                  : "var(--shadow-card)",
                opacity: isLockedByActive || !isEligible ? 0.75 : 1,
                background: isThisActive
                  ? "linear-gradient(180deg, #fff 0%, var(--brass-100) 180%)"
                  : !isEligible
                  ? "var(--paper-0)"
                  : "#fff",
                borderRadius: "var(--radius-lg)"
              }}
            >
              {/* Card Header: Track Badge + Eligibility Status */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8em", flexWrap: "wrap", gap: "0.5em" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6em", flexWrap: "wrap" }}>
                  <span className={`badge ${meta.trackBadge}`}>
                    {meta.icon} {meta.track}
                  </span>
                  <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>
                    🎯 {meta.targetAudience}
                  </span>
                </div>

                {isThisActive && (
                  <span className="badge badge-warn" style={{ fontWeight: 700 }}>
                    <span className="pulse-dot" style={{ background: "#ef4444" }} />
                    RUNNING (⏱️ {fmtTime(activeTest.remainingSeconds)} LEFT)
                  </span>
                )}
                {!isThisActive && isLockedByActive && (
                  <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>
                    🔒 Locked (Finish Active Test)
                  </span>
                )}
                {!isThisActive && !isLockedByActive && !isEligible && (
                  <span className="badge badge-danger" style={{ fontSize: "0.72rem" }}>
                    🔒 Ineligible Profile ({t.eligibilityReason})
                  </span>
                )}
                {!isThisActive && !isLockedByActive && isEligible && (
                  <span className="badge badge-ok" style={{ fontSize: "0.72rem" }}>
                    ✓ Eligible to Attempt
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <h2 style={{ fontSize: "1.25rem", margin: "0 0 0.4em 0", color: "var(--ink-900)", lineHeight: "1.35" }}>
                {t.title}
              </h2>

              {t.description && (
                <p style={{ color: "var(--ink-500)", margin: "0 0 1.2em 0", fontSize: "0.92rem", lineHeight: "1.5" }}>
                  {t.description}
                </p>
              )}

              {/* Exam Specs Bar */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "0.8em",
                  background: "var(--paper-100)",
                  padding: "0.85em 1.2em",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: "1.2em",
                  border: "1px solid var(--line)"
                }}
              >
                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--ink-500)", textTransform: "uppercase", fontWeight: 700 }}>
                    Questions
                  </div>
                  <div className="mono" style={{ fontSize: "0.98rem", fontWeight: 700, color: "var(--ink-900)" }}>
                    📝 {t.questionCount} Items
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--ink-500)", textTransform: "uppercase", fontWeight: 700 }}>
                    Duration
                  </div>
                  <div className="mono" style={{ fontSize: "0.98rem", fontWeight: 700, color: "var(--ink-900)" }}>
                    ⏱️ {meta.duration} Minutes
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--ink-500)", textTransform: "uppercase", fontWeight: 700 }}>
                    Passing Score
                  </div>
                  <div className="mono" style={{ fontSize: "0.98rem", fontWeight: 700, color: "var(--ink-900)" }}>
                    🎯 {meta.passMark}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--ink-500)", textTransform: "uppercase", fontWeight: 700 }}>
                    Marking Scheme
                  </div>
                  <div className="mono" style={{ fontSize: "0.98rem", fontWeight: 700, color: "var(--ink-900)" }}>
                    ⚖️ {meta.marking}
                  </div>
                </div>
              </div>

              {/* Topics / Syllabus Tags + Action Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1em", paddingTop: "0.2em" }}>
                <div style={{ display: "flex", gap: "0.45em", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--ink-500)", fontWeight: 600, marginRight: "0.2em" }}>
                    Topics:
                  </span>
                  {meta.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: "0.75rem",
                        background: "#fff",
                        border: "1px solid var(--line)",
                        color: "var(--ink-700)",
                        padding: "0.2em 0.6em",
                        borderRadius: "var(--radius-sm)",
                        fontWeight: 500
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div>
                  {isThisActive ? (
                    <Link
                      to={`/attempt/${activeTest.attemptId}`}
                      className="btn btn-accent"
                      style={{ padding: "0.65em 1.4em", fontWeight: 700 }}
                    >
                      Resume Examination →
                    </Link>
                  ) : isLockedByActive ? (
                    <button
                      className="btn btn-ghost"
                      disabled
                      style={{
                        cursor: "not-allowed",
                        opacity: 0.55,
                        background: "var(--paper-100)",
                        borderColor: "var(--line)"
                      }}
                      title={`You must finish or submit "${activeTest.testTitle}" before starting this exam.`}
                    >
                      🔒 Locked (In Progress)
                    </button>
                  ) : !isEligible ? (
                    <button
                      className="btn btn-ghost"
                      disabled
                      style={{
                        cursor: "not-allowed",
                        opacity: 0.55,
                        background: "var(--paper-100)",
                        borderColor: "var(--danger-500)",
                        color: "var(--danger-500)"
                      }}
                      title={t.eligibilityReason}
                    >
                      🔒 Ineligible ({t.eligibilityReason.slice(0, 24)}…)
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => start(t.id)}
                      style={{ padding: "0.65em 1.4em", fontWeight: 600 }}
                    >
                      Start Examination →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
