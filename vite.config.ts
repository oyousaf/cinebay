import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  base: "./",

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
        start_url: "index.html",
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
        navigateFallback: "index.html",

        /* ⛔ Excluded from precache */
        globIgnores: [
          "**/mc.yandex.ru/**",
          "**/google-analytics.com/**",
          "**/googletagmanager.com/**",
        ],

        runtimeCaching: [
          /* 🎬 TMDB API */
          {
            urlPattern: /^https:\/\/api\.themoviedb\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "tmdb-api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          /* 📊 TMDB lists */
          {
            urlPattern:
              /^https:\/\/api\.themoviedb\.org\/3\/movie\/(popular|top_rated)/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "tmdb-popular",
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            },
          },

          /* 🖼️ TMDB Images */
          {
            urlPattern: /^https:\/\/image\.tmdb\.org\/t\/p\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "tmdb-image-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 604800 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          /* 🎥 Video embeds — never cache */
          {
            urlPattern: /^https:\/\/vid(src|link)\./i,
            handler: "NetworkOnly",
          },

          /* ⚙️ UI / modal chunks */
          {
            urlPattern: /\/assets\/.*Modal.*\.js$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "ui-modal-cache",
              expiration: { maxEntries: 5, maxAgeSeconds: 604800 },
            },
          },

          /* 📡 Analytics — always network */
          {
            urlPattern: /mc\.yandex\.ru/,
            handler: "NetworkOnly",
          },
        ],
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
