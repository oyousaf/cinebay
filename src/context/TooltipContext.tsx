"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";

type Position = "side" | "top";

interface TooltipState {
  text: string | null;
  x: number;
  y: number;
  position: Position;
}

const TooltipContext = createContext<{
  showTooltip: (text: string, position: Position, target: HTMLElement) => void;
  hideTooltip: () => void;
} | null>(null);

export const TooltipProvider = ({ children }: { children: ReactNode }) => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const showTooltip = useCallback(
    (text: string, position: Position, target: HTMLElement) => {
      const rect = target.getBoundingClientRect();
      let x = rect.right;
      let y = rect.top + rect.height / 2;

      if (position === "top") {
        x = rect.left + rect.width / 2;
        y = rect.top - 6;
      }

      setTooltip({ text, x, y, position });
    },
    []
  );

  const hideTooltip = useCallback(() => setTooltip(null), []);

  return (
    <TooltipContext.Provider value={{ showTooltip, hideTooltip }}>
      {children}
      {tooltip &&
        createPortal(
          <div
            className="fixed z-[9999] px-2 py-1 text-xs rounded shadow-lg
                       bg-[hsl(var(--foreground))] text-[hsl(var(--background))] pointer-events-none"
            style={{
              top: tooltip.y,
              left: tooltip.x,
              transform:
                tooltip.position === "top"
                  ? "translate(-50%, -100%)"
                  : "translateY(-50%)",
            }}
          >
            {tooltip.text}
          </div>,
          document.body
        )}
    </TooltipContext.Provider>
  );
};

export const useTooltip = () => {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error("useTooltip must be used within TooltipProvider");
  return ctx;
};
