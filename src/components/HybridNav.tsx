import React, { JSX, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaFilm, FaTv, FaSearch, FaStar, FaBookmark } from "react-icons/fa";
import SearchBar from "@/components/SearchBar";

type Tab = "movies" | "tvshows" | "search" | "devspick" | "watchlist";

interface HybridNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onSelectMovie: (movie: any) => void;
  onSelectPerson?: (person: any) => void;
}

const navItems: { id: Tab; icon: JSX.Element; label: string }[] = [
  { id: "movies", icon: <FaFilm size={22} />, label: "Movies" },
  { id: "tvshows", icon: <FaTv size={22} />, label: "TV Shows" },
  { id: "search", icon: <FaSearch size={22} />, label: "Search" },
  { id: "devspick", icon: <FaStar size={22} />, label: "Dev’s Pick" },
  { id: "watchlist", icon: <FaBookmark size={22} />, label: "Watchlist" },
];

const HybridNav: React.FC<HybridNavProps> = ({
  activeTab,
  onTabChange,
  onSelectMovie,
  onSelectPerson,
}) => {
  // Escape closes search and goes back to movies
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (activeTab === "search" && e.key === "Escape") {
        onTabChange("movies");
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [activeTab, onTabChange]);

  return (
    <>
      {/* Sidebar for large screens */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-16 flex-col items-center justify-center gap-6 bg-[hsl(var(--background))] border-r border-border z-40">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className="relative group p-2 rounded-lg transition-colors text-muted-foreground hover:text-[hsl(var(--foreground))]"
            aria-label={item.label}
          >
            {item.icon}
            {activeTab === item.id && (
              <motion.div
                layoutId="active-indicator"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-[hsl(var(--foreground))]"
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
            )}
            {/* Tooltip */}
            <span className="absolute left-10 px-2 py-1 text-xs bg-[hsl(var(--foreground))] text-[hsl(var(--background))] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
              {item.label}
            </span>
          </button>
        ))}
      </aside>

      {/* Bottom nav for small screens */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-[hsl(var(--background))] border-t border-border flex justify-around items-center z-40">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className="relative group flex flex-col items-center justify-center text-muted-foreground hover:text-[hsl(var(--foreground))]"
            aria-label={item.label}
          >
            {item.icon}
            {activeTab === item.id && (
              <motion.div
                layoutId="active-indicator"
                className="absolute -bottom-1 w-8 h-1 rounded-full bg-[hsl(var(--foreground))]"
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
            )}
            {/* Tooltip (purple/mint theme) */}
            <span className="absolute bottom-10 px-2 py-1 text-xs bg-[hsl(var(--foreground))] text-black rounded opacity-0 group-hover:opacity-100 pointer-events-none">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Search View */}
      <AnimatePresence>
        {activeTab === "search" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-30 flex items-center justify-center bg-[hsl(var(--background))]"
          >
            <div className="w-full max-w-2xl px-4">
              <SearchBar
                onSelectMovie={onSelectMovie}
                onSelectPerson={onSelectPerson}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default HybridNav;
