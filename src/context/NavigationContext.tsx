"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Tab = "movies" | "tvshows" | "search" | "devspick" | "watchlist";

type FocusTarget = { section: number; index: number };
type TabDirection = "up" | "down" | "escape";

type SetFocus = (f: FocusTarget | ((prev: FocusTarget) => FocusTarget)) => void;

interface NavigationContextType {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  focus: FocusTarget;
  setFocus: SetFocus;
  setFocusByIndex: (section: number, index: number) => void;

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
  const [activeTab, setActiveTabState] = useState<Tab>(() => {
    if (typeof window === "undefined") return "movies";
    return (localStorage.getItem(TAB_KEY) as Tab) ?? "movies";
  });

  const setActiveTab = useCallback((tab: Tab) => {
    setActiveTabState(tab);
    localStorage.setItem(TAB_KEY, tab);
  }, []);

  const [focusByTab, setFocusByTab] = useState<Record<Tab, FocusTarget>>(() => {
    if (typeof window === "undefined") return defaultFocusByTab;

    try {
      const saved = localStorage.getItem(FOCUS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Record<Tab, FocusTarget>>;
        return {
          ...defaultFocusByTab,
          ...parsed,
        };
      }
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
          [activeTab]: {
            section: Math.max(0, next.section),
            index: Math.max(0, next.index),
          },
        };
      });
    },
    [activeTab],
  );

  const setFocusByIndex = useCallback(
    (section: number, index: number) => {
      setFocus({ section, index });
    },
    [setFocus],
  );

  useEffect(() => {
    localStorage.setItem(FOCUS_KEY, JSON.stringify(focusByTab));
  }, [focusByTab]);

  const [rails, setRails] = useState<number[]>([]);
  const railCount = useRef(0);

  const registerRail = useCallback((length: number) => {
    const idx = railCount.current++;

    setRails((prev) => {
      const next = [...prev];
      next[idx] = length;
      return next;
    });

    return idx;
  }, []);

  const updateRailLength = useCallback((index: number, length: number) => {
    setRails((prev) => {
      const next = [...prev];
      next[index] = length;
      return next;
    });
  }, []);

  const restoreFocusForTab = useCallback(
    (tab: Tab) => {
      railCount.current = 0;
      setRails([]);
      setActiveTab(tab);
    },
    [setActiveTab],
  );

  const [isModalOpen, setModalOpen] = useState(false);

  const tabNavigatorRef = useRef<((dir: TabDirection) => void) | null>(null);
  const selectRef = useRef<(() => void) | null>(null);
  const playRef = useRef<(() => void) | null>(null);

  const setTabNavigator = useCallback((fn: (dir: TabDirection) => void) => {
    tabNavigatorRef.current = fn;
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isModalOpen) return;

      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;

      if (tabNavigatorRef.current) {
        if (["ArrowUp", "w", "W"].includes(e.key)) {
          e.preventDefault();
          return tabNavigatorRef.current("up");
        }

        if (["ArrowDown", "s", "S"].includes(e.key)) {
          e.preventDefault();
          return tabNavigatorRef.current("down");
        }

        if (e.key === "Escape") {
          return tabNavigatorRef.current("escape");
        }
      }

      if (["Enter", "p", "P"].includes(e.key)) playRef.current?.();
      if (["i", "I"].includes(e.key)) selectRef.current?.();

      if (["ArrowRight", "d", "D"].includes(e.key)) {
        e.preventDefault();

        setFocus((f) => {
          const railLength = rails[f.section] ?? 1;
          return {
            ...f,
            index: Math.min(f.index + 1, Math.max(railLength - 1, 0)),
          };
        });
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
  }, [rails, setFocus, isModalOpen]);

  const value = useMemo<NavigationContextType>(
    () => ({
      activeTab,
      setActiveTab,
      focus,
      setFocus,
      setFocusByIndex,
      registerRail,
      updateRailLength,
      restoreFocusForTab,
      isModalOpen,
      setModalOpen,
      setTabNavigator,
      triggerSelect: () => selectRef.current?.(),
      triggerPlay: () => playRef.current?.(),
    }),
    [
      activeTab,
      setActiveTab,
      focus,
      setFocus,
      setFocusByIndex,
      registerRail,
      updateRailLength,
      restoreFocusForTab,
      isModalOpen,
      setModalOpen,
      setTabNavigator,
    ],
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation must be used inside provider");
  return ctx;
}
