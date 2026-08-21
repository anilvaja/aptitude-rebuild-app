import { NavLink, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useActiveTest, fmtTime } from "../context/ActiveTestContext";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { activeTest } = useActiveTest();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const isAdmin = user?.role === "ADMIN";

  const studentLinks = [
    { to: "/", label: "📚 Available Tests" },
    { to: "/history", label: "📜 Test History" },
    { to: "/profile", label: "👤 My Profile" },
  ];

  const adminLinks = [
    { to: "/admin", label: "📊 Overview" },
    { to: "/admin/questions", label: "📝 Question Bank" },
    { to: "/admin/tests", label: "🎓 Examination Papers" },
    { to: "/admin/users", label: "👥 Students Roster" },
    { to: "/admin/review", label: "✍️ Review Queue" },
    { to: "/profile", label: "👤 My Profile" },
  ];

  const links = isAdmin ? adminLinks : studentLinks;
  const isRunner = location.pathname.startsWith("/attempt/");
  const showActiveBanner = activeTest?.hasActive && !isRunner;

  const gradeDisplay = user?.grade ? user.grade.replace("_", " ") : "General";

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--paper-50)" }}>
      {/* Top Main Navigation Bar */}
      <header
        style={{
          background: isAdmin
            ? "linear-gradient(90deg, #0f172a 0%, #1e293b 100%)"
            : "linear-gradient(90deg, #1e1b4b 0%, #312e81 100%)",
          color: "#fff",
          padding: "0.85em 1.8em",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          borderBottom: isAdmin ? "2px solid var(--brass-500)" : "2px solid #6366f1",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "2em" }}>
          {/* Logo & Portal Identity */}
          <Link
            to={isAdmin ? "/admin" : "/"}
            style={{
              textDecoration: "none",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "0.6em",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "1.25rem",
                letterSpacing: "-0.02em",
                color: "#fff",
              }}
            >
              Aptitude
            </span>
            <span
              style={{
                fontSize: "0.72rem",
                padding: "0.2em 0.6em",
                borderRadius: "999px",
                fontWeight: 700,
                background: isAdmin ? "var(--brass-500)" : "rgba(255,255,255,0.2)",
                color: "#fff",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {isAdmin ? "Admin Console" : "Student Portal"}
            </span>
          </Link>

          {/* Navigation Items */}
          {user && (
            <nav style={{ display: "flex", gap: "1em", alignItems: "center" }}>
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === "/" || l.to === "/admin"}
                  style={({ isActive }) => ({
                    color: isActive ? "#fff" : "rgba(255, 255, 255, 0.7)",
                    textDecoration: "none",
                    fontSize: "0.86rem",
                    fontWeight: isActive ? 700 : 500,
                    padding: "0.45em 0.85em",
                    borderRadius: "var(--radius-sm)",
                    background: isActive ? (isAdmin ? "rgba(201, 150, 47, 0.25)" : "rgba(99, 102, 241, 0.3)") : "transparent",
                    transition: "all 0.15s ease",
                  })}
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
          )}
        </div>

        {/* User Identity & Logout Action */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "1.1em" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#fff" }}>
                {user.name}
              </div>
              <div style={{ fontSize: "0.74rem", color: "rgba(255, 255, 255, 0.7)" }}>
                {isAdmin ? (
                  <span style={{ color: "var(--brass-500)", fontWeight: 600 }}>Administrator</span>
                ) : (
                  <span>Grade: {gradeDisplay}</span>
                )}
              </div>
            </div>

            <button
              className="btn btn-ghost"
              style={{
                borderColor: "rgba(255,255,255,0.25)",
                color: "#fff",
                fontSize: "0.8rem",
                padding: "0.4em 0.85em",
              }}
              onClick={handleLogout}
            >
              Log out 🚪
            </button>
          </div>
        )}
      </header>

      {/* Sticky Active Background Test Alert Banner */}
      {showActiveBanner && (
        <div
          style={{
            background: "linear-gradient(90deg, #1f2530 0%, #14181f 100%)",
            color: "#fff",
            borderBottom: "2px solid var(--brass-500)",
            padding: "0.75em 1.6em",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.2em",
            flexWrap: "wrap",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            position: "sticky",
            top: 0,
            zIndex: 100,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.8em" }}>
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: activeTest.remainingSeconds <= 60 ? "#ef4444" : "var(--brass-500)",
                boxShadow: `0 0 8px ${activeTest.remainingSeconds <= 60 ? "#ef4444" : "var(--brass-500)"}`,
              }}
            />
            <span style={{ fontWeight: 600, fontSize: "0.92rem" }}>
              Test running in background: <span style={{ color: "var(--brass-500)", fontWeight: 700 }}>{activeTest.testTitle}</span>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.4em" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45em" }}>
              <span style={{ fontSize: "0.82rem", opacity: 0.8 }}>Timer:</span>
              <span
                className="mono"
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: activeTest.remainingSeconds <= 60 ? "#ef4444" : "var(--brass-500)",
                  minWidth: "3.5em",
                }}
              >
                ⏱️ {fmtTime(activeTest.remainingSeconds)}
              </span>
            </div>

            <Link
              to={`/attempt/${activeTest.attemptId}`}
              className="btn btn-accent"
              style={{
                padding: "0.4em 1em",
                fontSize: "0.85rem",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Resume Test →
            </Link>
          </div>
        </div>
      )}

      <main style={{ flex: 1, padding: "2em 1.6em", maxWidth: 1120, margin: "0 auto", width: "100%" }}>
        {children}
      </main>
    </div>
  );
}
