"use client";

import { motion } from "framer-motion";

type SkeletonVariant = "rail" | "watchlist";

interface SkeletonProps {
  variant?: SkeletonVariant;
}

export default function Skeleton({ variant = "rail" }: SkeletonProps) {
  /* =================================================
     WATCHLIST SKELETON
  ================================================== */
  if (variant === "watchlist") {
    return (
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen w-full"
      >
        {/* Title */}
        <div className="pt-10 pb-6 text-center">
          <div
            className="h-10 w-48 mx-auto rounded"
            style={{ background: "hsl(var(--foreground) / 0.12)" }}
          />
        </div>

        {/* Sticky filter bar placeholder */}
        <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-white/10 px-4 py-4">
          <div className="max-w-6xl mx-auto flex flex-wrap gap-3 justify-center">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-9 w-24 rounded-full"
                style={{
                  background: "hsl(var(--foreground) / 0.10)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4">
            {Array.from({ length: 21 }).map((_, i) => (
              <div
                key={i}
                className="aspect-2/3 rounded-xl"
                style={{
                  background: "hsl(var(--foreground) / 0.12)",
                }}
              />
            ))}
          </div>
        </div>
      </motion.main>
    );
  }

  /* =================================================
     DEFAULT RAIL SKELETON (Movies / Shows / DevsPick)
  ================================================== */
  return (
    <section className="relative w-full min-h-[90vh] sm:h-screen snap-start flex flex-col">
      {/* Banner */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{ background: "hsl(var(--background))" }}
      >
        <motion.div
          className="absolute inset-0"
          style={{ background: "hsl(var(--foreground) / 0.08)" }}
          animate={{ opacity: [0.35, 0.55, 0.35] }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div className="relative z-10 px-4 md:px-12 py-10 max-w-6xl mx-auto">
          <div
            className="h-10 w-2/3 rounded mb-4"
            style={{ background: "hsl(var(--foreground) / 0.18)" }}
          />
          <div
            className="h-4 w-full rounded mb-2"
            style={{ background: "hsl(var(--foreground) / 0.14)" }}
          />
          <div
            className="h-4 w-5/6 rounded mb-2"
            style={{ background: "hsl(var(--foreground) / 0.14)" }}
          />
          <div
            className="h-4 w-4/6 rounded"
            style={{ background: "hsl(var(--foreground) / 0.14)" }}
          />
        </div>
      </div>

      {/* Rail */}
      <div className="px-4 pb-4">
        <div className="flex gap-3 overflow-hidden py-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg"
              style={{
                height: "11rem",
                width: "8rem",
                background: "hsl(var(--foreground) / 0.12)",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
