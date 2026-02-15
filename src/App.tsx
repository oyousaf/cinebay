"use client";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import AppShell from "@/AppShell";
import WatchPage from "@/routes/WatchPage";

export default function App() {
  return (
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
  );
}
