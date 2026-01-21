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
type TabDirection = "up" | "down" | "escape";

interface NavigationContextType {
  focus: FocusTarget;
  setFocus: (f: FocusTarget) => void;

  registerRail: (length: number) => number;
  updateRailLength: (index: number, length: number) => void;
  resetNavigation: () => void;

  isModalOpen: boolean;
  setModalOpen: (open: boolean) => void;

  /** Navbar registers its tab logic here */
  setTabNavigator: (fn: (dir: TabDirection) => void) => void;
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
  const tabNavigatorRef = useRef<((dir: TabDirection) => void) | null>(null);

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

  /* ---------- Navbar hook ---------- */
  const setTabNavigator = useCallback(
    (fn: (dir: TabDirection) => void) => {
      tabNavigatorRef.current = fn;
    },
    [],
  );

  /* -------------------------------------------------
     GLOBAL KEY HANDLER (SINGLE SOURCE OF TRUTH)
  -------------------------------------------------- */
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      /* ---- Hard guards ---- */
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

      /* ---- Tab navigation (Navbar) ---- */
      if (tabNavigatorRef.current) {
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
          tabNavigatorRef.current("up");
          return;
        }
        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
          tabNavigatorRef.current("down");
          return;
        }
        if (e.key === "Escape") {
          tabNavigatorRef.current("escape");
          return;
        }
      }

      /* ---- Rail navigation ---- */
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
        setTabNavigator,
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
