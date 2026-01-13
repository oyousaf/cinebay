"use client";

import { motion } from "framer-motion";

type Channel = {
  id: string;
  name: string;
  group: "Sports" | "General" | "News";
  url: string;
};

const CHANNELS: Channel[] = [
  {
    id: "daddy-sports-1",
    name: "Daddy Live Sports 1",
    group: "Sports",
    url: "https://example.com/stream.m3u8",
  },
  {
    id: "crew-sports",
    name: "The Crew Sports",
    group: "Sports",
    url: "https://example.com/stream.m3u8",
  },
  {
    id: "news-24",
    name: "24h News",
    group: "News",
    url: "https://example.com/stream.m3u8",
  },
];

export default function LiveTV({
  onWatch,
}: {
  onWatch: (url: string) => void;
}) {
  const groups = ["Sports", "General", "News"] as const;

  return (
    <div className="p-4 space-y-6">
      {groups.map((group) => {
        const items = CHANNELS.filter((c) => c.group === group);
        if (!items.length) return null;

        return (
          <div key={group}>
            <h2 className="mb-3 text-lg font-semibold text-white">{group}</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((channel) => (
                <motion.button
                  key={channel.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onWatch(channel.url)}
                  className="rounded-xl bg-neutral-900 hover:bg-neutral-800 p-4 text-left transition"
                >
                  <p className="font-medium text-white">{channel.name}</p>
                  <p className="text-xs opacity-60 mt-1">Live</p>
                </motion.button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
