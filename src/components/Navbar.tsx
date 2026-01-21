"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FaFilm, FaTv, FaSearch, FaStar, FaBookmark } from "react-icons/fa";

import { DarkModeToggle } from "../DarkModeToggle";
import { useTooltip } from "@/context/TooltipContext";
import { useNavigation } from "@/hooks/useNavigation";

import logo from "/logo.png";

type Tab = "movies" | "tvshows" | "search" | "devspick" | "watchlist";

interface NavbarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isModalOpen?: boolean;
}

const navItems: {
  id: Tab;
  icon: React.ReactElement;
  label: string;
}[] = [
  { id: "movies", icon: <FaFilm size={30} />, label: "Movies" },
  { id: "tvshows", icon: <FaTv size={30} />, label: "TV Shows" },
  { id: "search", icon: <FaSearch size={30} />, label: "Search" },
  { id: "devspick", icon: <FaStar size={30} />, label: "Dev’s Pick" },
  { id: "watchlist", icon: <FaBookmark size={30} />, label: "Watchlist" },
];

export default function Navbar({
  activeTab,
  onTabChange,
  isModalOpen,
}: NavbarProps) {
  const { showTooltip, hideTooltip } = useTooltip();
  const { setTabNavigator } = useNavigation();

  const pressTimeout = useRef<number | null>(null);

  /* -------------------------------------------------
     TAB NAVIGATION REGISTRATION
  -------------------------------------------------- */
  useEffect(() => {
    setTabNavigator((direction) => {
      if (isModalOpen) return;

      const index = navItems.findIndex((n) => n.id === activeTab);
      if (index === -1) return;

      if (direction === "up") {
        onTabChange(
          navItems[(index - 1 + navItems.length) % navItems.length].id,
        );
      }

      if (direction === "down") {
        onTabChange(navItems[(index + 1) % navItems.length].id);
      }

      if (direction === "escape" && activeTab === "search") {
        onTabChange("movies");
      }
    });
  }, [activeTab, isModalOpen, onTabChange, setTabNavigator]);

  /* -------------------------------------------------
     TOUCH TOOLTIP
  -------------------------------------------------- */
  const handleTouchStart = (label: string, target: HTMLElement) => {
    pressTimeout.current = window.setTimeout(() => {
      showTooltip(label, "top", target);
    }, 400);
  };

  const handleTouchEnd = () => {
    if (pressTimeout.current !== null) {
      clearTimeout(pressTimeout.current);
      pressTimeout.current = null;
    }
    hideTooltip();
  };

  /* -------------------------------------------------
     RENDER
  -------------------------------------------------- */
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-20 flex-col items-center justify-between bg-[hsl(var(--background))] border-r border-border z-40">
        <div className="pt-4">
          <motion.img
            src={logo}
            alt="CineBay"
            className="w-12 h-12 rounded-full"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
          />
        </div>

        <div className="flex flex-col gap-6">
          {navItems.map((item) => {
            const active = activeTab === item.id;

            return (
              <motion.button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                onMouseEnter={(e) =>
                  showTooltip(item.label, "side", e.currentTarget)
                }
                onMouseLeave={hideTooltip}
                whileHover={{ scale: 1.15 }}
                aria-current={active ? "page" : undefined}
                className={`relative p-2 rounded-lg ${
                  active ? "text-[hsl(var(--foreground))]" : "opacity-50"
                }`}
              >
                {item.icon}

                {active && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-[hsl(var(--foreground))]"
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="pb-6">
          <DarkModeToggle />
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-[hsl(var(--background))] border-t border-border flex justify-around items-center z-40 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const active = activeTab === item.id;

          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              onTouchStart={(e) =>
                handleTouchStart(item.label, e.currentTarget)
              }
              onTouchEnd={handleTouchEnd}
              whileHover={{ scale: 1.15 }}
              aria-current={active ? "page" : undefined}
              className={`relative ${
                active ? "text-[hsl(var(--foreground))]" : "opacity-50"
              }`}
            >
              {item.icon}

              {active && (
                <motion.div
                  layoutId="active-indicator-mobile"
                  className="absolute -bottom-1.5 w-8 h-1 rounded-full bg-[hsl(var(--foreground))]"
                />
              )}
            </motion.button>
          );
        })}
      </nav>
    </>
  );
}
