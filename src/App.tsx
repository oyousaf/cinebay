import { useState, useEffect, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster, toast } from "sonner";

import Layout from "@/components/Layout";
import Movies from "@/components/Movies";
import Shows from "@/components/Shows";
import Watchlist from "@/components/Watchlist";
import SearchBar from "@/components/SearchBar";
import type { Movie } from "@/types/movie";
import { Loader2 } from "lucide-react";
import { getWatchlist } from "@/lib/watchlist";

const DevsPick = lazy(() => import("@/components/DevsPick"));
const Modal = lazy(() => import("@/components/Modal"));

// Prefetch DevsPick when idle
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

  const [activeTab, setActiveTab] = useState<
    "movies" | "tvshows" | "search" | "devspick" | "watchlist"
  >(() => {
    if (typeof window !== "undefined") {
      return (
        (localStorage.getItem("activeTab") as
          | "movies"
          | "tvshows"
          | "search"
          | "devspick"
          | "watchlist") || "movies"
      );
    }
    return "movies";
  });

  // persist activeTab
  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  // persist watchlist
  useEffect(() => {
    localStorage.setItem("watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  // handle selection + modal history
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

  // handle watchlist add/remove
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

  // render based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "movies":
        return <Movies onSelect={handleSelect} />;
      case "tvshows":
        return <Shows onSelect={handleSelect} />;
      case "search":
        return (
          <div className="flex items-center justify-center h-full px-4">
            <div className="w-full max-w-md">
              <SearchBar
                onSelectMovie={handleSelect}
                onSelectPerson={handleSelect}
              />
            </div>
          </div>
        );
      case "devspick":
        return (
          <Suspense
            fallback={
              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
            }
          >
            <DevsPick onSelect={handleSelect} />
          </Suspense>
        );
      case "watchlist":
        return (
          <Watchlist
            items={watchlist}
            onSelect={handleSelect}
            onUpdate={setWatchlist}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <Toaster richColors position="bottom-center" theme="dark" />
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex-1 overflow-y-auto scrollbar-hide min-h-0"
        >
          {renderContent()}
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
    </Layout>
  );
}
