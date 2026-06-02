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
   CONSTANTS
========================= */

const TAB_ORDER = [
  "movies",
  "tvshows",
  "search",
  "devspick",
  "watchlist",
] as const;

const NAV_STORAGE_KEY = "nav_state_v2";

const STICK_DEADZONE = 0.45;
const INITIAL_REPEAT_DELAY = 220;
const REPEAT_INTERVAL = 90;

/* =========================
   TYPES
========================= */

export type Tab = (typeof TAB_ORDER)[number];

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

type HoldState = {
  pressed: boolean;
  nextAt?: number;
};

type HoldMap = Record<string, HoldState>;

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

/* =========================
   CONTEXT
========================= */

const NavigationContext = createContext<NavigationContextType | null>(null);

/* =========================
   HELPERS
========================= */

const isPressed = (button?: GamepadButton) =>
  !!button?.pressed || (button?.value ?? 0) > 0.5;

const DEFAULT_FOCUS: FocusTarget = Object.freeze({
  section: 0,
  index: 0,
  itemId: null,
});

const createFocus = (): FocusTarget => ({
  ...DEFAULT_FOCUS,
});

const createDefaultFocusMemory = (): Record<Tab, FocusTarget> => ({
  movies: createFocus(),
  tvshows: createFocus(),
  search: createFocus(),
  devspick: createFocus(),
  watchlist: createFocus(),
});

const createDefaultNavState = (): PersistedNavigationState => ({
  activeTab: "movies",
  focusMemory: createDefaultFocusMemory(),
});

const isValidTab = (value: unknown): value is Tab =>
  typeof value === "string" && TAB_ORDER.includes(value as Tab);

