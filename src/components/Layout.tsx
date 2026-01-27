import React, { ReactNode, useEffect, useRef } from "react";
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

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  isModalOpen,
}) => {
  const { resetNavigation } = useNavigation();
  const prevTabRef = useRef<Tab | null>(null);

  /* -------------------------------------------------
     RESET NAVIGATION ON TAB CHANGE
  -------------------------------------------------- */
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      resetNavigation();
      prevTabRef.current = activeTab;
    }
  }, [activeTab, resetNavigation]);

  return (
    <div className="w-full flex flex-col min-h-(--vh) overflow-hidden">
      <Navbar
        activeTab={activeTab}
        onTabChange={onTabChange}
        isModalOpen={isModalOpen}
      />

      {/* Content */}
      <main className="flex-1 min-h-0 overflow-y-auto md:pl-20 md:pr-0 pb-16 md:pb-0">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.25,
              ease: FADE_EASE,
            }}
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
