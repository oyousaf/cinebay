import { useState, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";

import Layout from "@/components/Layout";
import Movies from "@/components/Movies";
import Shows from "@/components/Shows";
import Watchlist from "@/components/Watchlist";
import SearchBar from "@/components/SearchBar";
import type { Movie } from "@/types/movie";
import { useVideoEmbed } from "@/hooks/useVideoEmbed";

const DevsPick = lazy(() => import("@/components/DevsPick"));
const Modal = lazy(() => import("@/components/Modal"));
const PlayerModal = lazy(() => import("@/components/PlayerModal"));

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
  const [playerItem, setPlayerItem] = useState<Movie | null>(null);

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

  // persist active tab
  const persistTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      localStorage.setItem("activeTab", tab);
    }
  };

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

  const handleWatch = (movie: Movie) => {
    setPlayerItem(movie);
  };

  const embedUrl = useVideoEmbed(playerItem?.id, playerItem?.media_type);

  const renderContent = () => {
    switch (activeTab) {
      case "movies":
        return <Movies onSelect={handleSelect} onWatch={handleWatch} />;
      case "tvshows":
        return <Shows onSelect={handleSelect} onWatch={handleWatch} />;
      case "search":
        return (
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="w-full max-w-md">
              <SearchBar
                onSelectMovie={handleSelect}
                onSelectPerson={handleSelect}
              />
            </div>
          </div>
        );
      case "devspick":
        return <DevsPick onSelect={handleSelect} onWatch={handleWatch} />;
      case "watchlist":
        return <Watchlist onSelect={handleSelect} />;
      default:
        return null;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={persistTab}>
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
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full min-h-[70vh]">
                <Loader2 className="h-10 w-10 animate-spin text-[hsl(var(--foreground))] z-50" />
              </div>
            }
          >
            {renderContent()}
          </Suspense>
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
          />
        </Suspense>
      )}

      {playerItem && embedUrl && (
        <Suspense fallback={null}>
          <PlayerModal url={embedUrl} onClose={() => setPlayerItem(null)} />
        </Suspense>
      )}
    </Layout>
  );
}