const normaliseFocus = (value?: Partial<FocusTarget> | null): FocusTarget => ({
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
  if (typeof window === "undefined") {
    return createDefaultNavState();
  }

  try {
    const raw = localStorage.getItem(NAV_STORAGE_KEY);

    if (!raw) {
      return createDefaultNavState();
    }

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

/* =========================
   PROVIDER
========================= */

export function NavigationProvider({ children }: { children: ReactNode }) {
  const initialNavRef = useRef(readPersistedNavState());

  const [activeTab, setActiveTabState] = useState<Tab>(
    initialNavRef.current.activeTab,
  );

  const [focus, setFocusState] = useState<FocusTarget>(
    initialNavRef.current.focusMemory[initialNavRef.current.activeTab] ??
      createFocus(),
  );

  const [isModalOpen, setModalOpenState] = useState(false);

  /* ---------- REFS ---------- */

  const activeTabRef = useRef(activeTab);
  const focusRef = useRef(focus);
  const isModalOpenRef = useRef(false);

  const focusMemoryRef = useRef<Record<Tab, FocusTarget>>(
    initialNavRef.current.focusMemory,
  );

  const railsRef = useRef<number[]>([]);
  const railCountRef = useRef(0);

  const persistTimeoutRef = useRef<number | null>(null);

  const tabNavigatorRef = useRef<((dir: TabDirection) => void) | null>(null);

  const selectRef = useRef<(() => void) | null>(null);
  const playRef = useRef<(() => void) | null>(null);
  const toggleRef = useRef<(() => void) | null>(null);

  const animationFrameRef = useRef<number | null>(null);

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

  /* =========================
     REF SYNC
  ========================= */

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    focusRef.current = focus;
  }, [focus]);

  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  /* =========================
     PERSISTENCE
  ========================= */

  const persistState = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (persistTimeoutRef.current !== null) {
      return;
    }

    persistTimeoutRef.current = window.setTimeout(() => {
      persistTimeoutRef.current = null;

      const payload: PersistedNavigationState = {
        activeTab: activeTabRef.current,
        focusMemory: focusMemoryRef.current,
      };

      localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(payload));
    }, 400);
  }, []);

  useEffect(() => {
    return () => {
      if (persistTimeoutRef.current !== null) {
        clearTimeout(persistTimeoutRef.current);
      }
    };
  }, []);

  /* =========================
     UTILITIES
  ========================= */

  const call = useCallback((fn?: (() => void) | null) => {
    try {
      fn?.();
    } catch (err) {
      console.error(err);
    }
  }, []);

  const callTabNav = useCallback((dir: TabDirection) => {
    try {
      tabNavigatorRef.current?.(dir);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const resetHoldState = useCallback(() => {
    for (const state of Object.values(holdRef.current)) {
      state.pressed = false;
      state.nextAt = 0;
    }
  }, []);

  /* =========================
     FOCUS
  ========================= */

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

  /* =========================
     TABS
  ========================= */

  const setActiveTab = useCallback(
    (tab: Tab) => {
      if (tab === activeTabRef.current) {
        return;
      }

      const currentTab = activeTabRef.current;

      focusMemoryRef.current[currentTab] = normaliseFocus(focusRef.current);

      activeTabRef.current = tab;

      setActiveTabState(tab);

      const nextFocus = normaliseFocus(
        focusMemoryRef.current[tab] ?? createFocus(),
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

  /* =========================
     RAILS
  ========================= */

  const registerRail = useCallback((length: number) => {
    const index = railCountRef.current++;

    railsRef.current[index] = length;

    return index;
  }, []);

  const updateRailLength = useCallback((index: number, length: number) => {
    railsRef.current[index] = length;
  }, []);

  /* =========================
     MODAL
  ========================= */

  const setModalOpen = useCallback(
    (open: boolean) => {
      isModalOpenRef.current = open;

      setModalOpenState(open);

      resetHoldState();
    },
    [resetHoldState],
  );

  /* =========================
     HANDLERS
  ========================= */

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

  /* =========================
     MOVEMENT
  ========================= */

  const moveHorizontal = useCallback(
    (dir: "left" | "right") => {
      setFocusSafe((prev) => {
        const railLength = railsRef.current[prev.section] ?? 1;

        const maxIndex = Math.max(railLength - 1, 0);

        const nextIndex =
          dir === "right"
            ? Math.min(prev.index + 1, maxIndex)
            : Math.max(prev.index - 1, 0);

        if (nextIndex === prev.index) {
          return prev;
        }

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

      if (currentIndex === -1) {
        return;
      }

      const nextIndex =
        dir === "next"
          ? (currentIndex + 1) % TAB_ORDER.length
          : (currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;

      restoreFocusForTab(TAB_ORDER[nextIndex]);
    },
    [restoreFocusForTab],
  );

  /* =========================
     KEYBOARD
  ========================= */

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
        if (key === "Escape") {
          callTabNav("escape");
        }

        return;
      }

      switch (key) {
        case "ArrowUp":
        case "w":
        case "W":
          callTabNav("up");
          break;

        case "ArrowDown":
        case "s":
        case "S":
          callTabNav("down");
          break;

        case "ArrowLeft":
        case "a":
        case "A":
          moveHorizontal("left");
          break;

        case "ArrowRight":
        case "d":
        case "D":
          moveHorizontal("right");
          break;

        case "Enter":
          call(selectRef.current);
          break;

        case "Escape":
        case "Backspace":
        case "BrowserBack":
          callTabNav("escape");
          break;

        default: {
          const lower = key.toLowerCase();

          if (lower === "i") {
            call(selectRef.current);
          }

          if (lower === "y") {
            call(toggleRef.current);
          }

          if (
            lower === "p" ||
            key === "MediaPlayPause" ||
            key === "MediaPlay"
          ) {
            call(playRef.current);
          }
        }
      }
    };

    window.addEventListener("keydown", handle);
    window.addEventListener("blur", resetHoldState);

    return () => {
      window.removeEventListener("keydown", handle);
      window.removeEventListener("blur", resetHoldState);
    };
  }, [call, callTabNav, moveHorizontal, resetHoldState]);

  /* =========================
     GAMEPAD HELPERS
  ========================= */

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
      holdRef.current[key] ??
      (holdRef.current[key] = {
        pressed: false,
      });

    if (active && !state.pressed) {
      state.pressed = true;

      fn();

      return;
    }

    if (!active) {
      state.pressed = false;
    }
  }, []);

  /* =========================
     GAMEPAD POLL
  ========================= */

  const poll = useCallback(() => {
    const pad = navigator.getGamepads?.()?.[0] ?? null;

    if (!pad) {
      return;
    }

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

    const noInput =
      Math.abs(axX) < STICK_DEADZONE &&
      Math.abs(axY) < STICK_DEADZONE &&
      !dpadUp &&
      !dpadDown &&
      !dpadLeft &&
      !dpadRight &&
      !aPressed &&
      !bPressed &&
      !yPressed &&
      !lbPressed &&
      !rbPressed &&
      !backPressed &&
      !startPressed &&
      !rtPressed;

    if (noInput) {
      resetHoldState();
      return;
    }

    if (!isModalOpenRef.current) {
      repeat("left", axX < -STICK_DEADZONE || dpadLeft, () =>
        moveHorizontal("left"),
      );

      repeat("right", axX > STICK_DEADZONE || dpadRight, () =>
        moveHorizontal("right"),
      );

      repeat("up", axY < -STICK_DEADZONE || dpadUp, () => callTabNav("up"));

      repeat("down", axY > STICK_DEADZONE || dpadDown, () =>
        callTabNav("down"),
      );

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
  }, [
    call,
    callTabNav,
    cycleTab,
    moveHorizontal,
    repeat,
    resetHoldState,
    single,
  ]);

  /* =========================
     RAF LOOP
  ========================= */

  useEffect(() => {
    const loop = () => {
      poll();

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    const onConnect = () => {
      resetHoldState();
    };

    const onDisconnect = () => {
      resetHoldState();
    };

    window.addEventListener("gamepadconnected", onConnect);

    window.addEventListener("gamepaddisconnected", onDisconnect);

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("gamepadconnected", onConnect);

      window.removeEventListener("gamepaddisconnected", onDisconnect);

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [poll, resetHoldState]);

  /* =========================
     CONTEXT VALUE
  ========================= */

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
