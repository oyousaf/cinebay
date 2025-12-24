"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FaFilm, FaTv, FaSearch, FaStar, FaBookmark } from "react-icons/fa";
import { useTooltip } from "@/context/TooltipContext";

import { DarkModeToggle } from "../DarkModeToggle";
import logo from "/logo.png";
import { useNavigation } from "@/hooks/useNavigation";

type Tab = "movies" | "tvshows" | "search" | "devspick" | "watchlist";

interface NavbarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isModalOpen?: boolean;
}

const navItems: { id: Tab; icon: React.ReactElement; label: string }[] = [
  { id: "movies", icon: <FaFilm size={30} />, label: "Movies" },
  { id: "tvshows", icon: <FaTv size={30} />, label: "TV Shows" },
  { id: "search", icon: <FaSearch size={30} />, label: "Search" },
  { id: "devspick", icon: <FaStar size={30} />, label: "Dev’s Pick" },
  { id: "watchlist", icon: <FaBookmark size={30} />, label: "Watchlist" },
];

const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  isModalOpen,
}) => {
  const { showTooltip, hideTooltip } = useTooltip();
  const { setNavigationLocked } = useNavigation();
  const pressTimeout = useRef<NodeJS.Timeout | null>(null);

  /* Lock global navigation on Search */
  useEffect(() => {
    setNavigationLocked(activeTab === "search");
    return () => setNavigationLocked(false);
  }, [activeTab, setNavigationLocked]);

  /* Keyboard navigation for tabs only */
  useEffect(() => {
    if (isModalOpen) return;

    const handleKeys = (e: KeyboardEvent) => {
      const currentIndex = navItems.findIndex((n) => n.id === activeTab);

      if (activeTab === "search" && e.key === "Escape") {
        onTabChange("movies");
        return;
      }

      if (activeTab === "search") return;

      if (["ArrowUp", "w", "W"].includes(e.key)) {
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

  /* Long-press tooltips */
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
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-20 flex-col items-center justify-between bg-[hsl(var(--background))] border-r border-border z-40">
        <div className="pt-4">
          <motion.img
            src={logo}
            alt="CineBay"
            className="w-12 h-12 object-contain rounded-full"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          />
        </div>

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
                className={`p-2 rounded-lg ${isActive ? "" : "opacity-50"}`}
              >
                {item.icon}
                {isActive && (
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

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-[hsl(var(--background))] border-t border-border flex justify-around items-center z-40">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              onTouchStart={(e) => handleTouchStart(item.id, e)}
              onTouchEnd={handleTouchEnd}
              className={`flex flex-col items-center ${
                isActive ? "" : "opacity-50"
              }`}
            >
              {item.icon}
            </motion.button>
          );
        })}
      </nav>
    </>
  );
};

export default Navbar;
