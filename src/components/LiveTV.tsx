"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import type { LiveChannel } from "@/lib/livetv/types";

const cardClass =
  "w-full max-w-sm rounded-2xl border p-5 text-left transition " +
  "bg-[hsl(var(--background))] border-[hsl(var(--foreground)/0.5)] " +
  "hover:bg-[hsl(var(--background)/0.85)] " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--foreground)/0.4)]";

export default function LiveTV({
  onWatch,
}: {
  onWatch: (url: string) => void;
}) {
  const [channels, setChannels] = useState<LiveChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch("http://localhost:5000/api/livetv/channels");
        if (!res.ok) throw new Error("Failed to load channels");

        const json = await res.json();
        if (alive) setChannels(json.channels ?? []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load live channels");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const groups = Array.from(new Set(channels.map((c) => c.category)));

  async function handleWatch(ch: LiveChannel) {
    try {
      const res = await fetch("http://localhost:5000/api/livetv/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: ch.provider,
          channelId: ch.id,
        }),
      });

      if (!res.ok) {
        toast.info("Source temporarily unavailable");
        return;
      }

      const json = await res.json();
      if (!json.stream?.url) {
        toast.info("Source temporarily unavailable");
        return;
      }

      onWatch(json.stream.url);
    } catch (err) {
      console.error(err);
      toast.error("Failed to resolve stream");
    }
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-sm opacity-60">Loading live events…</p>
      </div>
    );
  }

  if (!channels.length) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-sm opacity-60">No live sources available</p>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-5xl space-y-14">
        {groups.map((group) => {
          const items = channels.filter((c) => c.category === group);
          if (!items.length) return null;

          return (
            <section key={group} className="space-y-6">
              {/* Title */}
              <div className="flex flex-col items-center gap-2">
                <h2
                  className="
                    text-3xl md:text-4xl font-heading tracking-tight
                    text-[hsl(var(--foreground))]
                  "
                >
                  {group === "sports" ? "Live" : group}
                </h2>

                <div className="h-px w-16 bg-[hsl(var(--foreground)/0.4)]" />

              </div>

              {/* Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 place-items-center">
                {items.map((ch) => (
                  <motion.button
                    key={`${ch.provider}:${ch.id}`}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleWatch(ch)}
                    className={cardClass}
                  >
                    <div className="flex flex-col gap-2">
                      <p className="font-medium leading-snug">{ch.name}</p>

                      <div className="flex items-center justify-between text-xs opacity-60">
                        <span className="uppercase tracking-wide">
                          {ch.meta?.league ?? "Live"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full border border-[hsl(var(--foreground)/0.3)]">
                          {ch.provider}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
