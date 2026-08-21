import { Routes, Route, Navigate } from "react-router-dom";
import { RequireAuth, RequireRole } from "./components/Guards";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import TestList from "./pages/student/TestList";
import TestRunner from "./pages/student/TestRunner";
import Result from "./pages/student/Result";
import History from "./pages/student/History";
import Overview from "./pages/admin/Overview";
import QuestionBank from "./pages/admin/QuestionBank";
import TestBuilder from "./pages/admin/TestBuilder";
import TestAnalytics from "./pages/admin/TestAnalytics";
import Users from "./pages/admin/Users";
import ReviewQueue from "./pages/admin/ReviewQueue";

import Profile from "./pages/Profile";

function HomeRedirect() {
  const { user } = useAuth();
  if (user?.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }
  return <TestList />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />

      {/* Test-taking is deliberately outside the standard Layout chrome —
          fewer distractions while the clock is running. */}
      <Route
        path="/attempt/:id"
        element={
          <RequireRole role="STUDENT">
            <div style={{ maxWidth: 1000, margin: "0 auto", padding: "1.6em" }}>
              <TestRunner />
            </div>
          </RequireRole>
        }
      />

      <Route
        path="/*"
        element={
          <RequireAuth>
            <Layout>
              <Routes>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/history" element={<RequireRole role="STUDENT"><History /></RequireRole>} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/result/:id" element={<Result />} />

                <Route path="/admin" element={<RequireRole role="ADMIN"><Overview /></RequireRole>} />
                <Route path="/admin/questions" element={<RequireRole role="ADMIN"><QuestionBank /></RequireRole>} />
                <Route path="/admin/tests" element={<RequireRole role="ADMIN"><TestBuilder /></RequireRole>} />
                <Route path="/admin/tests/:id/analytics" element={<RequireRole role="ADMIN"><TestAnalytics /></RequireRole>} />
                <Route path="/admin/users" element={<RequireRole role="ADMIN"><Users /></RequireRole>} />
                <Route path="/admin/review" element={<RequireRole role="ADMIN"><ReviewQueue /></RequireRole>} />
              </Routes>
            </Layout>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
