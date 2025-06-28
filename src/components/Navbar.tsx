import { DarkModeToggle } from "../DarkModeToggle";
import logo from "/logo.png";
import { motion } from "framer-motion";
import { Bookmark } from "lucide-react";

type NavbarProps = {
  onViewChange: (view: "home" | "watchlist") => void;
  currentView: "home" | "watchlist";
};

export default function Navbar({ onViewChange, currentView }: NavbarProps) {
  return (
    <header
      className="fixed top-0 left-0 w-full z-50 shadow-md shadow-violet-300/20 backdrop-blur-sm"
      style={{
        backgroundColor: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
        <div className="grid grid-cols-3 items-center">
          {/* Watchlist Button */}
          <div className="flex justify-start">
            <button
              onClick={() => onViewChange("watchlist")}
              className={`flex items-center gap-2 transition cursor-pointer ${
                currentView === "watchlist"
                  ? "text-amber-400"
                  : "hover:text-amber-400"
              }`}
              aria-label="Go to Watchlist"
            >
              <Bookmark size={30} />
            </button>
          </div>

          {/* Logo */}
          <div className="flex justify-center">
            <button
              onClick={() => onViewChange("home")}
              className="inline-block cursor-pointer"
              aria-label="Go to Home"
            >
              <motion.img
                src={logo}
                alt="CineBay"
                className="w-20 h-20 object-contain drop-shadow-[0_0_12px_rgba(192,132,252,0.35)] dark:drop-shadow-[0_0_14px_rgba(255,255,255,0.25)]"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </button>
          </div>

          {/* Dark Mode Toggle */}
          <div className="flex justify-end">
            <DarkModeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
