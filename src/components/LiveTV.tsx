"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import {
  getAllLiveChannels,
  resolveLiveStream,
} from "@/lib/livetv/resolver";
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
        const list = await getAllLiveChannels();
        if (alive) setChannels(list);
      } catch {
        toast.error("Failed to load live channels");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const groups = Array.from(
    new Set(channels.map((c) => c.category))
  );

  async function handleWatch(ch: LiveChannel) {
    const res = await resolveLiveStream(ch.provider, ch.id);
    if (!res) {
      toast.info("Source temporarily unavailable");
      return;
    }
    onWatch(res.url);
  }

  if (loading) {
    return (
      <div className="p-4 text-sm opacity-70">
        Loading live channels…
      </div>
    );
  }

  if (!channels.length) {
    return (
      <div className="p-4 text-sm opacity-70">
        No live sources available
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {groups.map((group) => {
        const items = channels.filter((c) => c.category === group);
        if (!items.length) return null;

        return (
          <section key={group}>
            <h2 className="mb-3 text-lg font-semibold capitalize">
              {group}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((ch) => (
                <motion.button
                  key={`${ch.provider}:${ch.id}`}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleWatch(ch)}
                  className="rounded-xl bg-neutral-900 hover:bg-neutral-800 p-4 text-left transition"
                >
                  <p className="font-medium">
                    {ch.name}
                  </p>
                  <p className="text-xs opacity-60 mt-1">
                    {ch.provider}
                  </p>
                </motion.button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
