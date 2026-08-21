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

  const studentLinks = [
    { to: "/", label: "Tests" },
    { to: "/history", label: "History" },
  ];
  const adminLinks = [
    { to: "/admin", label: "Overview" },
    { to: "/admin/questions", label: "Question bank" },
    { to: "/admin/tests", label: "Tests" },
    { to: "/admin/users", label: "Students" },
    { to: "/admin/review", label: "Review queue" },
    { to: "/", label: "Take Tests" },
  ];

  const links = user?.role === "ADMIN" ? adminLinks : studentLinks;
  const isRunner = location.pathname.startsWith("/attempt/");
  const showActiveBanner = activeTest?.hasActive && !isRunner;

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          background: "var(--ink-900)",
          color: "var(--paper-0)",
          padding: "0.9em 1.6em",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "2.2em" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.15rem" }}>
            Aptitude
          </span>
          {user && (
            <nav style={{ display: "flex", gap: "1.4em" }}>
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === "/" || l.to === "/admin"}
                  style={({ isActive }) => ({
                    color: isActive ? "var(--brass-500)" : "rgba(250,249,246,0.75)",
                    textDecoration: "none",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    paddingBottom: "0.2em",
                    borderBottom: isActive ? "2px solid var(--brass-500)" : "2px solid transparent",
                  })}
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "1em", fontSize: "0.85rem" }}>
            <span style={{ opacity: 0.8 }}>
              {user.name} · {user.role === "ADMIN" ? "Admin" : "Student"}
            </span>
            <button className="btn btn-ghost" style={{ borderColor: "rgba(250,249,246,0.3)", color: "#fff" }} onClick={handleLogout}>
              Log out
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

      <main style={{ flex: 1, padding: "2em 1.6em", maxWidth: 1080, margin: "0 auto", width: "100%" }}>
        {children}
      </main>
    </div>
  );
}
