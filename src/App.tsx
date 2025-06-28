import { useState } from "react";
import { motion } from "framer-motion";
import SearchBar from "@/components/SearchBar";
import Movies from "@/components/Movies";
import Shows from "@/components/Shows";
import DevsPick from "@/components/DevsPick";
import Navbar from "@/components/Navbar";
import Modal from "@/components/Modal";
import type { Movie } from "@/types/movie";
import Watchlist from "@/watchlist";
import { Toaster, toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useRegisterSW } from "virtual:pwa-register/react";

export default function App() {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const pathname = window.location.pathname;

  // ✅ Service worker toast handler
  useRegisterSW({
    onNeedRefresh() {
      toast.info("New update available. Refresh to update", {
        action: {
          label: "Refresh",
          onClick: () => window.location.reload(),
        },
      });
    },
    onOfflineReady() {
      toast.success("App is ready to work offline ✨");
    },
  });

  if (pathname === "/watchlist") return <Watchlist />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="min-h-screen w-full flex flex-col"
    >
      <Navbar />
      <SearchBar onSelect={setSelectedMovie} />

      <main className="w-full max-w-7xl flex-1 mx-auto flex flex-col items-center px-4 sm:px-6 pt-[176px] pb-6">
        <Movies onSelect={setSelectedMovie} />
        <Shows onSelect={setSelectedMovie} />
        <DevsPick onSelect={setSelectedMovie} />
      </main>

      {selectedMovie && (
        <Modal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}

      {/* ✅ Toaster with rich colors */}
      <Toaster position="bottom-center" richColors closeButton />
    </motion.div>
  );
}
