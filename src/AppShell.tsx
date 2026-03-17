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
  const { activeTab, setActiveTab, setModalOpen, setPlayHandler } =
    useNavigation();

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
     Sync modal state
  ---------------------------------- */
  useEffect(() => {
    setModalOpen(isModalOpen);
  }, [isModalOpen, setModalOpen]);

  useEffect(() => {
    if (!selectedItem) return;

    setPlayHandler(() => {
      sessionStorage.setItem("autoplay", "1");
      openContent(selectedItem);
    });

    return () => setPlayHandler(null);
  }, [selectedItem?.id]);

  /* ----------------------------------
     Standalone detection
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
  const lastStateRef = useRef<{ tab: string; modal: any } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const nextState = { tab: activeTab, modal: activeModal };

    if (!historyReadyRef.current) {
      window.history.replaceState(nextState, "");
      historyReadyRef.current = true;
      lastStateRef.current = nextState;
      return;
    }

    if (
      lastStateRef.current?.tab === nextState.tab &&
      lastStateRef.current?.modal === nextState.modal
    ) {
      return;
    }

    window.history.pushState(nextState, "");
    lastStateRef.current = nextState;
  }, [activeTab, activeModal]);

  /* ----------------------------------
     Back Manager
  ---------------------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = (e: PopStateEvent) => {
      const state = e.state as { tab?: string; modal?: string } | null;

      if (isModalOpen && state?.modal !== activeModal) {
        close();
        return;
      }

      if (state?.modal === "exit") {
        openExit();
        return;
      }

      if (state?.tab && state.tab !== activeTab) {
        setActiveTab(state.tab as any);
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
  }, [activeTab, activeModal, isModalOpen, setActiveTab, openExit, close]);

  /* ----------------------------------
     Escape key (desktop fallback)
  ---------------------------------- */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      if (isModalOpen) return;

      if (activeTab !== "movies") {
        setActiveTab("movies");
      } else {
        openExit();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeTab, isModalOpen, setActiveTab, openExit]);

  /* ----------------------------------
     Content
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
          transition={{ duration: 0.25 }}
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
