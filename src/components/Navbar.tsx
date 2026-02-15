"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaFilm, FaTv, FaSearch, FaStar, FaBookmark } from "react-icons/fa";

import { DarkModeToggle } from "../DarkModeToggle";
import { useTooltip } from "@/context/TooltipContext";
import { useNavigation } from "@/context/NavigationContext";

import logo from "/logo.png";

type Tab = "movies" | "tvshows" | "search" | "devspick" | "watchlist";

interface NavbarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isModalOpen?: boolean;
}

type NavItem = {
  id: Tab;
  icon: React.ReactElement;
  label: string;
};

const navItems: NavItem[] = [
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
     TOUCH TOOLTIP (MOBILE)
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
     CLEANUP
  -------------------------------------------------- */
  useEffect(() => {
    return () => {
      if (pressTimeout.current !== null) {
        clearTimeout(pressTimeout.current);
        pressTimeout.current = null;
      }
    };
  }, []);

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
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
        </div>

        <div className="flex flex-col gap-6">
          {navItems.map((item) => {
            const active = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                onClick={() => onTabChange(item.id)}
                onMouseEnter={(e) =>
                  showTooltip(item.label, "side", e.currentTarget)
                }
                onMouseLeave={hideTooltip}
                className={`relative p-2 rounded-lg transition-transform ${
                  active ? "text-[hsl(var(--foreground))]" : "opacity-50"
                }`}
              >
                <motion.span whileHover={{ scale: 1.15 }}>
                  {item.icon}
                </motion.span>

                <AnimatePresence>
                  {active && (
                    <motion.div
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      exit={{ scaleY: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-[hsl(var(--foreground))] origin-center"
                    />
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>

        <div className="pb-6">
          <DarkModeToggle />
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 w-full h-16 box-border bg-[hsl(var(--background))]
          border-t border-border flex justify-around items-center z-30 pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        {navItems.map((item) => {
          const active = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              onClick={() => onTabChange(item.id)}
              onTouchStart={(e) =>
                handleTouchStart(item.label, e.currentTarget)
              }
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              className={`relative transition-transform ${
                active ? "text-[hsl(var(--foreground))]" : "opacity-50"
              }`}
            >
              <motion.span whileTap={{ scale: 0.9 }}>{item.icon}</motion.span>

              <AnimatePresence>
                {active && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    exit={{ scaleX: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute -bottom-1.5 w-8 h-1 rounded-full bg-[hsl(var(--foreground))] origin-center"
                  />
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </nav>
    </>
  );
}
