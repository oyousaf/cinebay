import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import AppShell from "@/AppShell";

const WatchPage = lazy(() => import("@/routes/WatchPage"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<AppShell />} />

          <Route
            path="/watch/tv/:tmdbId/:season/:episode"
            element={<WatchPage />}
          />

          <Route path="/watch/movie/:tmdbId" element={<WatchPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
