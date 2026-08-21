import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";

const ActiveTestContext = createContext(null);

export function fmtTime(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined || totalSeconds < 0) return "00:00";
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export function ActiveTestProvider({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTest, setActiveTest] = useState(null); // { hasActive, attemptId, testId, testTitle, remainingSeconds, durationSeconds }
  const timerRef = useRef(null);

  const checkActive = useCallback(async () => {
    if (!user) {
      setActiveTest(null);
      return;
    }
    try {
      const data = await api.get("/api/attempts/active");
      if (data && data.hasActive) {
        setActiveTest(data);
      } else {
        setActiveTest({ hasActive: false });
      }
    } catch {
      setActiveTest({ hasActive: false });
    }
  }, [user]);

  // Check on mount, user change, or route navigation
  useEffect(() => {
    checkActive();
  }, [checkActive, location.pathname]);

  // Polling every 12 seconds as a fallback
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkActive, 12000);
    return () => clearInterval(interval);
  }, [user, checkActive]);

  // Local 1-second ticking countdown
  useEffect(() => {
    if (!activeTest || !activeTest.hasActive) {
      clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setActiveTest((prev) => {
        if (!prev || !prev.hasActive) return prev;
        if (prev.remainingSeconds <= 1) {
          clearInterval(timerRef.current);
          // Re-sync with server upon expiry
          setTimeout(checkActive, 1000);
          return { ...prev, remainingSeconds: 0 };
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [activeTest?.hasActive, checkActive]);

  return (
    <ActiveTestContext.Provider value={{ activeTest, refreshActiveTest: checkActive }}>
      {children}
    </ActiveTestContext.Provider>
  );
}

export function useActiveTest() {
  return useContext(ActiveTestContext);
}
