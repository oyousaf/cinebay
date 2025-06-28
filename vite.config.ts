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
      includeAssets: ["favicon.svg", "robots.txt", "apple-touch-icon.png"],
      manifest: {
        name: "CineBay",
        short_name: "CineBay",
        theme_color: "#80FFCC",
        background_color: "#80FFCC",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-1024.png",
            sizes: "1024x1024",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        navigateFallback: "/offline.html",
        navigateFallbackAllowlist: [/^\/$/, /^\/watchlist/],
        runtimeCaching: [
          // TMDB API
          {
            urlPattern: /^https:\/\/api\.themoviedb\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "tmdb-api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 86400,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // TMDB popular/top_rated with background sync
          {
            urlPattern:
              /^https:\/\/api\.themoviedb\.org\/3\/movie\/(popular|top_rated)/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "tmdb-popular",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 86400,
              },
              backgroundSync: {
                name: "tmdb-popular-queue",
                options: {
                  maxRetentionTime: 24 * 60, // 24 hours
                },
              },
            },
          },
          // VIDSRC API
          {
            urlPattern: /^https:\/\/vidsrc\.me\/api\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "vidsrc-api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 86400,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // TMDB Images
          {
            urlPattern: /^https:\/\/image\.tmdb\.org\/t\/p\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "tmdb-image-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 604800, // 7 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
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
