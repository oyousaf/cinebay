import React, { ReactNode, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "./Navbar";
import { useNavigation } from "@/hooks/useNavigation";

type Tab = "movies" | "tvshows" | "search" | "devspick" | "watchlist";

interface LayoutProps {
  children: ReactNode;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isModalOpen?: boolean;
}

const FADE_EASE = [0.22, 1, 0.36, 1] as const;
const LOAD_DURATION = 350;

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  isModalOpen,
}) => {
  const { resetNavigation } = useNavigation();

  /* ---------------------------------------
     STATE
  --------------------------------------- */
  const [isLoadingTab, setIsLoadingTab] = useState(false);

  /* ---------------------------------------
     REFS
  --------------------------------------- */
  const hasMountedRef = useRef(false);
  const prevTabRef = useRef<Tab | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------------------------------------
     SHELL LOADING LOGIC
  --------------------------------------- */
  useEffect(() => {
    let shouldShow = false;

    // First mount (app open OR returning from player route)
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      shouldShow = true;
    }
    // Tab change
    else if (prevTabRef.current !== activeTab) {
      shouldShow = true;
      resetNavigation();
    }

    prevTabRef.current = activeTab;

    if (!shouldShow) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setIsLoadingTab(true);

    timerRef.current = setTimeout(() => {
      setIsLoadingTab(false);
      timerRef.current = null;
    }, LOAD_DURATION);
  }, [activeTab, resetNavigation]);

  /* ---------------------------------------
     UI
  --------------------------------------- */
  return (
    <div className="w-full flex flex-col min-h-(--vh) overflow-hidden">
      {/* Progress indicator */}
      <AnimatePresence>
        {isLoadingTab && (
          <motion.div
            className="fixed top-0 left-0 h-0.5 w-full bg-[hsl(var(--foreground))] z-50"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: LOAD_DURATION / 1000,
              ease: "easeOut",
            }}
            style={{ transformOrigin: "left" }}
          />
        )}
      </AnimatePresence>

      <Navbar
        activeTab={activeTab}
        onTabChange={onTabChange}
        isModalOpen={isModalOpen}
      />

      <main className="flex-1 min-h-0 overflow-y-auto md:pl-20 pb-16 md:pb-0">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: FADE_EASE }}
            className="min-h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Layout;
