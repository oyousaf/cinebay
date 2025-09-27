import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { FaFilm, FaTv, FaSearch, FaStar, FaBookmark } from "react-icons/fa";

type Tab = "movies" | "tvshows" | "search" | "devspick" | "watchlist";

interface HybridNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const navItems: { id: Tab; icon: React.ReactElement; label: string }[] = [
  { id: "movies", icon: <FaFilm size={22} />, label: "Movies" },
  { id: "tvshows", icon: <FaTv size={22} />, label: "TV Shows" },
  { id: "search", icon: <FaSearch size={22} />, label: "Search" },
  { id: "devspick", icon: <FaStar size={22} />, label: "Dev’s Pick" },
  { id: "watchlist", icon: <FaBookmark size={22} />, label: "Watchlist" },
];

const HybridNav: React.FC<HybridNavProps> = ({ activeTab, onTabChange }) => {
  // Keyboard controls
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (activeTab === "search" && e.key === "Escape") {
        onTabChange("movies");
        return;
      }

      const currentIndex = navItems.findIndex((n) => n.id === activeTab);

      // previous tab
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        const prev = (currentIndex - 1 + navItems.length) % navItems.length;
        onTabChange(navItems[prev].id);
      }

      // next tab
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        const next = (currentIndex + 1) % navItems.length;
        onTabChange(navItems[next].id);
      }
    };

    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [activeTab, onTabChange]);

  return (
    <>
      {/* Sidebar for desktop */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-16 flex-col items-center justify-center gap-6 bg-[hsl(var(--background))] border-r border-border z-40">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative group p-2 rounded-lg transition-colors ${
                isActive
                  ? "text-[hsl(var(--foreground))]"
                  : "text-muted-foreground hover:text-[hsl(var(--foreground))]"
              }`}
              aria-label={item.label}
            >
              {item.icon}
              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-[hsl(var(--foreground))]"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
            </button>
          );
        })}
      </aside>

      {/* Bottom nav for mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-[hsl(var(--background))] border-t border-border flex justify-around items-center z-40">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative group flex flex-col items-center justify-center ${
                isActive
                  ? "text-[hsl(var(--foreground))]"
                  : "text-muted-foreground hover:text-[hsl(var(--foreground))]"
              }`}
              aria-label={item.label}
            >
              {item.icon}
              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute -bottom-1.5 w-8 h-1 rounded-full bg-[hsl(var(--foreground))]"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};

export default HybridNav;
