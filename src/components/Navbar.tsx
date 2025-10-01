"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FaFilm, FaTv, FaSearch, FaStar, FaBookmark } from "react-icons/fa";
import { useTooltip } from "@/context/TooltipContext";
import { DarkModeToggle } from "../DarkModeToggle";
import logo from "/logo.png";

type Tab = "movies" | "tvshows" | "search" | "devspick" | "watchlist";

interface NavbarProps {
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

const Navbar: React.FC<NavbarProps> = ({
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
      {/* Desktop / Tablet Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-20 flex-col items-center justify-between bg-[hsl(var(--background))] border-r border-border z-40">
        {/* Top: Logo */}
        <div className="pt-4">
          <motion.img
            src={logo}
            alt="CineBay"
            className="w-12 h-12 object-contain rounded-full drop-shadow-[0_0_8px_rgba(192,132,252,0.35)] dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Middle: Nav items */}
        <div className="flex flex-col gap-6">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                onMouseEnter={(e) =>
                  showTooltip(item.label, "side", e.currentTarget)
                }
                onMouseLeave={hideTooltip}
                whileHover={{ scale: 1.15 }}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                className={`relative group p-2 rounded-lg transition-colors ${
                  isActive ? "text-[hsl(var(--foreground))]" : "opacity-50"
                }`}
              >
                {item.icon}
                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full 
                      bg-[hsl(var(--foreground))] shadow-[0_0_6px_hsl(var(--foreground)/0.8)]"
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Bottom: Dark mode toggle */}
        <div className="pb-6">
          <DarkModeToggle />
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-[hsl(var(--background))] border-t border-border flex justify-around items-center z-40 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              onTouchStart={(e) => handleTouchStart(item.id, e)}
              onTouchEnd={handleTouchEnd}
              onContextMenu={(e) => e.preventDefault()}
              whileHover={{ scale: 1.15 }}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className={`relative group flex flex-col items-center justify-center transition-colors ${
                isActive ? "text-[hsl(var(--foreground))]" : "opacity-50"
              }`}
            >
              {item.icon}
              {isActive && (
                <motion.div
                  layoutId="active-indicator-mobile"
                  className="absolute -bottom-1.5 w-8 h-1 rounded-full 
                    bg-[hsl(var(--foreground))] shadow-[0_0_6px_hsl(var(--foreground)/0.8)]"
                />
              )}
            </motion.button>
          );
        })}
      </nav>
    </>
  );
};

export default Navbar;
