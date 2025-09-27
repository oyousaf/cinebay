"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, Variants, TargetAndTransition } from "framer-motion";
import { FaFilm, FaTv, FaSearch, FaStar, FaBookmark } from "react-icons/fa";

type Tab = "movies" | "tvshows" | "search" | "devspick" | "watchlist";

interface HybridNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isModalOpen?: boolean;
}

const navItems: { id: Tab; icon: React.ReactElement; label: string }[] = [
  { id: "movies", icon: <FaFilm size={22} />, label: "Movies" },
  { id: "tvshows", icon: <FaTv size={22} />, label: "TV Shows" },
  { id: "search", icon: <FaSearch size={22} />, label: "Search" },
  { id: "devspick", icon: <FaStar size={22} />, label: "Dev’s Pick" },
  { id: "watchlist", icon: <FaBookmark size={22} />, label: "Watchlist" },
];

/* Icon load-in */
const iconVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.8 },
  visible: (i: number): TargetAndTransition => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.08,
      type: "spring",
      stiffness: 400,
      damping: 22,
    },
  }),
};

const HybridNav: React.FC<HybridNavProps> = ({
  activeTab,
  onTabChange,
  isModalOpen,
}) => {
  const [pressedLabel, setPressedLabel] = useState<Tab | null>(null);
  const pressTimeout = useRef<NodeJS.Timeout | null>(null);
  const startY = useRef<number | null>(null);

  /* Keyboard nav */
  useEffect(() => {
    if (isModalOpen) return;
    const handleKeys = (e: KeyboardEvent) => {
      if (activeTab === "search" && e.key === "Escape") {
        onTabChange("movies");
        return;
      }
      const currentIndex = navItems.findIndex((n) => n.id === activeTab);
      if (["ArrowUp", "w", "W"].includes(e.key)) {
        const prev = (currentIndex - 1 + navItems.length) % navItems.length;
        onTabChange(navItems[prev].id);
      }
      if (["ArrowDown", "s", "S"].includes(e.key)) {
        const next = (currentIndex + 1) % navItems.length;
        onTabChange(navItems[next].id);
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [activeTab, onTabChange, isModalOpen]);

  /* Swipe nav */
  useEffect(() => {
    if (isModalOpen) return;
    const handleTouchStart = (e: TouchEvent) => {
      startY.current = e.touches[0].clientY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (startY.current === null) return;
      const endY = e.changedTouches[0].clientY;
      const diffY = startY.current - endY;
      if (Math.abs(diffY) > 50) {
        const currentIndex = navItems.findIndex((n) => n.id === activeTab);
        if (diffY > 0) {
          const next = (currentIndex + 1) % navItems.length;
          onTabChange(navItems[next].id);
        } else {
          const prev = (currentIndex - 1 + navItems.length) % navItems.length;
          onTabChange(navItems[prev].id);
        }
      }
      startY.current = null;
    };
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [activeTab, onTabChange, isModalOpen]);

  /* Long-press labels */
  const handleTouchStart = (id: Tab) => {
    pressTimeout.current = setTimeout(() => setPressedLabel(id), 400);
  };
  const handleTouchEnd = () => {
    if (pressTimeout.current) clearTimeout(pressTimeout.current);
    setTimeout(() => setPressedLabel(null), 150);
  };

  return (
    <>
      {/* Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-16 flex-col items-center justify-center gap-6 bg-[hsl(var(--background))] border-r border-border z-40">
        {navItems.map((item, i) => {
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              variants={iconVariants}
              initial="hidden"
              animate="visible"
              custom={i}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className={`relative group p-2 rounded-lg transition-colors ${
                isActive
                  ? "text-[hsl(var(--foreground))] opacity-100"
                  : "text-muted-foreground opacity-40 hover:opacity-80"
              }`}
            >
              {item.icon}

              {/* Active indicator with glow */}
              <motion.div
                layoutId="active-indicator"
                animate={{
                  opacity: isActive ? 1 : 0,
                  scaleY: isActive ? 1 : 0.4,
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-[hsl(var(--foreground))] shadow-[0_0_6px_hsl(var(--foreground)/0.8)]"
              />

              {/* Tooltip */}
              <span
                className={`absolute left-10 px-2 py-1 text-xs bg-[hsl(var(--foreground))] text-[hsl(var(--background))] rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity ${
                  pressedLabel === item.id ? "opacity-100" : ""
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </aside>

      {/* Bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-[hsl(var(--background))] border-t border-border flex justify-around items-center z-40">
        {navItems.map((item, i) => {
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              onTouchStart={() => handleTouchStart(item.id)}
              onTouchEnd={handleTouchEnd}
              onContextMenu={(e) => e.preventDefault()}
              variants={iconVariants}
              initial="hidden"
              animate="visible"
              custom={i}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className={`relative group flex flex-col items-center justify-center ${
                isActive
                  ? "text-[hsl(var(--foreground))] opacity-100"
                  : "text-muted-foreground opacity-40 hover:opacity-80"
              }`}
            >
              {item.icon}

              {/* Active indicator with glow */}
              <motion.div
                layoutId="active-indicator-mobile"
                animate={{
                  opacity: isActive ? 1 : 0,
                  scaleX: isActive ? 1 : 0.4,
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute -bottom-1.5 w-8 h-1 rounded-full bg-[hsl(var(--foreground))] shadow-[0_0_6px_hsl(var(--foreground)/0.8)]"
              />

              {/* Tooltip */}
              <span
                className={`absolute bottom-10 px-2 py-1 text-xs bg-[hsl(var(--foreground))] text-black rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity ${
                  pressedLabel === item.id ? "opacity-100" : ""
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </nav>
    </>
  );
};

export default HybridNav;
