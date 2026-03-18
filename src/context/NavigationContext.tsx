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
export type FocusItemId = string | number;

export type FocusTarget = {
  section: number;
  index: number;
  itemId?: FocusItemId | null;
};

type TabDirection = "up" | "down" | "escape";
type SetFocus = (
  next: FocusTarget | ((prev: FocusTarget) => FocusTarget),
) => void;

type PersistedNavigationState = {
  activeTab: Tab;
  focusMemory: Record<Tab, FocusTarget>;
};

interface NavigationContextType {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  focus: FocusTarget;
  setFocus: SetFocus;
  setFocusByIndex: (
    section: number,
    index: number,
    itemId?: FocusItemId | null,
  ) => void;

  registerRail: (length: number) => number;
  updateRailLength: (index: number, length: number) => void;
  restoreFocusForTab: (tab: Tab) => void;

  isModalOpen: boolean;
  setModalOpen: (open: boolean) => void;

  setTabNavigator: (fn: ((dir: TabDirection) => void) | null) => void;

  setSelectHandler: (fn: (() => void) | null) => void;
  setPlayHandler: (fn: (() => void) | null) => void;
  setToggleHandler: (fn: (() => void) | null) => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

/* =========================
   CONSTANTS
========================= */

const TAB_ORDER: Tab[] = [
  "movies",
  "tvshows",
  "search",
  "devspick",
  "watchlist",
];

const NAV_STORAGE_KEY = "nav_state_v2";

const STICK_DEADZONE = 0.45;
const INITIAL_REPEAT_DELAY = 220;
const REPEAT_INTERVAL = 90;

/* =========================
   HELPERS
========================= */

const isPressed = (b?: GamepadButton) => !!b?.pressed || (b?.value ?? 0) > 0.5;

const DEFAULT_FOCUS: FocusTarget = {
  section: 0,
  index: 0,
  itemId: null,
};

const createDefaultFocusMemory = (): Record<Tab, FocusTarget> => ({
  movies: { ...DEFAULT_FOCUS },
  tvshows: { ...DEFAULT_FOCUS },
  search: { ...DEFAULT_FOCUS },
  devspick: { ...DEFAULT_FOCUS },
  watchlist: { ...DEFAULT_FOCUS },
});

const createDefaultNavState = (): PersistedNavigationState => ({
  activeTab: "movies",
  focusMemory: createDefaultFocusMemory(),
});

const isValidTab = (value: unknown): value is Tab =>
  typeof value === "string" && TAB_ORDER.includes(value as Tab);

const normaliseFocus = (
  value: Partial<FocusTarget> | null | undefined,
): FocusTarget => ({
  section:
    typeof value?.section === "number" && Number.isFinite(value.section)
      ? Math.max(0, Math.floor(value.section))
      : 0,
  index:
    typeof value?.index === "number" && Number.isFinite(value.index)
      ? Math.max(0, Math.floor(value.index))
      : 0,
  itemId:
    typeof value?.itemId === "string" || typeof value?.itemId === "number"
      ? value.itemId
      : null,
});

const readPersistedNavState = (): PersistedNavigationState => {
  if (typeof window === "undefined") return createDefaultNavState();

  try {
    const raw = localStorage.getItem(NAV_STORAGE_KEY);
    if (!raw) return createDefaultNavState();

    const parsed = JSON.parse(raw) as Partial<PersistedNavigationState>;

    return {
      activeTab: isValidTab(parsed?.activeTab) ? parsed.activeTab : "movies",
      focusMemory: {
        movies: normaliseFocus(parsed?.focusMemory?.movies),
        tvshows: normaliseFocus(parsed?.focusMemory?.tvshows),
        search: normaliseFocus(parsed?.focusMemory?.search),
        devspick: normaliseFocus(parsed?.focusMemory?.devspick),
        watchlist: normaliseFocus(parsed?.focusMemory?.watchlist),
      },
    };
  } catch {
    return createDefaultNavState();
  }
};

type HoldState = {
  pressed: boolean;
  nextAt?: number;
};

type HoldMap = Record<string, HoldState>;

export function NavigationProvider({ children }: { children: ReactNode }) {
  /* ---------- HYDRATE ONCE ---------- */

  const initialNavRef = useRef<PersistedNavigationState>(
    readPersistedNavState(),
  );

  const [activeTab, setActiveTabState] = useState<Tab>(
    initialNavRef.current.activeTab,
  );

  const [focus, setFocusState] = useState<FocusTarget>(
    initialNavRef.current.focusMemory[initialNavRef.current.activeTab] ??
      DEFAULT_FOCUS,
  );

  const [isModalOpen, setModalOpenState] = useState(false);

  /* ---------- REFS ---------- */

  const activeTabRef = useRef<Tab>(activeTab);
  const focusRef = useRef<FocusTarget>(focus);
  const isModalOpenRef = useRef(false);

  const focusMemoryRef = useRef<Record<Tab, FocusTarget>>(
    initialNavRef.current.focusMemory,
  );

  const railsRef = useRef<number[]>([]);
  const railCountRef = useRef(0);

  const rafRef = useRef<number | null>(null);

  const tabNavigatorRef = useRef<((dir: TabDirection) => void) | null>(null);
  const selectRef = useRef<(() => void) | null>(null);
  const playRef = useRef<(() => void) | null>(null);
  const toggleRef = useRef<(() => void) | null>(null);

  const holdRef = useRef<HoldMap>({
    up: { pressed: false, nextAt: 0 },
    down: { pressed: false, nextAt: 0 },
    left: { pressed: false, nextAt: 0 },
    right: { pressed: false, nextAt: 0 },
    lb: { pressed: false },
    rb: { pressed: false },
    select: { pressed: false },
    play: { pressed: false },
    back: { pressed: false },
    toggle: { pressed: false },
  });

  /* ---------- REF SYNC ---------- */

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    focusRef.current = focus;
  }, [focus]);

  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  /* ---------- PERSIST ---------- */

  const persistState = useCallback(() => {
    if (typeof window === "undefined") return;

    const payload: PersistedNavigationState = {
      activeTab: activeTabRef.current,
      focusMemory: focusMemoryRef.current,
    };

    localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(payload));
  }, []);

  /* ---------- SAFE CALL ---------- */

  const call = useCallback((fn: (() => void) | null | undefined) => {
    try {
      fn?.();
    } catch (err) {
      console.error("Navigation action failed:", err);
    }
  }, []);

  const callTabNav = useCallback((dir: TabDirection) => {
    try {
      tabNavigatorRef.current?.(dir);
    } catch (err) {
      console.error("Tab navigation failed:", err);
    }
  }, []);

  const resetHoldState = useCallback(() => {
    const entries = holdRef.current;
    for (const key of Object.keys(entries)) {
      entries[key].pressed = false;
      entries[key].nextAt = 0;
    }
  }, []);

  /* ---------- FOCUS ---------- */

  const setFocusSafe: SetFocus = useCallback(
    (next) => {
      setFocusState((prev) => {
        const resolved = normaliseFocus(
          typeof next === "function" ? next(prev) : next,
        );

        const tab = activeTabRef.current;
        focusMemoryRef.current[tab] = resolved;
        focusRef.current = resolved;

        persistState();
        return resolved;
      });
    },
    [persistState],
  );

  const setFocusByIndex = useCallback(
    (section: number, index: number, itemId?: FocusItemId | null) => {
      setFocusSafe({
        section,
        index,
        itemId: itemId ?? null,
      });
    },
    [setFocusSafe],
  );

  /* ---------- TABS ---------- */

  const setActiveTab = useCallback(
    (tab: Tab) => {
      if (tab === activeTabRef.current) return;

      const currentTab = activeTabRef.current;
      focusMemoryRef.current[currentTab] = normaliseFocus(focusRef.current);

      activeTabRef.current = tab;
      setActiveTabState(tab);

      const nextFocus = normaliseFocus(
        focusMemoryRef.current[tab] ?? DEFAULT_FOCUS,
      );

      focusMemoryRef.current[tab] = nextFocus;
      focusRef.current = nextFocus;
      setFocusState(nextFocus);

      persistState();
    },
    [persistState],
  );

  const restoreFocusForTab = useCallback(
    (tab: Tab) => {
      railCountRef.current = 0;
      railsRef.current = [];
      setActiveTab(tab);
    },
    [setActiveTab],
  );

  /* ---------- RAILS ---------- */

  const registerRail = useCallback((length: number) => {
    const nextIndex = railCountRef.current;
    railCountRef.current += 1;
    railsRef.current[nextIndex] = length;
    return nextIndex;
  }, []);

  const updateRailLength = useCallback((index: number, length: number) => {
    railsRef.current[index] = length;
  }, []);

  /* ---------- MODAL ---------- */

  const setModalOpen = useCallback(
    (open: boolean) => {
      isModalOpenRef.current = open;
      setModalOpenState(open);
      resetHoldState();
    },
    [resetHoldState],
  );

  /* ---------- HANDLERS ---------- */

  const setTabNavigator = useCallback(
    (fn: ((dir: TabDirection) => void) | null) => {
      tabNavigatorRef.current = fn;
    },
    [],
  );

  const setSelectHandler = useCallback((fn: (() => void) | null) => {
    selectRef.current = fn;
  }, []);

  const setPlayHandler = useCallback((fn: (() => void) | null) => {
    playRef.current = fn;
  }, []);

  const setToggleHandler = useCallback((fn: (() => void) | null) => {
    toggleRef.current = fn;
  }, []);

  /* ---------- MOVEMENT ---------- */

  const moveHorizontal = useCallback(
    (dir: "left" | "right") => {
      setFocusSafe((prev) => {
        const len = railsRef.current[prev.section] ?? 1;
        const max = Math.max(len - 1, 0);

        const nextIndex =
          dir === "right"
            ? Math.min(prev.index + 1, max)
            : Math.max(prev.index - 1, 0);

        if (nextIndex === prev.index) return prev;

        return {
          section: prev.section,
          index: nextIndex,
          itemId: null,
        };
      });
    },
    [setFocusSafe],
  );

  const cycleTab = useCallback(
    (dir: "prev" | "next") => {
      const currentIndex = TAB_ORDER.indexOf(activeTabRef.current);
      if (currentIndex === -1) return;

      const nextIndex =
        dir === "next"
          ? (currentIndex + 1) % TAB_ORDER.length
          : (currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;

      restoreFocusForTab(TAB_ORDER[nextIndex]);
    },
    [restoreFocusForTab],
  );

  /* ---------- KEYBOARD ---------- */

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const key = e.key;
      const target = e.target as HTMLElement | null;

      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (isTyping) {
        if (key === "Escape") callTabNav("escape");
        return;
      }

      if (key === "ArrowUp" || key === "w" || key === "W") {
        callTabNav("up");
      }

      if (key === "ArrowDown" || key === "s" || key === "S") {
        callTabNav("down");
      }

      if (key === "ArrowLeft" || key === "a" || key === "A") {
        moveHorizontal("left");
      }

      if (key === "ArrowRight" || key === "d" || key === "D") {
        moveHorizontal("right");
      }

      if (key === "Enter" || key.toLowerCase() === "i") {
        call(selectRef.current);
      }

      if (
        key === "p" ||
        key === "P" ||
        key === "MediaPlayPause" ||
        key === "MediaPlay"
      ) {
        call(playRef.current);
      }

      if (key.toLowerCase() === "y") {
        call(toggleRef.current);
      }

      if (key === "Escape" || key === "Backspace" || key === "BrowserBack") {
        callTabNav("escape");
      }
    };

    window.addEventListener("keydown", handle);
    window.addEventListener("blur", resetHoldState);

    return () => {
      window.removeEventListener("keydown", handle);
      window.removeEventListener("blur", resetHoldState);
    };
  }, [call, callTabNav, moveHorizontal, resetHoldState]);

  /* ---------- GAMEPAD HELPERS ---------- */

  const repeat = useCallback((key: string, active: boolean, fn: () => void) => {
    const state = holdRef.current[key];
    const now = performance.now();

    if (!active) {
      state.pressed = false;
      return;
    }

    if (!state.pressed) {
      state.pressed = true;
      state.nextAt = now + INITIAL_REPEAT_DELAY;
      fn();
      return;
    }

    if (now >= (state.nextAt ?? 0)) {
      state.nextAt = now + REPEAT_INTERVAL;
      fn();
    }
  }, []);

  const single = useCallback((key: string, active: boolean, fn: () => void) => {
    const state =
      holdRef.current[key] ?? (holdRef.current[key] = { pressed: false });

    if (active && !state.pressed) {
      state.pressed = true;
      fn();
      return;
    }

    if (!active) {
      state.pressed = false;
    }
  }, []);

  /* ---------- GAMEPAD ---------- */

  const poll = useCallback(() => {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = pads[0] ?? null;

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

    const aPressed = isPressed(pad.buttons?.[0]);
    const bPressed = isPressed(pad.buttons?.[1]);
    const yPressed = isPressed(pad.buttons?.[3]);
    const lbPressed = isPressed(pad.buttons?.[4]);
    const rbPressed = isPressed(pad.buttons?.[5]);
    const backPressed = isPressed(pad.buttons?.[8]);
    const startPressed = isPressed(pad.buttons?.[9]);

    const rtPressed = (pad.buttons?.[7]?.value ?? 0) > 0.75;

    if (!isModal) {
      repeat("left", axX < -STICK_DEADZONE || dpadLeft, () => {
        moveHorizontal("left");
      });

      repeat("right", axX > STICK_DEADZONE || dpadRight, () => {
        moveHorizontal("right");
      });

      repeat("up", axY < -STICK_DEADZONE || dpadUp, () => {
        callTabNav("up");
      });

      repeat("down", axY > STICK_DEADZONE || dpadDown, () => {
        callTabNav("down");
      });

      single("lb", lbPressed, () => {
        cycleTab("prev");
      });

      single("rb", rbPressed, () => {
        cycleTab("next");
      });

      single("select", aPressed || backPressed, () => {
        call(selectRef.current);
      });

      single("toggle", yPressed, () => {
        call(toggleRef.current);
      });
    }

    single("play", startPressed || rtPressed, () => {
      call(playRef.current);
    });

    single("back", bPressed, () => {
      callTabNav("escape");
    });

    rafRef.current = requestAnimationFrame(poll);
  }, [call, callTabNav, cycleTab, moveHorizontal, repeat, single]);

  useEffect(() => {
    const onGamepadDisconnected = () => {
      resetHoldState();
    };

    const onGamepadConnected = () => {
      resetHoldState();
    };

    window.addEventListener("gamepadconnected", onGamepadConnected);
    window.addEventListener("gamepaddisconnected", onGamepadDisconnected);

    rafRef.current = requestAnimationFrame(poll);

    return () => {
      window.removeEventListener("gamepadconnected", onGamepadConnected);
      window.removeEventListener("gamepaddisconnected", onGamepadDisconnected);

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [poll, resetHoldState]);

  /* ---------- CONTEXT ---------- */

  const value = useMemo<NavigationContextType>(
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
    [
      activeTab,
      setActiveTab,
      focus,
      setFocusSafe,
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
  if (!ctx) {
    throw new Error("useNavigation must be used inside provider");
  }
  return ctx;
}
