"use client";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import AppShell from "@/AppShell";
import WatchPage from "@/routes/WatchPage";

const isAndroidWrapper =
  typeof window !== "undefined" &&
  window.location.hostname === "appassets.androidplatform.net";

export default function App() {
  return (
    <BrowserRouter basename={isAndroidWrapper ? "/assets/" : "/"}>
      <Routes>
        <Route path="/" element={<AppShell />} />

        <Route
          path="/watch/tv/:tmdbId/:season/:episode"
          element={<WatchPage />}
        />

        <Route path="/watch/movie/:tmdbId" element={<WatchPage />} />
      </Routes>
    </BrowserRouter>
  );
}
