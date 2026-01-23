"use client";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "@/AppShell";
import WatchPage from "@/routes/WatchPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ---------- APP SHELL ---------- */}
        <Route path="/" element={<AppShell />} />

        {/* ---------- WATCH (ROUTE-BASED PLAYER) ---------- */}
        <Route
          path="/watch/:mediaType/:tmdbId/:season?/:episode?"
          element={<WatchPage />}
        />

        {/* ---------- FALLBACK ---------- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
