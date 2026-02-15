"use client";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import AppShell from "@/AppShell";
import WatchPage from "@/routes/WatchPage";

import { NavigationProvider } from "@/context/NavigationContext";
import { ModalManagerProvider } from "@/context/ModalContext";
import { TooltipProvider } from "@/context/TooltipContext";

export default function App() {
  return (
    <NavigationProvider>
      <ModalManagerProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AppShell />} />

              <Route
                path="/watch/tv/:tmdbId/:season/:episode"
                element={<WatchPage />}
              />

              <Route path="/watch/movie/:tmdbId" element={<WatchPage />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ModalManagerProvider>
    </NavigationProvider>
  );
}
