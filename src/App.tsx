import { motion } from "framer-motion";
import SearchBar from "@/components/SearchBar";
import LatestMovies from "@/components/LatestMovies";
import YouShouldWatch from "./components/YouShouldWatch";
import DevsPick from "./components/DevsPick";
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="min-h-screen flex flex-col items-center"
    >

      <Navbar />

      {/* App Content */}
      <main className="w-full flex-1 flex flex-col items-center pt-[88px] pb-6 px-2">
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
