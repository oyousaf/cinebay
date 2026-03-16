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

  setSelectHandler: (fn: (() => void) | null) => void;
  setPlayHandler: (fn: (() => void) | null) => void;

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

const TAB_ORDER: Tab[] = ["movies", "tvshows", "search", "devspick", "watchlist"];

/* -------------------------------------------------
GAMEPAD CONFIG
-------------------------------------------------- */

const GAMEPAD_POLL_MS = 0; // RAF-driven, kept for clarity
const STICK_DEADZONE = 0.45;
const INITIAL_REPEAT_DELAY = 220;
const REPEAT_INTERVAL = 90;

/* -------------------------------------------------
SAFE STORAGE
-------------------------------------------------- */

function canUseDOM() {
  return typeof window !== "undefined";
}

function readStoredTab(): Tab {
  if (!canUseDOM()) return "movies";

  try {
    const value = localStorage.getItem(TAB_KEY);
    if (value && TAB_ORDER.includes(value as Tab)) {
      return value as Tab;
    }
  } catch {}

  return "movies";
}

function readStoredFocusByTab(): Record<Tab, FocusTarget> {
  if (!canUseDOM()) return defaultFocusByTab;

  try {
    const saved = localStorage.getItem(FOCUS_KEY);
    if (!saved) return defaultFocusByTab;

    const parsed = JSON.parse(saved) as Partial<Record<Tab, FocusTarget>>;

    return {
      ...defaultFocusByTab,
      ...Object.fromEntries(
        TAB_ORDER.map((tab) => {
          const entry = parsed?.[tab];
          return [
            tab,
            {
              section: Math.max(0, Number(entry?.section) || 0),
              index: Math.max(0, Number(entry?.index) || 0),
            },
          ];
        }),
      ),
    };
  } catch {
    return defaultFocusByTab;
  }
}

/* -------------------------------------------------
GAMEPAD HELPERS
-------------------------------------------------- */

function isPressed(button?: GamepadButton) {
  return !!button?.pressed || (button?.value ?? 0) > 0.5;
}

function getHorizontalIntent(gamepad: Gamepad) {
  const left = isPressed(gamepad.buttons[14]);
  const right = isPressed(gamepad.buttons[15]);

  if (left && !right) return "left";
  if (right && !left) return "right";

  const axisX = gamepad.axes[0] ?? 0;
  if (axisX <= -STICK_DEADZONE) return "left";
  if (axisX >= STICK_DEADZONE) return "right";

  return null;
}

function getVerticalIntent(gamepad: Gamepad) {
  const up = isPressed(gamepad.buttons[12]);
  const down = isPressed(gamepad.buttons[13]);

  if (up && !down) return "up";
  if (down && !up) return "down";

  const axisY = gamepad.axes[1] ?? 0;
  if (axisY <= -STICK_DEADZONE) return "up";
  if (axisY >= STICK_DEADZONE) return "down";

  return null;
}

