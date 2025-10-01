import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "sonner";

import Layout from "@/components/Layout";
import Movies from "@/components/Movies";
import Shows from "@/components/Shows";
import DevsPick from "@/components/DevsPick";
import SearchBar from "@/components/SearchBar";
import Watchlist from "@/components/Watchlist";
import Modal from "@/components/Modal";
import PlayerModal from "@/components/PlayerModal";

import type { Movie } from "@/types/movie";
import { useVideoEmbed } from "@/hooks/useVideoEmbed";

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

  // Persist active tab
  const persistTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      localStorage.setItem("activeTab", tab);
    }
  };

  // Modal select with history
  const handleSelect = (() => {
    let lastId: number | null = null;
    return (item: Movie) => {
      if (item.id === lastId) return;
      lastId = item.id;

      if (selectedItem && selectedItem.id !== item.id) {
        setModalHistory((prev) => [...prev, selectedItem]);
      }
      setSelectedItem(item);

      // Push dummy state for back navigation
      window.history.pushState({ modal: true }, "");
    };
  })();

  const handleBackInModal = () => {
    const last = modalHistory.at(-1);
    if (last) {
      setModalHistory((prev) => prev.slice(0, -1));
      setSelectedItem(last);
    } else {
      setSelectedItem(null);
      setModalHistory([]);
    }
  };

  const handleWatch = (movie: Movie) => {
    setPlayerItem(movie);
  };

  const embedUrl = useVideoEmbed(playerItem?.id, playerItem?.media_type);

  // Device/browser back handling (popstate)
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      if (!selectedItem) return;

      e.preventDefault();
      if (modalHistory.length > 0) {
        handleBackInModal();
      } else {
        setSelectedItem(null);
        setModalHistory([]);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [selectedItem, modalHistory]);

  // Tab rendering
  const renderContent = () => {
    switch (activeTab) {
      case "movies":
        return <Movies onSelect={handleSelect} onWatch={handleWatch} />;
      case "tvshows":
        return <Shows onSelect={handleSelect} onWatch={handleWatch} />;
      case "devspick":
        return <DevsPick onSelect={handleSelect} onWatch={handleWatch} />;
      case "watchlist":
        return <Watchlist onSelect={handleSelect} />;
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
      default:
        return null;
    }
  };

  const isModalOpen = Boolean(selectedItem || playerItem);

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={persistTab}
      isModalOpen={isModalOpen}
    >
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

      {/* Details Modal */}
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

      {/* Player Modal */}
      {playerItem && embedUrl && (
        <PlayerModal url={embedUrl} onClose={() => setPlayerItem(null)} />
      )}
    </Layout>
  );
}
