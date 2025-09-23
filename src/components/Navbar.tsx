import { DarkModeToggle } from "../DarkModeToggle";
import logo from "/logo.png";
import { motion } from "framer-motion";

export default function Navbar() {
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
          <div></div>

          {/* Logo */}
          <div className="flex justify-center">
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              aria-label="CineBay Logo"
              className="relative group rounded-full"
            >
              <motion.img
                src={logo}
                alt="CineBay"
                className="w-20 h-20 object-contain drop-shadow-[0_0_12px_rgba(192,132,252,0.35)] 
                           dark:drop-shadow-[0_0_14px_rgba(255,255,255,0.25)]
                           group-hover:drop-shadow-[0_0_16px_rgba(251,191,36,0.6)]
                           dark:group-hover:drop-shadow-[0_0_18px_rgba(147,51,234,0.7)] 
                           rounded-full transition-all duration-300 ease-out"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </motion.div>
          </div>

          {/* Dark Mode Toggle */}
          <div className="flex justify-end">
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="rounded-full hover:drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] dark:hover:drop-shadow-[0_0_10px_rgba(147,51,234,0.6)]"
            >
              <DarkModeToggle />
            </motion.div>
          </div>
        </div>
      </div>
    </header>
  );
}
