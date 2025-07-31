import { useState, useEffect, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster, toast } from "sonner";

import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import Movies from "@/components/Movies";
import Shows from "@/components/Shows";
import Watchlist from "@/components/Watchlist";
import type { Movie } from "@/types/movie";
import { Loader2 } from "lucide-react";
import { getWatchlist } from "@/lib/watchlist";

const DevsPick = lazy(() => import("@/components/DevsPick"));
const Modal = lazy(() => import("@/components/Modal"));

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

  useEffect(() => {
    localStorage.setItem("watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

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

  const handleWatchlistChange = (movie: Movie, isSaved: boolean) => {
    let updated: Movie[];
    if (isSaved) {
      updated = [movie, ...watchlist.filter((m) => m.id !== movie.id)];
      setWatchlist(updated);
      toast.success(
        <span>
          Added <strong>{movie.title || movie.name}</strong> to the Watchlist
        </span>
      );
    } else {
      updated = watchlist.filter((m) => m.id !== movie.id);
      setWatchlist(updated);
      toast.error(
        <div className="flex items-center justify-between gap-4 w-full">
          <span>
            Removed{" "}
            <strong>{movie.title || movie.name} from the Watchlist</strong>
          </span>
          <button
            onClick={() => {
              setWatchlist([movie, ...updated]);
              toast.success(
                <span>
                  Restored <strong>{movie.title || movie.name}</strong>
                </span>
              );
            }}
            className="text-yellow-400 hover:underline whitespace-nowrap"
          >
            Undo
          </button>
        </div>
      );
    }
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
            watchlist={watchlist}
            onClose={() => {
              setSelectedItem(null);
              setModalHistory([]);
            }}
            onSelect={handleSelect}
            onBack={modalHistory.length > 0 ? handleBackInModal : undefined}
            onWatchlistChange={handleWatchlistChange}
          />
        </Suspense>
      )}
    </div>
  );
}
