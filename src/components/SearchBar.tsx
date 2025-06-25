import { useState, useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import { Search } from "lucide-react";

export default function SearchBar({
  onSearch,
}: {
  onSearch: (q: string) => void;
}) {
  const [query, setQuery] = useState("");
  const iconControls = useAnimation();
  const barControls = useAnimation();
  const lastScroll = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;

      if (current > lastScroll.current && current > 80) {
        barControls.start({ y: -80, opacity: 0 });
      } else {
        barControls.start({ y: 0, opacity: 1 });
      }

      lastScroll.current = current;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [barControls]);

  return (
    <motion.div
      animate={barControls}
      initial={{ y: 0, opacity: 1 }}
      className="fixed top-[88px] left-0 w-full z-40 flex justify-center px-4 sm:px-6 py-4"
    >
      <motion.form
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(query.trim());
        }}
        autoComplete="off"
        className="w-full max-w-md flex items-center gap-2 rounded-xl shadow-md border"
        style={{
          backgroundColor: "hsl(var(--background))",
          borderColor: "hsl(var(--foreground))",
          padding: "0.5rem 1rem",
        }}
      >
        <motion.input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          whileFocus={{ scale: 1.02 }}
          className="flex-1 text-base md:text-lg bg-transparent outline-none placeholder:text-gray-500"
          style={{
            color: "hsl(var(--foreground))",
          }}
        />
        <motion.button
          type="submit"
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.12 }}
          className="h-10 w-10 flex items-center justify-center rounded-full transition-colors"
          style={{
            color: "hsl(var(--foreground))",
            backgroundColor: "transparent",
            border: "none",
          }}
          onHoverStart={() =>
            iconControls.start({
              rotate: [0, 16, -16, 0],
              transition: { duration: 0.5, ease: "easeInOut" },
            })
          }
          onHoverEnd={() =>
            iconControls.start({
              rotate: 0,
              transition: { duration: 0.3, ease: "easeOut" },
            })
          }
          aria-label="Search"
        >
          <motion.span animate={iconControls}>
            <Search className="h-5 w-5" />
          </motion.span>
        </motion.button>
      </motion.form>
    </motion.div>
  );
}
