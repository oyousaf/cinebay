import logo from "/logo.png";
import { DarkModeToggle } from "./DarkModeToggle";
import { motion } from "framer-motion";
import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import LatestMovies from "@/components/LatestMovies";
import DevsPick from "./components/DevsPick";
import YouShouldWatch from "./components/YouShouldWatch";

export default function App() {
  const [selectedMovie, setSelectedMovie] = useState<any>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="min-h-screen flex flex-col items-center max-w-7xl mx-auto"
    >
      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="grid grid-cols-3 items-center">
          <div />
          <div className="flex justify-center">
            <img src={logo} alt="CineBay" className="w-40 h-40 object-contain" />
          </div>
          <div className="flex justify-end">
            <DarkModeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center w-full">
        <SearchBar onSearch={(q) => alert(`Search for: ${q}`)} />
        <LatestMovies
          onSelect={(movie) => alert(`You clicked: ${movie.title}`)}
        />
        <YouShouldWatch />
        <DevsPick />
      </main>
    </motion.div>
  );
}
