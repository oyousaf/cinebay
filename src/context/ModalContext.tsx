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

  // ✅ Scroll lock when modal open
  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [activeModal]);

  // ✅ Open content modal
  const openContent = useCallback(
    (movie: Movie) => {
      if (selectedItem && selectedItem.id !== movie.id) {
        historyStack.current.push(selectedItem);
      }
      setSelectedItem(movie);
      setActiveModal("content");
      window.history.pushState({ modal: "content" }, "");
    },
    [selectedItem]
  );

  // ✅ Open player modal
  const openPlayer = useCallback((url: string) => {
    setPlayerUrl(url);
    setActiveModal("player");
    window.history.pushState({ modal: "player" }, "");
  }, []);

  // ✅ Open exit modal
  const openExit = useCallback(() => {
    setActiveModal("exit");
    window.history.pushState({ modal: "exit" }, "");
  }, []);

  // ✅ Go back in content history
  const goBackContent = useCallback(() => {
    const last = historyStack.current.pop();
    if (last) {
      setSelectedItem(last);
    } else {
      close();
    }
  }, []);

  // ✅ Close modal
  const close = useCallback(() => {
    setActiveModal(null);
    setSelectedItem(null);
    setPlayerUrl(null);
    if (window.history.state?.modal) {
      window.history.back();
    }
  }, []);

  // ✅ Global back/escape handling
  useEffect(() => {
    const onPopState = () => {
      if (activeModal === "content" && historyStack.current.length > 0) {
        goBackContent();
      } else {
        close();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (activeModal === "content") {
        if (e.key === "Escape") {
          e.preventDefault();
          close();
        } else if (e.key === "ArrowLeft" && historyStack.current.length > 0) {
          e.preventDefault();
          goBackContent();
        }
      } else if (activeModal === "player") {
        if (e.key === "Escape") {
          e.preventDefault();
          close();
        }
      } else if (!activeModal && e.key === "Escape") {
        e.preventDefault();
        openExit();
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
