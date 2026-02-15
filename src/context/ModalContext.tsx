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
import { useNavigation } from "@/context/NavigationContext";

type ModalType = "content" | "exit" | null;

interface ModalContextValue {
  activeModal: ModalType;
  selectedItem: Movie | null;

  openContent: (movie: Movie) => void;
  openExit: () => void;

  goBackContent: () => void;
  close: () => void;
}

const ModalManagerContext = createContext<ModalContextValue | null>(null);

export function ModalManagerProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedItem, setSelectedItem] = useState<Movie | null>(null);

  const historyStack = useRef<Movie[]>([]);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  const { setModalOpen } = useNavigation?.() ?? { setModalOpen: () => {} };

  /* ---------- Scroll lock & focus sync ---------- */
  useEffect(() => {
    document.body.style.overflow = activeModal ? "hidden" : "";
    setModalOpen?.(!!activeModal);

    if (activeModal) {
      lastFocusedElement.current = document.activeElement as HTMLElement;

      const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
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
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
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
    [selectedItem],
  );

  const openExit = useCallback(() => setActiveModal("exit"), []);

  const close = useCallback(() => {
    setActiveModal(null);
    setSelectedItem(null);
  }, []);

  const goBackContent = useCallback(() => {
    const last = historyStack.current.pop();
    if (last) setSelectedItem(last);
    else close();
  }, [close]);

  /* ---------- Escape (no popstate hijack) ---------- */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      if (activeModal === "content") {
        e.preventDefault();
        if (historyStack.current.length > 0) goBackContent();
        else close();
        return;
      }

      if (activeModal === "exit") {
        e.preventDefault();
        close();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeModal, goBackContent, close]);

  return (
    <div ref={modalRef}>
      <ModalManagerContext.Provider
        value={{
          activeModal,
          selectedItem,
          openContent,
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
