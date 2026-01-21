import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster, toast } from "sonner";

import Layout from "@/components/Layout";
import Movies from "@/components/Movies";
import Shows from "@/components/Shows";
import DevsPick from "@/components/DevsPick";
import SearchBar from "@/components/SearchBar";
import Watchlist from "@/components/Watchlist";
import Modal from "@/components/modal/ModalClient";
import PlayerModal from "@/components/PlayerModal";
import ExitConfirmModal from "@/components/ExitConfirmModal";

import { useModalManager } from "@/context/ModalContext";
import type { PlaybackIntent } from "@/lib/embed/buildEmbedUrl";

export default function App() {
  /* ---------- viewport stabiliser ---------- */
  useEffect(() => {
    const setVH = () => {
      document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`,
      );
    };
    setVH();
    window.addEventListener("resize", setVH);
    return () => window.removeEventListener("resize", setVH);
  }, []);
  /* ---------------------------------------- */

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
    playerIntent,
    openContent,
    openPlayer,
    close,
    goBackContent,
  } = useModalManager();

  const isStandalone = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );
  }, []);

  const persistTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    try {
      localStorage.setItem("activeTab", tab);
    } catch {}
  };

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
          <div
            className="flex items-center justify-center px-4"
            style={{ minHeight: "calc(var(--vh) * 100)" }}
          >
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

      {activeModal === "content" && selectedItem && (
        <Modal
          movie={selectedItem}
          onClose={close}
          onSelect={openContent}
          onBack={goBackContent}
        />
      )}

      {activeModal === "player" && playerIntent && (
        <PlayerModal intent={playerIntent as PlaybackIntent} onClose={close} />
      )}

      {activeModal === "exit" && (
        <ExitConfirmModal
          open
          onCancel={close}
          onExit={() => {
            if (isStandalone) window.close();
            else
              toast.error(
                "Can’t auto-close in browser — please close this tab.",
              );
            close();
          }}
        />
      )}
    </Layout>
  );
}
