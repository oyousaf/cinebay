import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import App from "./App";
import { WatchlistProvider } from "@/context/WatchlistContext";
import { NavigationProvider } from "@/hooks/useNavigation";
import { TooltipProvider } from "./context/TooltipContext";
import { ModalManagerProvider } from "@/context/ModalContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WatchlistProvider>
      <TooltipProvider>
        <NavigationProvider>
          <ModalManagerProvider>
            <App />
          </ModalManagerProvider>
        </NavigationProvider>
      </TooltipProvider>
    </WatchlistProvider>
  </StrictMode>
);
