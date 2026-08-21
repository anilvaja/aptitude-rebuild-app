import { useEffect, useState } from "react";
import { api } from "../../api/client";

function Stat({ label, value }) {
  return (
    <div className="card" style={{ padding: "1.4em" }}>
      <div className="label">{label}</div>
      <div className="mono" style={{ fontSize: "1.8rem", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

export default function Overview() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/api/admin/analytics/overview").then(setStats);
  }, []);

  return (
    <div>
      <h1>Overview</h1>
      {!stats ? (
        <p>Loading…</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1em" }}>
          <Stat label="Students" value={stats.studentCount} />
          <Stat label="Active tests" value={stats.testCount} />
          <Stat label="Completed attempts" value={stats.attemptCount} />
          <Stat label="Active questions" value={stats.questionCount} />
          <Stat label="Average score" value={stats.avgScorePercent !== null ? `${stats.avgScorePercent}%` : "—"} />
        </div>
      )}
    </div>
  );
}
