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

function isPressed(button?: GamepadButton) {
  return !!button?.pressed || (button?.value ?? 0) > 0.5;
}

function nowMs() {
  return performance.now();
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<Tab>("movies");

  const [focus, setFocus] = useState<FocusTarget>({
    section: 0,
    index: 0,
  });

  const setFocusByIndex = useCallback((section: number, index: number) => {
    setFocus({ section, index });
  }, []);

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

  const [isModalOpen, setModalOpenState] = useState(false);
  const isModalOpenRef = useRef(false);

  const setModalOpen = useCallback((open: boolean) => {
    isModalOpenRef.current = open;
    setModalOpenState(open);
  }, []);

  const tabNavigatorRef = useRef<((dir: TabDirection) => void) | null>(null);
  const selectRef = useRef<(() => void) | null>(null);
  const playRef = useRef<(() => void) | null>(null);

  const setTabNavigator = useCallback((fn: any) => {
    tabNavigatorRef.current = fn;
  }, []);

  const setSelectHandler = useCallback((fn: any) => {
    selectRef.current = fn;
  }, []);

  const setPlayHandler = useCallback((fn: any) => {
    playRef.current = fn;
  }, []);

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
      if (isModalOpenRef.current) {
        if (e.key === "Escape") tabNavigatorRef.current?.("escape");
        return;
      }

      // arrows / WASD / remote
      if (["ArrowUp", "w"].includes(e.key)) {
        tabNavigatorRef.current?.("up");
      }
      if (["ArrowDown", "s"].includes(e.key)) {
        tabNavigatorRef.current?.("down");
      }
      if (["ArrowLeft", "a"].includes(e.key)) moveHorizontal("left");
      if (["ArrowRight", "d"].includes(e.key)) moveHorizontal("right");

      // select (A / OK)
      if (["Enter"].includes(e.key)) selectRef.current?.();

      // play (start)
      if (["p"].includes(e.key)) playRef.current?.();

      // escape / back
      if (["Escape", "Backspace"].includes(e.key)) {
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
  });

  const repeat = useCallback((key: string, active: boolean, fn: () => void) => {
    const s = holdRef.current[key];
    const t = nowMs();

    if (!active) {
      s.pressed = false;
      return;
    }

    if (!s.pressed) {
      s.pressed = true;
      s.nextAt = t + INITIAL_REPEAT_DELAY;
      fn();
      return;
    }

    if (t >= s.nextAt) {
      s.nextAt = t + REPEAT_INTERVAL;
      fn();
    }
  }, []);

  const single = useCallback((key: string, active: boolean, fn: () => void) => {
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

    const left = axX <= -STICK_DEADZONE || isPressed(pad.buttons[14]);
    const right = axX >= STICK_DEADZONE || isPressed(pad.buttons[15]);
    const up = axY <= -STICK_DEADZONE || isPressed(pad.buttons[12]);
    const down = axY >= STICK_DEADZONE || isPressed(pad.buttons[13]);

    repeat("up", up, () => tabNavigatorRef.current?.("up"));
    repeat("down", down, () => tabNavigatorRef.current?.("down"));
    repeat("left", left, () => moveHorizontal("left"));
    repeat("right", right, () => moveHorizontal("right"));

    // A → open info
    single("a", isPressed(pad.buttons[0]), () => {
      selectRef.current?.();
    });

    // START → play
    single("start", isPressed(pad.buttons[9]), () => {
      playRef.current?.();
    });

    // B → close modal
    single("b", isPressed(pad.buttons[1]), () => {
      tabNavigatorRef.current?.("escape");
    });

    // LB / RB → tabs
    single("lb", isPressed(pad.buttons[4]), () => cycleTab("prev"));
    single("rb", isPressed(pad.buttons[5]), () => cycleTab("next"));

    rafRef.current = requestAnimationFrame(poll);
  }, [cycleTab, moveHorizontal, repeat, single]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(poll);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [poll]);

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
      triggerSelect: () => selectRef.current?.(),
      triggerPlay: () => playRef.current?.(),
    }),
    [
      activeTab,
      focus,
      isModalOpen,
      setModalOpen,
      registerRail,
      updateRailLength,
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
