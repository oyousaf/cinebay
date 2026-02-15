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

type FocusTarget = { section: number; index: number; id?: number };
type TabDirection = "up" | "down" | "escape";
type Tab = "movies" | "tvshows" | "search" | "devspick" | "watchlist";

interface NavigationContextType {
  focus: FocusTarget;
  setFocus: (f: FocusTarget) => void;
  setFocusById: (section: number, index: number, id: number) => void;

  registerRail: (length: number) => number;
  updateRailLength: (index: number, length: number) => void;

  resetForTabChange: (tab: Tab) => void;
  restoreFocusForTab: (tab: Tab) => void;

  isModalOpen: boolean;
  setModalOpen: (open: boolean) => void;

  setTabNavigator: (fn: (dir: TabDirection) => void) => void;

  triggerSelect?: () => void;
  triggerPlay?: () => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

const STORAGE_KEY = "nav-focus";

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [rails, setRails] = useState<number[]>([]);
  const [focus, setFocus] = useState<FocusTarget>({
    section: 0,
    index: 0,
  });

  const [isModalOpen, setModalOpen] = useState(false);

  const railCount = useRef(0);
  const tabNavigatorRef = useRef<((dir: TabDirection) => void) | null>(null);

  const selectRef = useRef<(() => void) | null>(null);
  const playRef = useRef<(() => void) | null>(null);

  /* -------------------------------------------------
     RESTORE FROM SESSION
  -------------------------------------------------- */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFocus(parsed);
      }
    } catch {}
  }, []);

  /* Save on change */
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(focus));
    } catch {}
  }, [focus]);

  /* -------------------------------------------------
     FOCUS MEMORY PER TAB
  -------------------------------------------------- */
  const focusMemory = useRef<Record<Tab, FocusTarget>>({
    movies: { section: 0, index: 0 },
    tvshows: { section: 0, index: 0 },
    search: { section: 0, index: 0 },
    devspick: { section: 0, index: 0 },
    watchlist: { section: 0, index: 0 },
  });

  const setFocusById = useCallback(
    (section: number, index: number, id: number) => {
      setFocus({ section, index, id });
    },
    [],
  );

  /* -------------------------------------------------
     RAIL REGISTRATION
  -------------------------------------------------- */
  const registerRail = useCallback((length: number) => {
    const idx = railCount.current++;
    setRails((r) => {
      const n = [...r];
      n[idx] = length;
      return n;
    });
    return idx;
  }, []);

  const updateRailLength = useCallback((i: number, l: number) => {
    setRails((r) => {
      const n = [...r];
      n[i] = l;
      return n;
    });
  }, []);

  /* -------------------------------------------------
     TAB CHANGE
  -------------------------------------------------- */
  const resetForTabChange = useCallback(
    (tab: Tab) => {
      focusMemory.current[tab] = focus;
      railCount.current = 0;
      setRails([]);
    },
    [focus],
  );

  const restoreFocusForTab = useCallback((tab: Tab) => {
    const saved = focusMemory.current[tab];
    setFocus(saved ?? { section: 0, index: 0 });
  }, []);

  const setTabNavigator = useCallback((fn: (dir: TabDirection) => void) => {
    tabNavigatorRef.current = fn;
  }, []);

  /* -------------------------------------------------
     KEYBOARD
  -------------------------------------------------- */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isModalOpen) return;

      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;

      if (tabNavigatorRef.current) {
        if (["ArrowUp", "w", "W"].includes(e.key))
          return tabNavigatorRef.current("up");
        if (["ArrowDown", "s", "S"].includes(e.key))
          return tabNavigatorRef.current("down");
        if (e.key === "Escape") return tabNavigatorRef.current("escape");
      }

      if (["Enter", "p"].includes(e.key)) playRef.current?.();
      if (["i"].includes(e.key)) selectRef.current?.();

      if (e.key === "ArrowRight")
        setFocus((f) => ({
          ...f,
          index: Math.min(f.index + 1, (rails[f.section] ?? 1) - 1),
        }));

      if (e.key === "ArrowLeft")
        setFocus((f) => ({
          ...f,
          index: Math.max(0, f.index - 1),
        }));
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [rails, isModalOpen]);

  return (
    <NavigationContext.Provider
      value={{
        focus,
        setFocus,
        setFocusById,
        registerRail,
        updateRailLength,
        resetForTabChange,
        restoreFocusForTab,
        isModalOpen,
        setModalOpen,
        setTabNavigator,
        triggerSelect: () => selectRef.current?.(),
        triggerPlay: () => playRef.current?.(),
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation must be used inside provider");
  return ctx;
}
