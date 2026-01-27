"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster, toast } from "sonner";

import Layout from "@/components/Layout";
import Movies from "@/components/Movies";
import Shows from "@/components/Shows";
import DevsPick from "@/components/DevsPick";
import SearchBar from "@/components/SearchBar";
import Watchlist from "@/components/Watchlist";
import Modal from "@/components/modal/ModalClient";
import ExitConfirmModal from "@/components/ExitConfirmModal";

import { useModalManager } from "@/context/ModalContext";

type Tab = "movies" | "tvshows" | "search" | "devspick" | "watchlist";

export default function AppShell() {
  /* -------------------------------------------------
     ACTIVE TAB (PERSISTED)
  -------------------------------------------------- */
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const stored = localStorage.getItem("activeTab");
    return (stored as Tab) ?? "movies";
  });

  const persistTab = (tab: Tab) => {
    setActiveTab(tab);
    localStorage.setItem("activeTab", tab);
  };

  /* -------------------------------------------------
     MODAL STATE
  -------------------------------------------------- */
  const { activeModal, selectedItem, openContent, close, goBackContent } =
    useModalManager();

  /* -------------------------------------------------
     STANDALONE DETECTION
  -------------------------------------------------- */
  const isStandalone = useMemo(() => {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );
  }, []);

  /* -------------------------------------------------
     TAB CONTENT
  -------------------------------------------------- */
  const renderContent = () => {
    switch (activeTab) {
      case "movies":
        return <Movies onSelect={openContent} />;

      case "tvshows":
        return <Shows onSelect={openContent} />;

      case "devspick":
        return <DevsPick onSelect={openContent} />;

      case "watchlist":
        return <Watchlist onSelect={openContent} />;

      case "search":
        return (
          <div className="flex flex-1 items-center justify-center px-4">
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
          className="flex-1 min-h-0 overflow-y-auto"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>

      {/* -------------------------------------------------
         MODALS
      -------------------------------------------------- */}
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
