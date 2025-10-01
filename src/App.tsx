import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster, toast } from "sonner";

import Layout from "@/components/Layout";
import Movies from "@/components/Movies";
import Shows from "@/components/Shows";
import DevsPick from "@/components/DevsPick";
import SearchBar from "@/components/SearchBar";
import Watchlist from "@/components/Watchlist";
import Modal from "@/components/Modal";
import PlayerModal from "@/components/PlayerModal";
import ExitConfirmModal from "@/components/ExitConfirmModal";

import { useModalManager } from "@/context/ModalContext";

export default function App() {
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

  const {
    activeModal,
    selectedItem,
    playerUrl,
    openContent,
    openPlayer,
    openExit,
    close,
    goBackContent,
  } = useModalManager();

  // ✅ detect if running as standalone (PWA/TV mode)
  const isStandalone = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );
  }, []);

  // Persist active tab safely
  const persistTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("activeTab", tab);
      } catch (err) {
        console.warn("Unable to persist tab to localStorage", err);
      }
    }
  };

  // Tab rendering
  const renderContent = () => {
    switch (activeTab) {
      case "movies":
        return <Movies onSelect={openContent} onWatch={openPlayer} />;
      case "tvshows":
        return <Shows onSelect={openContent} onWatch={openPlayer} />;
      case "devspick":
        return <DevsPick onSelect={openContent} onWatch={openPlayer} />;
      case "watchlist":
        return <Watchlist onSelect={openContent} />;
      case "search":
        return (
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="w-full max-w-md">
              <SearchBar
                onSelectMovie={openContent}
                onSelectPerson={openContent}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={persistTab}
      isModalOpen={Boolean(activeModal)}
    >
      <Toaster richColors position="bottom-center" theme="dark" />

      {/* Page transition */}
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

      {/* Content Modal */}
      {activeModal === "content" && selectedItem && (
        <Modal
          movie={selectedItem}
          onClose={close}
          onSelect={openContent}
          onBack={goBackContent}
        />
      )}

      {/* Player Modal */}
      {activeModal === "player" && playerUrl && (
        <PlayerModal url={playerUrl} onClose={close} />
      )}

      {/* Exit Confirm Modal */}
      {activeModal === "exit" && (
        <ExitConfirmModal
          open
          onCancel={close}
          onExit={() => {
            if (isStandalone) {
              window.close();
            }
            else {
              toast.error(
                "Can’t auto-close in browser — please close this tab."
              );
            }
            close();
          }}
        />
      )}
    </Layout>
  );
}
