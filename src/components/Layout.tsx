("use client");

import React, { ReactNode, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "./Navbar";
import { useNavigation } from "@/context/NavigationContext";

interface LayoutProps {
  children: ReactNode;
  isModalOpen?: boolean;
}

const FADE_EASE = [0.22, 1, 0.36, 1] as const;

const Layout: React.FC<LayoutProps> = ({ children, isModalOpen = false }) => {
  const { activeTab } = useNavigation();

  /* ---------------------------------------
     STATE
  --------------------------------------- */
  const [isLoading, setIsLoading] = useState(false);

  /* ---------------------------------------
     REFS
  --------------------------------------- */
  const previousTabRef = useRef(activeTab);
  const isFirstRenderRef = useRef(true);

  /* ---------------------------------------
     TAB TRANSITION LOADER
  --------------------------------------- */
  useEffect(() => {
    // Skip first render
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    // Only trigger on actual tab change
    if (previousTabRef.current !== activeTab) {
      setIsLoading(true);
      previousTabRef.current = activeTab;
    }
  }, [activeTab]);

  /* ---------------------------------------
     BODY SCROLL LOCK
     Better iOS handling
  --------------------------------------- */
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;

    if (isModalOpen) {
      body.style.overflow = "hidden";
      body.style.touchAction = "none";

      // iOS Safari fix
      html.style.overflow = "hidden";
    } else {
      body.style.overflow = "";
      body.style.touchAction = "";

      html.style.overflow = "";
    }

    return () => {
      body.style.overflow = "";
      body.style.touchAction = "";

      html.style.overflow = "";
    };
  }, [isModalOpen]);

  /* ---------------------------------------
     UI
  --------------------------------------- */
  return (
    <div className="w-full min-h-screen flex flex-col bg-background">
      {/* Top Loader */}
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            className="fixed top-0 left-0 right-0 h-[2px] z-[9999] overflow-hidden pointer-events-none"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
              transition: { duration: 0.15 },
            }}
          >
            <motion.div
              className="
                h-full
                w-full
                bg-gradient-to-r
                from-transparent
                via-[hsl(var(--foreground))]
                to-transparent
              "
              initial={{
                scaleX: 0,
                x: "-35%",
              }}
              animate={{
                scaleX: 1,
                x: "35%",
              }}
              transition={{
                duration: 0.45,
                ease: "easeOut",
              }}
              style={{
                transformOrigin: "left",
                willChange: "transform",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <Navbar activeTab={activeTab} isModalOpen={isModalOpen} />

      {/* Content */}
      <main
        className="
          flex-1
          min-h-0
          overflow-auto
          overscroll-contain
          md:pl-20
          [-webkit-overflow-scrolling:touch]
        "
      >
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={activeTab}
            className="min-h-full will-change-transform"
            initial={{
              opacity: 0,
              y: 4,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -4,
            }}
            transition={{
              duration: 0.22,
              ease: FADE_EASE,
            }}
            onAnimationComplete={() => {
              setIsLoading(false);
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
