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
          <div />
          <div className="flex justify-center">
            <motion.img
              src={logo}
              alt="CineBay"
              className="w-20 h-20 object-contain drop-shadow-[0_0_12px_rgba(192,132,252,0.35)]"
            />
          </div>
          <div className="flex justify-end">
            <DarkModeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
