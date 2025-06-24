import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function getPreferredTheme() {
  // 1. Check localStorage
  const stored = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
  if (stored === "dark") return true;
  if (stored === "light") return false;
  // 2. Fallback: use device preference
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  // 3. Default to light
  return false;
}

export function DarkModeToggle() {
  const [dark, setDark] = useState(getPreferredTheme);

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const systemChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't set their own preference
      if (!localStorage.getItem("theme")) {
        setDark(e.matches);
      }
    };
    mq.addEventListener("change", systemChange);
    return () => mq.removeEventListener("change", systemChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <button
      onClick={() => setDark((d) => !d)}
      className="flex items-center justify-center w-10 h-10 rounded-full transition"
      aria-label="Toggle dark mode"
    >
      <AnimatePresence mode="wait" initial={false}>
        {dark ? (
          <motion.span
            key="sun"
            initial={{ rotate: 180, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 180, opacity: 0 }}
            transition={{ duration: 0.4, type: "spring" }}
          >
            <Sun size={30} />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ rotate: -180, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -180, opacity: 0 }}
            transition={{ duration: 0.4, type: "spring" }}
          >
            <Moon size={30} />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
