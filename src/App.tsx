import { useState, useEffect, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "sonner";

import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import Movies from "@/components/Movies";
import Shows from "@/components/Shows";
import Watchlist from "@/components/Watchlist";
import type { Movie } from "@/types/movie";
import { Loader2 } from "lucide-react";

import { getWatchlist } from "@/lib/watchlist";

// Lazy load heavy components
const DevsPick = lazy(() => import("@/components/DevsPick"));
const Modal = lazy(() => import("@/components/Modal"));

// Prefetch DevsPick on idle
if (typeof window !== "undefined") {
  const prefetch = () => import("@/components/DevsPick");
  "requestIdleCallback" in window
    ? requestIdleCallback(prefetch)
    : setTimeout(prefetch, 2000);
}

export default function App() {
  const [selectedItem, setSelectedItem] = useState<Movie | null>(null);
  const [modalHistory, setModalHistory] = useState<Movie[]>([]);
  const [watchlist, setWatchlist] = useState<Movie[]>(() => getWatchlist());

  const [view, setView] = useState<"home" | "watchlist">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("view") as "home" | "watchlist") || "home";
    }
    return "home";
  });

  useEffect(() => {
    localStorage.setItem("view", view);
  }, [view]);

  const handleSelect = (() => {
    let lastId: number | null = null;
    return (item: Movie) => {
      if (item.id === lastId) return;
      lastId = item.id;

      if (selectedItem && selectedItem.id !== item.id) {
        setModalHistory((prev) => [...prev, selectedItem]);
      }
      setSelectedItem(item);
    };
  })();

  const handleBackInModal = () => {
    const last = modalHistory.at(-1);
    if (!last) return;
    setModalHistory((prev) => prev.slice(0, -1));
    setSelectedItem(last);
  };

  const renderHome = () => (
    <>
      <SearchBar onSelectMovie={handleSelect} onSelectPerson={handleSelect} />
      <main className="w-full max-w-7xl flex-1 mx-auto flex flex-col items-center px-4 sm:px-6 pt-[176px] pb-6">
        <Movies onSelect={handleSelect} />
        <Shows onSelect={handleSelect} />
        <Suspense
          fallback={
            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
          }
        >
          <DevsPick onSelect={handleSelect} />
        </Suspense>
      </main>
    </>
  );

  return (
    <div className="min-h-screen w-full flex flex-col bg-background text-foreground">
      <Toaster richColors position="bottom-center" theme="dark" />
      <Navbar onViewChange={setView} currentView={view} />

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, x: view === "home" ? -40 : 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: view === "home" ? 40 : -40 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex-1 overflow-y-auto scrollbar-hide min-h-0"
        >
          {view === "watchlist" ? (
            <Watchlist
              items={watchlist}
              onSelect={handleSelect}
              onUpdate={setWatchlist}
            />
          ) : (
            renderHome()
          )}
        </motion.div>
      </AnimatePresence>

      {selectedItem && (
        <Suspense fallback={null}>
          <Modal
            movie={selectedItem}
            onClose={() => {
              setSelectedItem(null);
              setModalHistory([]);
            }}
            onSelect={handleSelect}
            onBack={modalHistory.length > 0 ? handleBackInModal : undefined}
            onWatchlistChange={(id, isSaved) => {
              setWatchlist((prev) =>
                isSaved
                  ? [...prev, selectedItem!]
                  : prev.filter((m) => m.id !== id)
              );
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
