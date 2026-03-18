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

/* =========================
   TYPES
========================= */

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

  setSelectHandler: (fn: (() => void) | null) => void;
  setPlayHandler: (fn: (() => void) | null) => void;
  setToggleHandler: (fn: (() => void) | null) => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

const TAB_ORDER: Tab[] = [
  "movies",
  "tvshows",
  "search",
  "devspick",
  "watchlist",
];

const TAB_STORAGE_KEY = "nav_active_tab";
const FOCUS_STORAGE_KEY = "nav_focus_memory";

/* ========================= */

const STICK_DEADZONE = 0.45;
const INITIAL_REPEAT_DELAY = 220;
const REPEAT_INTERVAL = 90;

const isPressed = (b?: GamepadButton) => !!b?.pressed || (b?.value ?? 0) > 0.5;

export function NavigationProvider({ children }: { children: ReactNode }) {
  /* ---------- ACTIVE TAB ---------- */

  const [activeTab, _setActiveTab] = useState<Tab>("movies");

  useEffect(() => {
    const stored = localStorage.getItem(TAB_STORAGE_KEY);
    if (stored && TAB_ORDER.includes(stored as Tab)) {
      _setActiveTab(stored as Tab);
    }
  }, []);

  const setActiveTab = useCallback((tab: Tab) => {
    _setActiveTab(tab);
    localStorage.setItem(TAB_STORAGE_KEY, tab);
  }, []);

  /* ---------- FOCUS + MEMORY ---------- */

  const [focus, setFocus] = useState<FocusTarget>({
    section: 0,
    index: 0,
  });

  const focusMemoryRef = useRef<Record<Tab, FocusTarget>>({
    movies: { section: 0, index: 0 },
    tvshows: { section: 0, index: 0 },
    search: { section: 0, index: 0 },
    devspick: { section: 0, index: 0 },
    watchlist: { section: 0, index: 0 },
  });

  const activeTabRef = useRef<Tab>("movies");

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  /* ---------- LOAD FOCUS MEMORY ---------- */

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FOCUS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        focusMemoryRef.current = {
          ...focusMemoryRef.current,
          ...parsed,
        };
      }
    } catch {}
  }, []);

  /* ---------- RESTORE FOCUS ON TAB LOAD ---------- */

  useEffect(() => {
    const saved = focusMemoryRef.current[activeTab];
    if (saved) {
      setFocus(saved);
    }
  }, [activeTab]);

  /* ---------- SAFE FOCUS SETTER ---------- */

  const setFocusSafe: SetFocus = useCallback((next) => {
    setFocus((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;

      const tab = activeTabRef.current;
      focusMemoryRef.current[tab] = resolved;

      // persist
      localStorage.setItem(
        FOCUS_STORAGE_KEY,
        JSON.stringify(focusMemoryRef.current),
      );

      return resolved;
    });
  }, []);

  const setFocusByIndex = useCallback(
    (section: number, index: number) => setFocusSafe({ section, index }),
    [setFocusSafe],
  );

  /* ---------- rails ---------- */

  const [rails, setRails] = useState<number[]>([]);
  const railsRef = useRef<number[]>([]);
  const railCount = useRef(0);

  useEffect(() => {
    railsRef.current = rails;
  }, [rails]);

  const registerRail = useCallback((length: number) => {
    const i = railCount.current++;
    setRails((p) => {
      const n = [...p];
      n[i] = length;
      return n;
    });
    return i;
  }, []);

  const updateRailLength = useCallback((i: number, l: number) => {
    setRails((p) => {
      const n = [...p];
      n[i] = l;
      return n;
    });
  }, []);

  const restoreFocusForTab = useCallback(
    (tab: Tab) => {
      // save current tab focus
      focusMemoryRef.current[activeTabRef.current] = focus;

      railCount.current = 0;
      setRails([]);

      setActiveTab(tab);

      const nextFocus = focusMemoryRef.current[tab] ?? { section: 0, index: 0 };

      setFocus(nextFocus);
    },
    [focus, setActiveTab],
  );

  /* ---------- modal ---------- */

  const [isModalOpen, setModalOpenState] = useState(false);
  const isModalOpenRef = useRef(false);

  const setModalOpen = useCallback((open: boolean) => {
    isModalOpenRef.current = open;
    setModalOpenState(open);
  }, []);

  /* ---------- handlers ---------- */

  const tabNavigatorRef = useRef<((d: TabDirection) => void) | null>(null);
  const selectRef = useRef<(() => void) | null>(null);
  const playRef = useRef<(() => void) | null>(null);
  const toggleRef = useRef<(() => void) | null>(null);

  const setTabNavigator = useCallback((fn: any) => {
    tabNavigatorRef.current = fn;
  }, []);

  const setSelectHandler = useCallback((fn: any) => {
    selectRef.current = fn;
  }, []);

  const setPlayHandler = useCallback((fn: any) => {
    playRef.current = fn;
  }, []);

  const setToggleHandler = useCallback((fn: any) => {
    toggleRef.current = fn;
  }, []);

  /* ---------- movement ---------- */

  const moveHorizontal = useCallback(
    (dir: "left" | "right") => {
      setFocusSafe((f) => {
        const len = railsRef.current[f.section] ?? 1;
        const max = Math.max(len - 1, 0);

        return {
          ...f,
          index:
            dir === "right"
              ? Math.min(f.index + 1, max)
              : Math.max(0, f.index - 1),
        };
      });
    },
    [setFocusSafe],
  );

  const cycleTab = useCallback(
    (dir: "prev" | "next") => {
      const i = TAB_ORDER.indexOf(activeTab);
      if (i === -1) return;

      const next =
        dir === "next"
          ? (i + 1) % TAB_ORDER.length
          : (i - 1 + TAB_ORDER.length) % TAB_ORDER.length;

      restoreFocusForTab(TAB_ORDER[next]);
    },
    [activeTab, restoreFocusForTab],
  );

  /* ---------- keyboard ---------- */

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const k = e.key;
      const target = e.target as HTMLElement | null;

      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (isTyping) {
        if (k === "Escape") tabNavigatorRef.current?.("escape");
        return;
      }

      if (k === "ArrowUp" || k === "w") tabNavigatorRef.current?.("up");
      if (k === "ArrowDown" || k === "s") tabNavigatorRef.current?.("down");
      if (k === "ArrowLeft" || k === "a") moveHorizontal("left");
      if (k === "ArrowRight" || k === "d") moveHorizontal("right");

      if (k === "Enter" || k.toLowerCase() === "i") selectRef.current?.();

      if (k === "p" || k === "P" || k === "MediaPlayPause" || k === "MediaPlay")
        playRef.current?.();

      if (k.toLowerCase() === "y") toggleRef.current?.();

      if (k === "Escape" || k === "Backspace" || k === "BrowserBack")
        tabNavigatorRef.current?.("escape");
    };

    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [moveHorizontal]);

  /* ---------- gamepad ---------- */

  const rafRef = useRef<number | null>(null);

  const holdRef = useRef<any>({
    up: { pressed: false, nextAt: 0 },
    down: { pressed: false, nextAt: 0 },
    left: { pressed: false, nextAt: 0 },
    right: { pressed: false, nextAt: 0 },
  });

  const repeat = useCallback((k: string, active: boolean, fn: () => void) => {
    const s = holdRef.current[k];
    const now = performance.now();

    if (!active) return (s.pressed = false);

    if (!s.pressed) {
      s.pressed = true;
      s.nextAt = now + INITIAL_REPEAT_DELAY;
      return fn();
    }

    if (now >= s.nextAt) {
      s.nextAt = now + REPEAT_INTERVAL;
      fn();
    }
  }, []);

  const single = useCallback((k: string, active: boolean, fn: () => void) => {
    const s = (holdRef.current[k] ??= { pressed: false });
    if (active && !s.pressed) {
      s.pressed = true;
      fn();
    }
    if (!active) s.pressed = false;
  }, []);

  const poll = useCallback(() => {
    const pad = navigator.getGamepads?.()?.[0];

    if (!pad) {
      rafRef.current = requestAnimationFrame(poll);
      return;
    }

    const isModal = isModalOpenRef.current;

    const axX = pad.axes[0] ?? 0;
    const axY = pad.axes[1] ?? 0;

    const dpadUp = isPressed(pad.buttons?.[12]);
    const dpadDown = isPressed(pad.buttons?.[13]);
    const dpadLeft = isPressed(pad.buttons?.[14]);
    const dpadRight = isPressed(pad.buttons?.[15]);

    if (!isModal) {
      repeat("left", axX < -STICK_DEADZONE || dpadLeft, () =>
        moveHorizontal("left"),
      );
      repeat("right", axX > STICK_DEADZONE || dpadRight, () =>
        moveHorizontal("right"),
      );
      repeat("up", axY < -STICK_DEADZONE || dpadUp, () =>
        tabNavigatorRef.current?.("up"),
      );
      repeat("down", axY > STICK_DEADZONE || dpadDown, () =>
        tabNavigatorRef.current?.("down"),
      );

      single("lb", isPressed(pad.buttons?.[4]), () => cycleTab("prev"));
      single("rb", isPressed(pad.buttons?.[5]), () => cycleTab("next"));
    }

    const selectPressed =
      isPressed(pad.buttons?.[0]) || isPressed(pad.buttons?.[8]);

    single("select", selectPressed, () => {
      if (!isModal) selectRef.current?.();
    });

    const startPressed =
      isPressed(pad.buttons?.[9]) || (pad.buttons?.[7]?.value ?? 0) > 0.75;

    single("start", startPressed, () => playRef.current?.());

    single("b", isPressed(pad.buttons?.[1]), () =>
      tabNavigatorRef.current?.("escape"),
    );

    single("y", isPressed(pad.buttons?.[3]), () => toggleRef.current?.());

    rafRef.current = requestAnimationFrame(poll);
  }, [cycleTab, moveHorizontal, repeat, single]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(poll);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [poll]);

  /* ---------- context ---------- */

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      focus,
      setFocus: setFocusSafe,
      setFocusByIndex,
      registerRail,
      updateRailLength,
      restoreFocusForTab,
      isModalOpen,
      setModalOpen,
      setTabNavigator,
      setSelectHandler,
      setPlayHandler,
      setToggleHandler,
    }),
    [activeTab, focus, isModalOpen, setFocusSafe, setFocusByIndex],
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
