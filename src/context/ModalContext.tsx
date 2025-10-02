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

  useEffect(() => {
    document.body.style.overflow = activeModal ? "hidden" : "";
  }, [activeModal]);

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

  const openExit = useCallback(() => {
    setActiveModal("exit");
  }, []);

  const goBackContent = useCallback(() => {
    const last = historyStack.current.pop();
    if (last) {
      setSelectedItem(last);
    } else {
      setSelectedItem(null);
      setActiveModal(null);
    }
  }, []);

  const close = useCallback(() => {
    setActiveModal(null);
    setSelectedItem(null);
    setPlayerUrl(null);
  }, []);

  // ✅ Unified Back/Escape handling
  useEffect(() => {
    const handleBack = () => {
      if (activeModal === "player") {
        close();
      } else if (activeModal === "content") {
        if (historyStack.current.length > 0) {
          goBackContent();
        } else {
          close();
        }
      } else if (activeModal === "exit") {
        close();
      } else {
        openExit();
      }
    };

    const onPopState = (e: PopStateEvent) => {
      e.preventDefault();
      handleBack();
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

  return (
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
  );
}

export function useModalManager() {
  const ctx = useContext(ModalManagerContext);
  if (!ctx) {
    throw new Error("useModalManager must be used within ModalManagerProvider");
  }
  return ctx;
}
