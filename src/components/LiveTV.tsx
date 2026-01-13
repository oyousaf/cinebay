"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import type { LiveChannel } from "@/lib/livetv/types";

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

        if (!res.ok) {
          throw new Error("Failed to load channels");
        }

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
    return <div className="p-4 text-sm opacity-70">Loading live channels…</div>;
  }

  if (!channels.length) {
    return (
      <div className="p-4 text-sm opacity-70">No live sources available</div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {groups.map((group) => {
        const items = channels.filter((c) => c.category === group);
        if (!items.length) return null;

        return (
          <section key={group}>
            <h2 className="mb-3 text-lg font-semibold capitalize">{group}</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((ch) => (
                <motion.button
                  key={`${ch.provider}:${ch.id}`}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleWatch(ch)}
                  className="rounded-xl bg-neutral-900 hover:bg-neutral-800 p-4 text-left transition"
                >
                  <p className="font-medium">{ch.name}</p>
                  <p className="text-xs opacity-60 mt-1">{ch.provider}</p>
                </motion.button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
