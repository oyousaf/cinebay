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

interface NavigationContextType {
  focus: FocusTarget;
  setFocus: (f: FocusTarget) => void;
  registerRail: (length: number) => number;
  updateRailLength: (index: number, length: number) => void;
  resetNavigation: () => void;

  isModalOpen: boolean;
  setModalOpen: (open: boolean) => void;

  navigationLocked: boolean;
  setNavigationLocked: (locked: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [rails, setRails] = useState<number[]>([]);
  const [focus, setFocus] = useState<FocusTarget>({ section: 0, index: 0 });
  const [isModalOpen, setModalOpen] = useState(false);
  const [navigationLocked, setNavigationLocked] = useState(false);

  const railCount = useRef(0);

  /* ---------- Rail registration ---------- */
  const registerRail = useCallback((length: number) => {
    const index = railCount.current;
    railCount.current += 1;
    setRails((prev) => {
      const next = [...prev];
      next[index] = length;
      return next;
    });
    return index;
  }, []);

  const updateRailLength = useCallback((index: number, length: number) => {
    setRails((prev) => {
      const next = [...prev];
      next[index] = length;
      return next;
    });
  }, []);

  const resetNavigation = useCallback(() => {
    railCount.current = 0;
    setRails([]);
    setFocus({ section: 0, index: 0 });
  }, []);

  /* ---------- Key handler ---------- */
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (isModalOpen) return;

      const key = e.key;

      const isWASD =
        key === "w" ||
        key === "W" ||
        key === "a" ||
        key === "A" ||
        key === "s" ||
        key === "S" ||
        key === "d" ||
        key === "D";

      if (navigationLocked && isWASD) return;

      setFocus((prev) => {
        let next = { ...prev };
        const maxIndex = rails[prev.section] ? rails[prev.section] - 1 : 0;

        if (key === "ArrowRight" || key === "d" || key === "D") {
          next.index = Math.min(prev.index + 1, maxIndex);
        }
        if (key === "ArrowLeft" || key === "a" || key === "A") {
          next.index = Math.max(prev.index - 1, 0);
        }
        if (key === "ArrowDown" || key === "s" || key === "S") {
          if (prev.section < rails.length - 1) {
            next.section = prev.section + 1;
            next.index = Math.min(prev.index, rails[next.section] - 1);
          }
        }
        if (key === "ArrowUp" || key === "w" || key === "W") {
          if (prev.section > 0) {
            next.section = prev.section - 1;
            next.index = Math.min(prev.index, rails[next.section] - 1);
          }
        }

        return next;
      });
    },
    [rails, isModalOpen, navigationLocked]
  );

  /* ---------- Lifecycle ---------- */
  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

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
        navigationLocked,
        setNavigationLocked,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextType {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("useNavigation must be used inside NavigationProvider");
  }
  return ctx;
}
