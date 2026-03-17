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

/* =========================
   CONSTANTS
========================= */

const NavigationContext = createContext<NavigationContextType | null>(null);

const TAB_ORDER: Tab[] = [
  "movies",
  "tvshows",
  "search",
  "devspick",
  "watchlist",
];

const STICK_DEADZONE = 0.45;
const INITIAL_REPEAT_DELAY = 220;
const REPEAT_INTERVAL = 90;

/* =========================
   HELPERS
========================= */

function isPressed(button?: GamepadButton) {
  return !!button?.pressed || (button?.value ?? 0) > 0.5;
}

/* =========================
   PROVIDER
========================= */

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<Tab>("movies");

  const [focus, setFocus] = useState<FocusTarget>({
    section: 0,
    index: 0,
  });

  const setFocusByIndex = useCallback((section: number, index: number) => {
    setFocus({ section, index });
  }, []);

  /* ---------- rails ---------- */

  const [rails, setRails] = useState<number[]>([]);
  const railsRef = useRef<number[]>([]);
  const railCount = useRef(0);

  useEffect(() => {
    railsRef.current = rails;
  }, [rails]);

  const registerRail = useCallback((length: number) => {
    const idx = railCount.current++;
    setRails((p) => {
      const n = [...p];
      n[idx] = length;
      return n;
    });
    return idx;
  }, []);

  const updateRailLength = useCallback((i: number, l: number) => {
    setRails((p) => {
      const n = [...p];
      n[i] = l;
      return n;
    });
  }, []);

  const restoreFocusForTab = useCallback((tab: Tab) => {
    railCount.current = 0;
    setRails([]);
    setActiveTab(tab);
  }, []);

  /* ---------- modal ---------- */

  const [isModalOpen, setModalOpenState] = useState(false);
  const isModalOpenRef = useRef(false);

  const setModalOpen = useCallback((open: boolean) => {
    isModalOpenRef.current = open;
    setModalOpenState(open);
  }, []);

  /* ---------- handlers ---------- */

  const tabNavigatorRef = useRef<((dir: TabDirection) => void) | null>(null);
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

  const moveHorizontal = useCallback((dir: "left" | "right") => {
    setFocus((f) => {
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
  }, []);

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

  /* =========================
     KEYBOARD / REMOTE
  ========================= */

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const key = e.key;

      if (isModalOpenRef.current) {
        if (key === "Escape") tabNavigatorRef.current?.("escape");
        return;
      }

      if (key === "ArrowUp") tabNavigatorRef.current?.("up");
      if (key === "ArrowDown") tabNavigatorRef.current?.("down");
      if (key === "ArrowLeft") moveHorizontal("left");
      if (key === "ArrowRight") moveHorizontal("right");

      if (["Enter", "OK"].includes(key)) {
        selectRef.current?.();
      }

      if (key === "MediaPlayPause" || key === "MediaPlay" || key === "Play") {
        playRef.current?.();
      }

      if (key === "ContextMenu" || key === "F2") {
        toggleRef.current?.();
      }

      if (key === "Escape" || key === "Backspace" || key === "BrowserBack") {
        tabNavigatorRef.current?.("escape");
      }
    };

    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [moveHorizontal]);

  /* =========================
     GAMEPAD
  ========================= */

  const rafRef = useRef<number | null>(null);

  const holdRef = useRef<any>({
    up: { pressed: false, nextAt: 0 },
    down: { pressed: false, nextAt: 0 },
    left: { pressed: false, nextAt: 0 },
    right: { pressed: false, nextAt: 0 },

    a: { pressed: false },
    y: { pressed: false },
    b: { pressed: false },
    start: { pressed: false },
    lb: { pressed: false },
    rb: { pressed: false },
  });

  const repeat = useCallback((key: string, active: boolean, fn: () => void) => {
    const s = holdRef.current[key];
    const now = performance.now();

    if (!active) {
      s.pressed = false;
      return;
    }

    if (!s.pressed) {
      s.pressed = true;
      s.nextAt = now + INITIAL_REPEAT_DELAY;
      fn();
      return;
    }

    if (now >= s.nextAt) {
      s.nextAt = now + REPEAT_INTERVAL;
      fn();
    }
  }, []);

  const single = useCallback((key: string, active: boolean, fn: () => void) => {
    if (!holdRef.current[key]) {
      holdRef.current[key] = { pressed: false };
    }

    const s = holdRef.current[key];

    if (active && !s.pressed) {
      s.pressed = true;
      fn();
    }

    if (!active) s.pressed = false;
  }, []);

  const poll = useCallback(() => {
    const pad = navigator.getGamepads?.()[0];

    if (!pad) {
      rafRef.current = requestAnimationFrame(poll);
      return;
    }

    const axX = pad.axes[0] ?? 0;
    const axY = pad.axes[1] ?? 0;

    const dpadUp = isPressed(pad.buttons[12]);
    const dpadDown = isPressed(pad.buttons[13]);
    const dpadLeft = isPressed(pad.buttons[14]);
    const dpadRight = isPressed(pad.buttons[15]);

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

    single("a", isPressed(pad.buttons[0]), () => selectRef.current?.());

    single("y", isPressed(pad.buttons[3]), () => toggleRef.current?.());

    single("start", isPressed(pad.buttons[9]), () => playRef.current?.());

    single("b", isPressed(pad.buttons[1]), () =>
      tabNavigatorRef.current?.("escape"),
    );

    single("lb", isPressed(pad.buttons[4]), () => cycleTab("prev"));

    single("rb", isPressed(pad.buttons[5]), () => cycleTab("next"));

    rafRef.current = requestAnimationFrame(poll);
  }, [cycleTab, moveHorizontal, repeat, single]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(poll);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [poll]);

  /* =========================
     CONTEXT
  ========================= */

  const value = useMemo(
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
      setToggleHandler,
    }),
    [activeTab, focus, isModalOpen],
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

/* =========================
   HOOK
========================= */

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation must be used inside provider");
  return ctx;
}
