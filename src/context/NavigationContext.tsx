"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";

export type Tab = "movies" | "tvshows" | "search" | "devspick" | "watchlist";

type FocusTarget = { section: number; index: number; id?: number };
type TabDirection = "up" | "down" | "escape";

/* Allow object OR functional update */
type SetFocus = (f: FocusTarget | ((prev: FocusTarget) => FocusTarget)) => void;

interface NavigationContextType {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  focus: FocusTarget;
  setFocus: SetFocus;
  setFocusById: (section: number, index: number, id: number) => void;

  registerRail: (length: number) => number;
  updateRailLength: (index: number, length: number) => void;

  restoreFocusForTab: (tab: Tab) => void;

  isModalOpen: boolean;
  setModalOpen: (open: boolean) => void;

  setTabNavigator: (fn: (dir: TabDirection) => void) => void;

  triggerSelect?: () => void;
  triggerPlay?: () => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

const TAB_KEY = "tv-active-tab";
const FOCUS_KEY = "tv-focus-by-tab";

const defaultFocus: FocusTarget = { section: 0, index: 0 };

const defaultFocusByTab: Record<Tab, FocusTarget> = {
  movies: defaultFocus,
  tvshows: defaultFocus,
  search: defaultFocus,
  devspick: defaultFocus,
  watchlist: defaultFocus,
};

export function NavigationProvider({ children }: { children: ReactNode }) {
  /* -------------------------------------------------
     TAB
  -------------------------------------------------- */
  const [activeTab, setActiveTabState] = useState<Tab>(() => {
    if (typeof window === "undefined") return "movies";
    return (localStorage.getItem(TAB_KEY) as Tab) ?? "movies";
  });

  const setActiveTab = useCallback((tab: Tab) => {
    setActiveTabState(tab);
    localStorage.setItem(TAB_KEY, tab);
  }, []);

  /* -------------------------------------------------
     FOCUS (single source of truth)
  -------------------------------------------------- */
  const [focusByTab, setFocusByTab] = useState<Record<Tab, FocusTarget>>(() => {
    if (typeof window === "undefined") return defaultFocusByTab;
    try {
      const saved = localStorage.getItem(FOCUS_KEY);
      if (saved) return { ...defaultFocusByTab, ...JSON.parse(saved) };
    } catch {}
    return defaultFocusByTab;
  });

  const focus = focusByTab[activeTab] ?? defaultFocus;

  const setFocus: SetFocus = useCallback(
    (f) => {
      setFocusByTab((prev) => {
        const current = prev[activeTab] ?? defaultFocus;
        const next = typeof f === "function" ? f(current) : f;

        return {
          ...prev,
          [activeTab]: next,
        };
      });
    },
    [activeTab],
  );

  const setFocusById = useCallback(
    (section: number, index: number, id: number) => {
      setFocus({ section, index, id });
    },
    [setFocus],
  );

  /* Persist all tabs */
  useEffect(() => {
    localStorage.setItem(FOCUS_KEY, JSON.stringify(focusByTab));
  }, [focusByTab]);

  /* -------------------------------------------------
     RAILS
  -------------------------------------------------- */
  const [rails, setRails] = useState<number[]>([]);
  const railCount = useRef(0);

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

  /* Reset rails when tab changes */
  const restoreFocusForTab = useCallback(
    (tab: Tab) => {
      railCount.current = 0;
      setRails([]);
      setActiveTab(tab);
    },
    [setActiveTab],
  );

  /* -------------------------------------------------
     MODAL + NAV
  -------------------------------------------------- */
  const [isModalOpen, setModalOpen] = useState(false);
  const tabNavigatorRef = useRef<((dir: TabDirection) => void) | null>(null);

  const selectRef = useRef<(() => void) | null>(null);
  const playRef = useRef<(() => void) | null>(null);

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

      if (["Enter", "p", "P"].includes(e.key)) playRef.current?.();
      if (["i", "I"].includes(e.key)) selectRef.current?.();

      if (["ArrowRight", "d", "D"].includes(e.key)) {
        e.preventDefault();
        setFocus((f) => ({
          ...f,
          index: Math.min(f.index + 1, (rails[f.section] ?? 1) - 1),
        }));
      }

      if (["ArrowLeft", "a", "A"].includes(e.key)) {
        e.preventDefault();
        setFocus((f) => ({
          ...f,
          index: Math.max(0, f.index - 1),
        }));
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [rails, isModalOpen, setFocus]);

  return (
    <NavigationContext.Provider
      value={{
        activeTab,
        setActiveTab,
        focus,
        setFocus,
        setFocusById,
        registerRail,
        updateRailLength,
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
