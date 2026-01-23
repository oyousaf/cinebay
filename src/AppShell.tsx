"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster, toast } from "sonner";
import { useNavigate } from "react-router-dom";

import Layout from "@/components/Layout";
import Movies from "@/components/Movies";
import Shows from "@/components/Shows";
import DevsPick from "@/components/DevsPick";
import SearchBar from "@/components/SearchBar";
import Watchlist from "@/components/Watchlist";
import Modal from "@/components/modal/ModalClient";
import ExitConfirmModal from "@/components/ExitConfirmModal";

import { useModalManager } from "@/context/ModalContext";
import type { PlaybackIntent } from "@/lib/embed/buildEmbedUrl";

export default function AppShell() {
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

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<
    "movies" | "tvshows" | "search" | "devspick" | "watchlist"
  >(() => {
    return (localStorage.getItem("activeTab") as any) ?? "movies";
  });

  const { activeModal, selectedItem, openContent, close, goBackContent } =
    useModalManager();

  const isStandalone = useMemo(() => {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );
  }, []);

  const persistTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    localStorage.setItem("activeTab", tab);
  };

  /* ---------- ROUTE-BASED PLAY ---------- */
  const handleWatch = (intent: PlaybackIntent) => {
    if (intent.mediaType === "tv") {
      navigate(
        `/watch/tv/${intent.tmdbId}/${intent.season ?? 1}/${intent.episode ?? 1}`,
      );
      return;
    }

    toast.error("Movie playback route not wired yet.");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "movies":
        return <Movies onSelect={openContent} onWatch={handleWatch} />;

      case "tvshows":
        return <Shows onSelect={openContent} onWatch={handleWatch} />;

      case "devspick":
        return <DevsPick onSelect={openContent} onWatch={handleWatch} />;

      case "watchlist":
        return <Watchlist onSelect={openContent} />;

      case "search":
        return (
          <div className="flex items-center justify-center px-4 min-h-screen">
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
          className="flex-1 overflow-y-auto min-h-0"
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

      {activeModal === "exit" && (
        <ExitConfirmModal
          open
          onCancel={close}
          onExit={() => {
            if (isStandalone) window.close();
            else toast.error("Please close this tab manually.");
            close();
          }}
        />
      )}
    </Layout>
  );
}