function nowMs() {
  return performance.now();
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTabState] = useState<Tab>(readStoredTab);

  const setActiveTab = useCallback((tab: Tab) => {
    setActiveTabState(tab);

    if (canUseDOM()) {
      try {
        localStorage.setItem(TAB_KEY, tab);
      } catch {}
    }
  }, []);

  const [focusByTab, setFocusByTab] =
    useState<Record<Tab, FocusTarget>>(readStoredFocusByTab);

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
    if (!canUseDOM()) return;

    try {
      localStorage.setItem(FOCUS_KEY, JSON.stringify(focusByTab));
    } catch {}
  }, [focusByTab]);

  const [rails, setRails] = useState<number[]>([]);
  const railCount = useRef(0);
  const railsRef = useRef<number[]>([]);
  const activeTabRef = useRef<Tab>(activeTab);
  const isModalOpenRef = useRef(false);

  useEffect(() => {
    railsRef.current = rails;
  }, [rails]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const registerRail = useCallback((length: number) => {
    const idx = railCount.current++;

    setRails((prev) => {
      const next = [...prev];
      next[idx] = Math.max(0, length);
      return next;
    });

    return idx;
  }, []);

  const updateRailLength = useCallback((index: number, length: number) => {
    setRails((prev) => {
      const next = [...prev];
      next[index] = Math.max(0, length);
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

  const [isModalOpen, setModalOpenState] = useState(false);

  const setModalOpen = useCallback((open: boolean) => {
    isModalOpenRef.current = open;
    setModalOpenState(open);
  }, []);

  const tabNavigatorRef = useRef<((dir: TabDirection) => void) | null>(null);
  const selectRef = useRef<(() => void) | null>(null);
  const playRef = useRef<(() => void) | null>(null);

  const setTabNavigator = useCallback((fn: (dir: TabDirection) => void) => {
    tabNavigatorRef.current = fn;
  }, []);

  const setSelectHandler = useCallback((fn: (() => void) | null) => {
    selectRef.current = fn;
  }, []);

  const setPlayHandler = useCallback((fn: (() => void) | null) => {
    playRef.current = fn;
  }, []);

  const moveHorizontal = useCallback(
    (dir: "left" | "right") => {
      setFocus((f) => {
        const railLength = railsRef.current[f.section] ?? 1;
        const maxIndex = Math.max(railLength - 1, 0);

        return {
          ...f,
          index:
            dir === "right"
              ? Math.min(f.index + 1, maxIndex)
              : Math.max(0, f.index - 1),
        };
      });
    },
    [setFocus],
  );

  const cycleTab = useCallback(
    (dir: "prev" | "next") => {
      const current = activeTabRef.current;
      const currentIndex = TAB_ORDER.indexOf(current);
      if (currentIndex === -1) return;

      const nextIndex =
        dir === "next"
          ? (currentIndex + 1) % TAB_ORDER.length
          : (currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;

      restoreFocusForTab(TAB_ORDER[nextIndex]);
    },
    [restoreFocusForTab],
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isModalOpenRef.current) return;

      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;

      if (tabNavigatorRef.current) {
        if (["ArrowUp", "w", "W"].includes(e.key)) {
          e.preventDefault();
          tabNavigatorRef.current("up");
          return;
        }

        if (["ArrowDown", "s", "S"].includes(e.key)) {
          e.preventDefault();
          tabNavigatorRef.current("down");
          return;
        }

        if (e.key === "Escape") {
          tabNavigatorRef.current("escape");
          return;
        }
      }

      if (["Enter", "p", "P"].includes(e.key)) {
        e.preventDefault();
        playRef.current?.();
        return;
      }

      if (["i", "I"].includes(e.key)) {
        e.preventDefault();
        selectRef.current?.();
        return;
      }

      if (["ArrowRight", "d", "D"].includes(e.key)) {
        e.preventDefault();
        moveHorizontal("right");
        return;
      }

      if (["ArrowLeft", "a", "A"].includes(e.key)) {
        e.preventDefault();
        moveHorizontal("left");
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [moveHorizontal]);

  /* -------------------------------------------------
     GAMEPAD SUPPORT
  -------------------------------------------------- */

  const rafRef = useRef<number | null>(null);
  const connectedPadsRef = useRef<Set<number>>(new Set());

  const holdRef = useRef<
    Record<
      string,
      {
        pressed: boolean;
        nextAt: number;
      }
    >
  >({
    up: { pressed: false, nextAt: 0 },
    down: { pressed: false, nextAt: 0 },
    left: { pressed: false, nextAt: 0 },
    right: { pressed: false, nextAt: 0 },
    lb: { pressed: false, nextAt: 0 },
    rb: { pressed: false, nextAt: 0 },
    a: { pressed: false, nextAt: 0 },
    x: { pressed: false, nextAt: 0 },
    b: { pressed: false, nextAt: 0 },
  });

  const runRepeatingAction = useCallback(
    (key: keyof typeof holdRef.current, active: boolean, action: () => void) => {
      const state = holdRef.current[key];
      const ts = nowMs();

      if (!active) {
        state.pressed = false;
        state.nextAt = 0;
        return;
      }

      if (!state.pressed) {
        state.pressed = true;
        state.nextAt = ts + INITIAL_REPEAT_DELAY;
        action();
        return;
      }

      if (ts >= state.nextAt) {
        state.nextAt = ts + REPEAT_INTERVAL;
        action();
      }
    },
    [],
  );

  const runSinglePressAction = useCallback(
    (key: keyof typeof holdRef.current, active: boolean, action: () => void) => {
      const state = holdRef.current[key];

      if (active && !state.pressed) {
        state.pressed = true;
        action();
        return;
      }

      if (!active) {
        state.pressed = false;
      }
    },
    [],
  );

  const pollGamepads = useCallback(() => {
    if (isModalOpenRef.current) {
      rafRef.current = window.requestAnimationFrame(pollGamepads);
      return;
    }

    const pads = navigator.getGamepads?.() ?? [];
    const pad = pads.find(Boolean);

    if (!pad) {
      rafRef.current = window.requestAnimationFrame(pollGamepads);
      return;
    }

    const vertical = getVerticalIntent(pad);
    const horizontal = getHorizontalIntent(pad);

    runRepeatingAction("up", vertical === "up", () => {
      tabNavigatorRef.current?.("up");
    });

    runRepeatingAction("down", vertical === "down", () => {
      tabNavigatorRef.current?.("down");
    });

    runRepeatingAction("left", horizontal === "left", () => {
      moveHorizontal("left");
    });

    runRepeatingAction("right", horizontal === "right", () => {
      moveHorizontal("right");
    });

    runSinglePressAction("a", isPressed(pad.buttons[0]), () => {
      playRef.current?.();
    });

    runSinglePressAction("b", isPressed(pad.buttons[1]), () => {
      tabNavigatorRef.current?.("escape");
    });

    runSinglePressAction("x", isPressed(pad.buttons[2]), () => {
      selectRef.current?.();
    });

    runSinglePressAction("lb", isPressed(pad.buttons[4]), () => {
      cycleTab("prev");
    });

    runSinglePressAction("rb", isPressed(pad.buttons[5]), () => {
      cycleTab("next");
    });

    rafRef.current = window.requestAnimationFrame(pollGamepads);
  }, [cycleTab, moveHorizontal, runRepeatingAction, runSinglePressAction]);

  useEffect(() => {
    const startPolling = () => {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(pollGamepads);
    };

    const stopPolling = () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const onConnect = (e: GamepadEvent) => {
      connectedPadsRef.current.add(e.gamepad.index);
      startPolling();
    };

    const onDisconnect = (e: GamepadEvent) => {
      connectedPadsRef.current.delete(e.gamepad.index);

      const pads = navigator.getGamepads?.() ?? [];
      const stillConnected = pads.some(Boolean);

      if (!stillConnected) {
        stopPolling();

        for (const key of Object.keys(holdRef.current) as Array<
          keyof typeof holdRef.current
        >) {
          holdRef.current[key].pressed = false;
          holdRef.current[key].nextAt = 0;
        }
      }
    };

    window.addEventListener("gamepadconnected", onConnect);
    window.addEventListener("gamepaddisconnected", onDisconnect);

    const alreadyConnected = (navigator.getGamepads?.() ?? []).some(Boolean);
    if (alreadyConnected) startPolling();

    return () => {
      window.removeEventListener("gamepadconnected", onConnect);
      window.removeEventListener("gamepaddisconnected", onDisconnect);
      stopPolling();
    };
  }, [pollGamepads]);

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
      setSelectHandler,
      setPlayHandler,
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
      setSelectHandler,
      setPlayHandler,
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