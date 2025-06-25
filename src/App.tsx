import { motion } from "framer-motion";
import SearchBar from "@/components/SearchBar";
import LatestMovies from "@/components/Movies";
import YouShouldWatch from "./components/Shows";
import DevsPick from "./components/DevsPick";
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="min-h-screen w-full flex flex-col"
    >
      <Navbar />
      <SearchBar onSearch={(q) => alert(`Search for: ${q}`)} />

      <main className="w-full max-w-7xl flex-1 mx-auto flex flex-col items-center px-4 sm:px-6 pt-[176px] pb-6">
        <LatestMovies
          onSelect={(movie) => alert(`You clicked: ${movie.title}`)}
        />
        <YouShouldWatch />
        <DevsPick />
      </main>
    </motion.div>
  );
}
