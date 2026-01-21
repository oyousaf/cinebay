"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";

/* -------------------------------------------------
   TYPES
-------------------------------------------------- */
type FocusTarget = { section: number; index: number };

interface NavigationContextType {
  focus: FocusTarget;
  setFocus: (f: FocusTarget) => void;

  registerRail: (length: number) => number;
  updateRailLength: (index: number, length: number) => void;
  resetNavigation: () => void;

  isModalOpen: boolean;
  setModalOpen: (open: boolean) => void;
}

/* -------------------------------------------------
   CONTEXT
-------------------------------------------------- */
const NavigationContext = createContext<NavigationContextType | null>(null);

/* -------------------------------------------------
   PROVIDER
-------------------------------------------------- */
export function NavigationProvider({ children }: { children: ReactNode }) {
  const [rails, setRails] = useState<number[]>([]);
  const [focus, setFocus] = useState<FocusTarget>({ section: 0, index: 0 });
  const [isModalOpen, setModalOpen] = useState(false);

  const railCount = useRef(0);

  /* ---------- Rail registration ---------- */
  const registerRail = useCallback((length: number) => {
    const index = railCount.current;
    railCount.current += 1;

    setRails((prev) => {
      const next = [...prev];
      next[index] = length;
      return next;
    });

    return index;
  }, []);

  const updateRailLength = useCallback((index: number, length: number) => {
    setRails((prev) => {
      const next = [...prev];
      next[index] = length;
      return next;
    });
  }, []);

  const resetNavigation = useCallback(() => {
    railCount.current = 0;
    setRails([]);
    setFocus({ section: 0, index: 0 });
  }, []);

  /* -------------------------------------------------
     GLOBAL KEY HANDLER (HARD-GUARDED)
  -------------------------------------------------- */
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      /* ---- Absolute guards ---- */

      if (isModalOpen) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      /* ---- Navigation ---- */
      setFocus((prev) => {
        const maxIndex =
          rails[prev.section] !== undefined
            ? Math.max(rails[prev.section] - 1, 0)
            : 0;

        let next = { ...prev };

        switch (e.key) {
          case "ArrowRight":
          case "d":
          case "D":
            next.index = Math.min(prev.index + 1, maxIndex);
            break;

          case "ArrowLeft":
          case "a":
          case "A":
            next.index = Math.max(prev.index - 1, 0);
            break;

          case "ArrowDown":
          case "s":
          case "S":
            if (prev.section < rails.length - 1) {
              next.section = prev.section + 1;
              next.index = Math.min(
                prev.index,
                Math.max((rails[next.section] ?? 1) - 1, 0),
              );
            }
            break;

          case "ArrowUp":
          case "w":
          case "W":
            if (prev.section > 0) {
              next.section = prev.section - 1;
              next.index = Math.min(
                prev.index,
                Math.max((rails[next.section] ?? 1) - 1, 0),
              );
            }
            break;

          default:
            return prev;
        }

        return next;
      });
    },
    [rails, isModalOpen],
  );

  /* ---------- Lifecycle ---------- */
  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  /* -------------------------------------------------
     PROVIDER
  -------------------------------------------------- */
  return (
    <NavigationContext.Provider
      value={{
        focus,
        setFocus,
        registerRail,
        updateRailLength,
        resetNavigation,
        isModalOpen,
        setModalOpen,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

/* -------------------------------------------------
   HOOK
-------------------------------------------------- */
export function useNavigation(): NavigationContextType {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("useNavigation must be used inside NavigationProvider");
  }
  return ctx;
}
