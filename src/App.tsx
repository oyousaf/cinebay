import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "sonner";

import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import Movies from "@/components/Movies";
import Shows from "@/components/Shows";
import DevsPick from "@/components/DevsPick";
import Watchlist from "@/components/Watchlist";
import Modal from "@/components/Modal";

import type { Movie } from "@/types/movie";

export default function App() {
  const [selectedItem, setSelectedItem] = useState<Movie | null>(null);
  const [modalHistory, setModalHistory] = useState<Movie[]>([]);

  const [view, setView] = useState<"home" | "watchlist">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("view") as "home" | "watchlist") || "home";
    }
    return "home";
  });

  useEffect(() => {
    localStorage.setItem("view", view);
  }, [view]);

  const handleSelect = (item: Movie) => {
    if (selectedItem) {
      setModalHistory((prev) => [...prev, selectedItem]);
    }
    setSelectedItem(item);
  };

  const handleBackInModal = () => {
    const last = modalHistory.at(-1);
    if (!last) return;

    setModalHistory((prev) => prev.slice(0, -1));
    setSelectedItem(last);
  };

  const renderHome = () => (
    <>
      <Toaster richColors position="bottom-center" theme="dark" />

      <SearchBar onSelectMovie={handleSelect} onSelectPerson={handleSelect} />
      <main className="w-full max-w-7xl flex-1 mx-auto flex flex-col items-center px-4 sm:px-6 pt-[176px] pb-6">
        <Movies onSelect={handleSelect} />
        <Shows onSelect={handleSelect} />
        <DevsPick onSelect={handleSelect} />
      </main>
    </>
  );

  return (
    <div className="min-h-screen w-full flex flex-col bg-background text-foreground">
      <Navbar onViewChange={setView} currentView={view} />

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, x: view === "home" ? -40 : 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: view === "home" ? 40 : -40 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {view === "watchlist" ? (
            <Watchlist onSelect={handleSelect} />
          ) : (
            renderHome()
          )}
        </motion.div>
      </AnimatePresence>

      {selectedItem && (
        <Modal
          movie={selectedItem}
          onClose={() => {
            setSelectedItem(null);
            setModalHistory([]);
          }}
          onSelect={handleSelect}
          onBack={modalHistory.length > 0 ? handleBackInModal : undefined}
        />
      )}
    </div>
  );
}
