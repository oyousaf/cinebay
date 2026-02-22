"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
import { useNavigation } from "@/context/NavigationContext";

export default function AppShell() {
  const { activeTab, setActiveTab } = useNavigation();

  const {
    activeModal,
    selectedItem,
    openContent,
    openExit,
    close,
    goBackContent,
  } = useModalManager();

  const isModalOpen = Boolean(activeModal);

  /* ----------------------------------
     Standalone detection (stable)
  ---------------------------------- */
  const [isStandalone] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );
  });

  /* ----------------------------------
     History Sync
  ---------------------------------- */
  const historyReadyRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!historyReadyRef.current) {
      window.history.replaceState({ tab: activeTab, modal: activeModal }, "");
      historyReadyRef.current = true;
      return;
    }

    // Push new state whenever navigation changes
    window.history.pushState({ tab: activeTab, modal: activeModal }, "");
  }, [activeTab, activeModal]);

  /* ----------------------------------
     Back Manager
  ---------------------------------- */
  const stateRef = useRef({
    activeTab,
    isModalOpen,
  });

  useEffect(() => {
    stateRef.current = {
      activeTab,
      isModalOpen,
    };
  }, [activeTab, isModalOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      const { activeTab, isModalOpen } = stateRef.current;

      if (isModalOpen) {
        close();
        return;
      }

      if (activeTab !== "movies") {
        setActiveTab("movies");
        return;
      }

      openExit();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [setActiveTab, openExit, close]);

  /* ----------------------------------
     Escape key (desktop behaviour)
  ---------------------------------- */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      if (isModalOpen) return;

      if (activeTab !== "movies") {
        setActiveTab("movies");
        return;
      }

      openExit();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeTab, isModalOpen, setActiveTab, openExit]);

  /* ----------------------------------
     Memoised tab content
  ---------------------------------- */
  const content = useMemo(() => {
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
          <div className="px-4 pt-24 flex justify-center">
            <SearchBar
              onSelectMovie={openContent}
              onSelectPerson={openContent}
              isModalOpen={isModalOpen}
            />
          </div>
        );

      default:
        return null;
    }
  }, [activeTab, openContent, isModalOpen]);

  /* ----------------------------------
     Render
  ---------------------------------- */
  return (
    <Layout isModalOpen={isModalOpen}>
      <Toaster richColors position="bottom-center" theme="dark" />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex-1 min-h-0"
        >
          {content}
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

      {/* Exit Modal */}
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
