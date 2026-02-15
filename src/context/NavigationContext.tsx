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

export type Tab = "movies" | "tvshows" | "search" | "devspick" | "watchlist";

type FocusTarget = { section: number; index: number; id?: number };
type TabDirection = "up" | "down" | "escape";

interface NavigationContextType {
  /* TAB */
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  /* FOCUS */
  focus: FocusTarget;
  setFocus: (f: FocusTarget) => void;
  setFocusById: (section: number, index: number, id: number) => void;

  registerRail: (length: number) => number;
  updateRailLength: (index: number, length: number) => void;

  /* TAB memory */
  resetForTabChange: (tab: Tab) => void;
  restoreFocusForTab: (tab: Tab) => void;

  /* MODAL */
  isModalOpen: boolean;
  setModalOpen: (open: boolean) => void;

  /* TV navigation */
  setTabNavigator: (fn: (dir: TabDirection) => void) => void;

  triggerSelect?: () => void;
  triggerPlay?: () => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

/* Storage keys */
const TAB_KEY = "tv-active-tab";
const FOCUS_KEY = "tv-focus";

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [rails, setRails] = useState<number[]>([]);

  /* -------------------------------------------------
     TAB (persisted)
  -------------------------------------------------- */
  const [activeTab, setActiveTabState] = useState<Tab>(() => {
    const saved = localStorage.getItem(TAB_KEY);
    return (saved as Tab) ?? "movies";
  });

  const setActiveTab = useCallback((tab: Tab) => {
    setActiveTabState(tab);
    localStorage.setItem(TAB_KEY, tab);
  }, []);

  /* -------------------------------------------------
     FOCUS (persisted)
  -------------------------------------------------- */
  const [focus, setFocus] = useState<FocusTarget>(() => {
    try {
      const saved = localStorage.getItem(FOCUS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          section: 0,
          index: parsed.index ?? 0,
          id: parsed.id,
        };
      }
    } catch {}

    return { section: 0, index: 0 };
  });

  useEffect(() => {
    localStorage.setItem(
      FOCUS_KEY,
      JSON.stringify({
        index: focus.index,
        id: focus.id,
      }),
    );
  }, [focus.index, focus.id]);

  const [isModalOpen, setModalOpen] = useState(false);

  const railCount = useRef(0);
  const tabNavigatorRef = useRef<((dir: TabDirection) => void) | null>(null);

  const selectRef = useRef<(() => void) | null>(null);
  const playRef = useRef<(() => void) | null>(null);

  /* -------------------------------------------------
     TAB FOCUS MEMORY
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
     RAILS
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

      setFocus((f) => ({
        section: 0,
        index: f.index,
        id: f.id,
      }));
    },
    [focus],
  );

  const restoreFocusForTab = useCallback((tab: Tab) => {
    const saved = focusMemory.current[tab];

    setFocus({
      section: 0,
      index: saved?.index ?? 0,
      id: saved?.id,
    });
  }, []);

  const setTabNavigator = useCallback((fn: (dir: TabDirection) => void) => {
    tabNavigatorRef.current = fn;
  }, []);

  /* -------------------------------------------------
     KEYBOARD (TV controls)
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
  }, [rails, isModalOpen]);

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
