"use client";

import React, { useEffect, useRef } from "react";
import { motion, Variants } from "framer-motion";
import { FaFilm, FaTv, FaSearch, FaStar, FaBookmark } from "react-icons/fa";
import { useTooltip } from "@/context/TooltipContext";

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

/* Parent container entrance */
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

/* Icon animation states */
const iconVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.8 },
  inactive: { opacity: 0.5, scale: 1 },
  hover: { opacity: 0.8, scale: 1.15 },
  active: { opacity: 1, scale: 1.2 },
};

const HybridNav: React.FC<HybridNavProps> = ({
  activeTab,
  onTabChange,
  isModalOpen,
}) => {
  const { showTooltip, hideTooltip } = useTooltip();
  const pressTimeout = useRef<NodeJS.Timeout | null>(null);

  /* Keyboard navigation */
  useEffect(() => {
    if (isModalOpen) return;
    const handleKeys = (e: KeyboardEvent) => {
      const currentIndex = navItems.findIndex((n) => n.id === activeTab);
      if (activeTab === "search" && e.key === "Escape") {
        onTabChange("movies");
      } else if (["ArrowUp", "w", "W"].includes(e.key)) {
        onTabChange(
          navItems[(currentIndex - 1 + navItems.length) % navItems.length].id
        );
      } else if (["ArrowDown", "s", "S"].includes(e.key)) {
        onTabChange(navItems[(currentIndex + 1) % navItems.length].id);
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [activeTab, onTabChange, isModalOpen]);

  /* Long-press detection (mobile tooltips) */
  const handleTouchStart = (
    id: Tab,
    e: React.TouchEvent<HTMLButtonElement>
  ) => {
    const target = e.currentTarget;
    pressTimeout.current = setTimeout(() => {
      showTooltip(navItems.find((n) => n.id === id)!.label, "top", target);
    }, 400);
  };
  const handleTouchEnd = () => {
    if (pressTimeout.current) clearTimeout(pressTimeout.current);
    hideTooltip();
  };

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        className="hidden md:flex fixed left-0 top-0 h-screen w-16 flex-col items-center justify-center gap-6 bg-[hsl(var(--background))] border-r border-border z-40"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {navItems.map((item, i) => {
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              onMouseEnter={(e) =>
                showTooltip(item.label, "side", e.currentTarget)
              }
              onMouseLeave={hideTooltip}
              variants={iconVariants}
              animate={isActive ? "active" : "inactive"}
              whileHover="hover"
              custom={i}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className="relative group p-2 rounded-lg"
            >
              {item.icon}
              {/* Active indicator */}
              <motion.div
                layoutId="active-indicator"
                animate={{
                  opacity: isActive ? 1 : 0,
                  scaleY: isActive ? 1 : 0.4,
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full 
                  bg-[hsl(var(--foreground))] shadow-[0_0_6px_hsl(var(--foreground)/0.8)]"
              />
            </motion.button>
          );
        })}
      </motion.aside>

      {/* Mobile bottom nav */}
      <motion.nav
        className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-[hsl(var(--background))] border-t border-border flex justify-around items-center z-40"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {navItems.map((item, i) => {
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              onTouchStart={(e) => handleTouchStart(item.id, e)}
              onTouchEnd={handleTouchEnd}
              onContextMenu={(e) => e.preventDefault()}
              variants={iconVariants}
              animate={isActive ? "active" : "inactive"}
              whileHover="hover"
              custom={i}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className="relative group flex flex-col items-center justify-center"
            >
              {item.icon}
              {/* Active indicator */}
              <motion.div
                layoutId="active-indicator-mobile"
                animate={{
                  opacity: isActive ? 1 : 0,
                  scaleX: isActive ? 1 : 0.4,
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute -bottom-1.5 w-8 h-1 rounded-full 
                  bg-[hsl(var(--foreground))] shadow-[0_0_6px_hsl(var(--foreground)/0.8)]"
              />
            </motion.button>
          );
        })}
      </motion.nav>
    </>
  );
};

export default HybridNav;
