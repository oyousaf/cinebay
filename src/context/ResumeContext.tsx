"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";

type ResumeContextValue = {
  version: number;
  bump: () => void;
};

const ResumeContext = createContext<ResumeContextValue | null>(null);

export function ResumeProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);

  const bump = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  return (
    <ResumeContext.Provider value={{ version, bump }}>
      {children}
    </ResumeContext.Provider>
  );
}

export function useResumeSignal() {
  const ctx = useContext(ResumeContext);
  if (!ctx) {
    throw new Error("useResumeSignal must be used inside ResumeProvider");
  }
  return ctx;
}
