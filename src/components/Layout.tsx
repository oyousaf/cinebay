"use client";

import React, {
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

import { motion, AnimatePresence } from "framer-motion";

import Navbar from "./Navbar";

import { useNavigation } from "@/context/NavigationContext";
import type { Tab } from "@/context/NavigationContext";

interface LayoutProps {
  children: ReactNode;
  isModalOpen?: boolean;
}

const FADE_EASE = [0.22, 1, 0.36, 1] as const;
const LOAD_DURATION = 500;

const Layout = ({ children, isModalOpen }: LayoutProps) => {
  const { activeTab, restoreFocusForTab } = useNavigation();

  const [isLoadingTab, setIsLoadingTab] = useState(false);

  const hasMountedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLoaderTimer = useCallback(() => {
    if (!timerRef.current) return;

    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const startLoader = useCallback(() => {
    clearLoaderTimer();

    setIsLoadingTab(true);

    timerRef.current = setTimeout(() => {
      setIsLoadingTab(false);
      timerRef.current = null;
    }, LOAD_DURATION);
  }, [clearLoaderTimer]);

  const handleTabChange = useCallback(
    (tab: Tab) => {
      if (tab === activeTab) return;

      restoreFocusForTab(tab);
      startLoader();
    },
    [activeTab, restoreFocusForTab, startLoader],
  );

  useEffect(() => {
    if (hasMountedRef.current) return;

    hasMountedRef.current = true;
    startLoader();

    return clearLoaderTimer;
  }, [startLoader, clearLoaderTimer]);

  useEffect(() => {
    document.body.style.overflow = isModalOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <AnimatePresence>
        {isLoadingTab && (
          <motion.div
            className="fixed top-0 left-0 z-50 h-0.5 w-full overflow-hidden"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <motion.div
              className="h-full w-full bg-linear-to-r from-transparent via-[hsl(var(--foreground))]
              to-transparent shadow-[0_0_6px_hsl(var(--foreground)/0.6)]"
              initial={{ scaleX: 0, x: "-30%" }}
              animate={{ scaleX: 1, x: "30%" }}
              transition={{
                duration: LOAD_DURATION / 1000,
                ease: "easeOut",
              }}
              style={{ transformOrigin: "left" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Navbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isModalOpen={isModalOpen}
      />

      <main className="min-h-0 flex-1 overflow-y-auto md:pl-20">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={activeTab}
            className="min-h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.25,
              ease: FADE_EASE,
            }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Layout;
