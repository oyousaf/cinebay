import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ---------- Helpers ---------- */
function getPreferredTheme() {
  if (typeof window === "undefined") return false;

  const stored = window.localStorage.getItem("theme");
  if (stored === "dark") return true;
  if (stored === "light") return false;

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/* ---------- Component ---------- */
export function DarkModeToggle() {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  /* Resolve theme once on client */
  useEffect(() => {
    setDark(getPreferredTheme());
    setMounted(true);
  }, []);

  /* Listen for system changes (only if user hasn't chosen) */
  useEffect(() => {
    if (!mounted) return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const systemChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        setDark(e.matches);
      }
    };

    mq.addEventListener("change", systemChange);
    return () => mq.removeEventListener("change", systemChange);
  }, [mounted]);

  /* Apply theme */
  useEffect(() => {
    if (!mounted) return;

    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark, mounted]);

  /* Prevent render until client ready */
  if (!mounted) {
    return <div className="w-10 h-10" />;
  }

  return (
    <button
      onClick={() => setDark((d) => !d)}
      className="flex items-center justify-center w-10 h-10 rounded-full transition"
      aria-label="Toggle dark mode"
    >
      <AnimatePresence initial={false}>
        <motion.span
          key={dark ? "sun" : "moon"}
          initial={{ rotate: dark ? 180 : -180, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, type: "spring" }}
        >
          {dark ? <Sun size={30} /> : <Moon size={30} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
