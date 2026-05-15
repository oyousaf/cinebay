import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig(() => {
  return {
    base: "/",

    plugins: [
      tailwindcss(),

      react(),

      VitePWA({
        registerType: "autoUpdate",

        injectRegister: "auto",

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
          scope: "/",

          display: "standalone",
          orientation: "any",

          lang: "en-GB",
          dir: "ltr",

          categories: ["entertainment", "streaming", "media"],

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
          ],
        },

        workbox: {
          skipWaiting: true,

          clientsClaim: true,

          cleanupOutdatedCaches: true,

          navigateFallback: "/index.html",

          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,

          globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,json}"],

          runtimeCaching: [
            {
              urlPattern: /^https:\/\/image\.tmdb\.org\/.*/i,

              handler: "CacheFirst",

              options: {
                cacheName: "tmdb-images",

                expiration: {
                  maxEntries: 300,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },

                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },

            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,

              handler: "CacheFirst",

              options: {
                cacheName: "gstatic-fonts",

                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },

                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },

            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,

              handler: "StaleWhileRevalidate",

              options: {
                cacheName: "google-fonts",

                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },

            {
              urlPattern: /\/api\/.*/i,

              handler: "NetworkFirst",

              options: {
                cacheName: "api-cache",

                networkTimeoutSeconds: 5,

                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 5,
                },

                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },

        devOptions: {
          enabled: false,
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
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
          secure: false,
        },
      },
    },

    build: {
      target: "esnext",

      sourcemap: false,

      cssCodeSplit: true,

      chunkSizeWarningLimit: 1000,

      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom"],

            router: ["react-router-dom"],

            motion: ["framer-motion"],

            player: ["hls.js", "react-player", "vidstack", "maverick.js"],
          },
        },
      },
    },

    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "framer-motion",
        "hls.js",
      ],
    },
  };
});
