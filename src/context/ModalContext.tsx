import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import type { Movie } from "@/types/movie";
import { useNavigation } from "@/hooks/useNavigation";

type ModalType = "content" | "player" | "exit" | null;

interface ModalContextValue {
  activeModal: ModalType;
  selectedItem: Movie | null;
  playerUrl: string | null;
  openContent: (movie: Movie) => void;
  openPlayer: (url: string) => void;
  openExit: () => void;
  goBackContent: () => void;
  close: () => void;
}

const ModalManagerContext = createContext<ModalContextValue | null>(null);

export function ModalManagerProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedItem, setSelectedItem] = useState<Movie | null>(null);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);

  const historyStack = useRef<Movie[]>([]);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  // Optional navigation sync
  const { setModalOpen } = useNavigation?.() ?? { setModalOpen: () => {} };

  /* ---------- Scroll lock & focus sync ---------- */
  useEffect(() => {
    document.body.style.overflow = activeModal ? "hidden" : "";
    setModalOpen?.(!!activeModal);

    if (activeModal) {
      lastFocusedElement.current = document.activeElement as HTMLElement;
      const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    } else {
      lastFocusedElement.current?.focus();
    }
  }, [activeModal, setModalOpen]);

  /* ---------- Focus trap ---------- */
  useEffect(() => {
    if (!activeModal) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleTab);
    return () => window.removeEventListener("keydown", handleTab);
  }, [activeModal]);

  /* ---------- Modal controls ---------- */
  const openContent = useCallback(
    (movie: Movie) => {
      if (selectedItem && selectedItem.id !== movie.id) {
        historyStack.current.push(selectedItem);
      }
      setSelectedItem(movie);
      setActiveModal("content");
    },
    [selectedItem]
  );

  const openPlayer = useCallback((url: string) => {
    setPlayerUrl(url);
    setActiveModal("player");
  }, []);

  const openExit = useCallback(() => setActiveModal("exit"), []);

  const close = useCallback(() => {
    setActiveModal(null);
    setSelectedItem(null);
    setPlayerUrl(null);
  }, []);

  const goBackContent = useCallback(() => {
    const last = historyStack.current.pop();
    if (last) setSelectedItem(last);
    else close();
  }, [close]);

  /* ---------- Back / Escape / Remote Handling ---------- */
  useEffect(() => {
    if (!window.history.state) {
      window.history.pushState({ cinebay: "root" }, "", window.location.href);
    }

    const handleBack = () => {
      if (activeModal === "player") close();
      else if (activeModal === "content") {
        if (historyStack.current.length > 0) goBackContent();
        else close();
      } else if (activeModal === "exit") close();
      else openExit();
    };

    const onPopState = (e: PopStateEvent) => {
      e.preventDefault();
      handleBack();
      window.history.pushState({ cinebay: "active" }, "");
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleBack();
      }
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeModal, goBackContent, close, openExit]);

  /* ---------- Favicon Restore Fix ---------- */
  useEffect(() => {
    const isTV = /Web0S|LG|Tizen/i.test(navigator.userAgent);
    if (isTV) return; // Skip on TV / PWA

    const restoreFavicon = () => {
      const existing = document.getElementById(
        "favicon-link"
      ) as HTMLLinkElement | null;
      if (existing) {
        existing.href = "/favicon-32x32.png";
      } else {
        const link = document.createElement("link");
        link.id = "favicon-link";
        link.rel = "icon";
        link.type = "image/png";
        link.href = "/favicon-32x32.png";
        document.head.appendChild(link);
      }
    };

    restoreFavicon();
    window.addEventListener("popstate", restoreFavicon);
    return () => window.removeEventListener("popstate", restoreFavicon);
  }, []);

  /* ---------- Render ---------- */
  return (
    <div ref={modalRef}>
      <ModalManagerContext.Provider
        value={{
          activeModal,
          selectedItem,
          playerUrl,
          openContent,
          openPlayer,
          openExit,
          goBackContent,
          close,
        }}
      >
        {children}
      </ModalManagerContext.Provider>
    </div>
  );
}

export function useModalManager() {
  const ctx = useContext(ModalManagerContext);
  if (!ctx) {
    throw new Error("useModalManager must be used within ModalManagerProvider");
  }
  return ctx;
}
