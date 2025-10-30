import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
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
        orientation: "landscape",
        lang: "en-GB",
        dir: "ltr",
        categories: ["entertainment", "streaming", "media"],

        icons: [
          {
            src: "/logo.png",
            sizes: "1024x1024",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],

        // 📱 Optional screenshots for store / PWA info
        screenshots: [
          {
            src: "/screenshot-desktop.png",
            sizes: "1280x720",
            type: "image/png",
            form_factor: "wide",
          },
          {
            src: "/screenshot-mobile.png",
            sizes: "720x1280",
            type: "image/png",
            form_factor: "narrow",
          },
        ],
      },

      /* ---------- ⚡ Workbox Caching Strategy ---------- */
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: "/",
        runtimeCaching: [
          // 🎬 TMDB API
          {
            urlPattern: /^https:\/\/api\.themoviedb\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "tmdb-api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // 📊 TMDB Lists (popular/top-rated)
          {
            urlPattern:
              /^https:\/\/api\.themoviedb\.org\/3\/movie\/(popular|top_rated)/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "tmdb-popular",
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
              backgroundSync: {
                name: "tmdb-popular-queue",
                options: { maxRetentionTime: 24 * 60 },
              },
            },
          },
          // 🎥 Video Embed
          {
            urlPattern: /^https:\/\/vidsrc\.to\/embed\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "vidsrc-embed-cache",
              expiration: { maxEntries: 20, maxAgeSeconds: 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // 🖼️ TMDB Images
          {
            urlPattern: /^https:\/\/image\.tmdb\.org\/t\/p\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "tmdb-image-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 604800 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // ⚙️ Modal / UI Bundles
          {
            urlPattern: /\/assets\/Modal.*\.js$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "modal-component-cache",
              expiration: { maxEntries: 5, maxAgeSeconds: 604800 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      /* ---------- 💻 Dev Mode ---------- */
      devOptions: {
        enabled: true,
        type: "module",
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
