"use client";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppShell from "@/AppShell";
import WatchPage from "@/routes/WatchPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />} />

        {/* TV */}
        <Route
          path="/watch/tv/:tmdbId/:season/:episode"
          element={<WatchPage />}
        />

        {/* MOVIE */}
        <Route path="/watch/movie/:tmdbId" element={<WatchPage />} />
      </Routes>
    </BrowserRouter>
  );
}
