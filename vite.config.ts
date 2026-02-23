import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  base: "/",

  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: "autoUpdate",

      includeAssets: [
        "favicon.ico",
        "favicon-16x16.png",
        "favicon-32x32.png",
        "apple-touch-icon.png",
        "robots.txt",
      ],

      manifest: {
        name: "CineBay",
        short_name: "CineBay",
        description:
          "CineBay — your personal vault for great films, fresh shows, and cult classics.",
        theme_color: "#80FFCC",
        background_color: "#80FFCC",
        start_url: "/",
        display: "fullscreen",
        orientation: "any",
        lang: "en-GB",
        dir: "ltr",
        categories: ["entertainment", "streaming", "media"],
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },

      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: "/index.html",
      },
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
