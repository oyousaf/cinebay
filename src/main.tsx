import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { WatchlistProvider } from "@/context/WatchlistContext";
import { NavigationProvider } from "@/hooks/useNavigation";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WatchlistProvider>
      <NavigationProvider>
        <App />
      </NavigationProvider>
    </WatchlistProvider>
  </StrictMode>
);
