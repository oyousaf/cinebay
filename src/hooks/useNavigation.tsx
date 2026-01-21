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

type FocusTarget = { section: number; index: number };
type TabDirection = "up" | "down" | "escape";

interface NavigationContextType {
  focus: FocusTarget;
  setFocus: (f: FocusTarget) => void;

  registerRail: (length: number) => number;
  updateRailLength: (index: number, length: number) => void;
  resetNavigation: () => void;

  isModalOpen: boolean;
  setModalOpen: (open: boolean) => void;

  setTabNavigator: (fn: (dir: TabDirection) => void) => void;

  /** Action dispatch */
  triggerSelect?: () => void;
  triggerPlay?: () => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [rails, setRails] = useState<number[]>([]);
  const [focus, setFocus] = useState<FocusTarget>({ section: 0, index: 0 });
  const [isModalOpen, setModalOpen] = useState(false);

  const railCount = useRef(0);
  const tabNavigatorRef = useRef<((dir: TabDirection) => void) | null>(null);

  const selectRef = useRef<(() => void) | null>(null);
  const playRef = useRef<(() => void) | null>(null);

  /* ---------- Registration ---------- */
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

  const resetNavigation = useCallback(() => {
    railCount.current = 0;
    setRails([]);
    setFocus({ section: 0, index: 0 });
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
        setFocus((f) => ({ ...f, index: Math.max(0, f.index - 1) }));
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [rails, isModalOpen]);

  /* -------------------------------------------------
     GAMEPAD
  -------------------------------------------------- */
  useEffect(() => {
    let raf: number;
    let a = false;
    let b = false;

    const loop = () => {
      const gp = navigator.getGamepads?.()[0];
      if (gp && !isModalOpen) {
        if (gp.buttons[0]?.pressed && !a) {
          a = true;
          playRef.current?.();
        }
        if (!gp.buttons[0]?.pressed) a = false;

        if (gp.buttons[1]?.pressed && !b) {
          b = true;
          selectRef.current?.();
        }
        if (!gp.buttons[1]?.pressed) b = false;
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isModalOpen]);

  return (
    <NavigationContext.Provider
      value={{
        focus,
        setFocus,
        registerRail,
        updateRailLength,
        resetNavigation,
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
