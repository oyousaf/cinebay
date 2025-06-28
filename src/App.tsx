import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SearchBar from "@/components/SearchBar";
import Movies from "@/components/Movies";
import Shows from "@/components/Shows";
import DevsPick from "@/components/DevsPick";
import Navbar from "@/components/Navbar";
import Modal from "@/components/Modal";
import Watchlist from "@/components/Watchlist";
import { Toaster, toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";
import type { Movie } from "@/types/movie";

export default function App() {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [view, setView] = useState<"home" | "watchlist">(() => {
    return (localStorage.getItem("view") as "home" | "watchlist") || "home";
  });

  // PWA: Service Worker registration and offline handling
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

  // Save view to localStorage
  useEffect(() => {
    localStorage.setItem("view", view);
  }, [view]);

  // Network status tracking
  useEffect(() => {
    if (!navigator.onLine) toast.error("You are offline ⚠️");

    const handleOnline = () => {
      toast.success("Back online. Reloading...");
      setTimeout(() => window.location.reload(), 1000);
    };

    const handleOffline = () => toast.error("You are offline ⚠️");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col bg-background text-foreground">
      <Navbar onViewChange={setView} currentView={view} />

      <AnimatePresence mode="wait">
        {view === "watchlist" ? (
          <motion.div
            key="watchlist"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <Watchlist />
          </motion.div>
        ) : (
          <motion.div
            key="home"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <SearchBar onSelect={setSelectedMovie} />
            <main className="w-full max-w-7xl flex-1 mx-auto flex flex-col items-center px-4 sm:px-6 pt-[176px] pb-6">
              <Movies onSelect={setSelectedMovie} />
              <Shows onSelect={setSelectedMovie} />
              <DevsPick onSelect={setSelectedMovie} />
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedMovie && (
        <Modal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}

      <Toaster position="bottom-center" richColors closeButton />
    </div>
  );
}
