import { motion, useAnimation } from "framer-motion";
import { useState } from "react";
import { Search } from "lucide-react";

export default function SearchBar({
  onSearch,
}: {
  onSearch: (q: string) => void;
}) {
  const [query, setQuery] = useState("");
  const iconControls = useAnimation();

  return (
    <motion.form
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.1, duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-md flex flex-col sm:flex-row gap-2 items-center justify-center mt-10 px-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(query);
      }}
      autoComplete="off"
    >
      <motion.input
        type="text"
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        whileFocus={{ scale: 1.03 }}
        className="flex-1 text-2xl md:text-3xl py-4 px-4 rounded-md border border-foreground bg-background text-foreground placeholder:text-gray-500 outline-none transition-all"
      />
      <motion.button
        type="submit"
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.12 }}
        className="flex items-center justify-center h-12 w-12 rounded-full transition bg-transparent text-foreground hover:bg-foreground hover:text-background dark:text-foreground dark:hover:bg-background dark:hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/60 cursor-pointer"
        style={{ border: "none" }}
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
          <Search className="h-6 w-6" />
        </motion.span>
      </motion.button>
    </motion.form>
  );
}
