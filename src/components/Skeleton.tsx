"use client";

import { motion } from "framer-motion";

type SkeletonVariant = "rail" | "watchlist";

interface SkeletonProps {
  variant?: SkeletonVariant;
}

export default function Skeleton({ variant = "rail" }: SkeletonProps) {
  /* =================================================
     WATCHLIST
  ================================================== */
  if (variant === "watchlist") {
    return (
      <div className="min-h-screen w-full px-4 py-10">
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4">
          {Array.from({ length: 21 }).map((_, i) => (
            <div
              key={i}
              className="aspect-2/3 rounded-xl"
              style={{ background: "hsl(var(--foreground) / 0.12)" }}
            />
          ))}
        </div>
      </div>
    );
  }

  /* =================================================
     RAIL
  ================================================== */
  return (
    <section className="relative w-full min-h-[90vh] sm:h-screen overflow-hidden">
      {/* Base background */}
      <div
        className="absolute inset-0"
        style={{ background: "hsl(var(--background))" }}
      />

      {/* Ambient gradient sweep */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              60% 40% at 20% 80%,
              hsl(var(--foreground) / 0.10),
              transparent 60%
            )
          `,
        }}
        animate={{
          x: ["-10%", "10%", "-10%"],
          opacity: [0.6, 0.9, 0.6],
        }}
        transition={{
          duration: 6,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />

      {/* Secondary light pass */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              120deg,
              transparent 30%,
              hsl(var(--foreground) / 0.08),
              transparent 70%
            )
          `,
        }}
        animate={{ x: ["-100%", "100%"] }}
        transition={{
          duration: 8,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />

      {/* Bottom spacing to match real layout */}
      <div className="absolute bottom-0 left-0 right-0 h-40" />
    </section>
  );
}
