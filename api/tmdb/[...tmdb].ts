import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

const TMDB_API = "https://api.themoviedb.org/3";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const TMDB_KEY = process.env.TMDB_KEY;
  if (!TMDB_KEY) return res.status(500).json({ error: "Missing TMDB API key" });

  const tmdbPath = req.url?.replace(/^\/api\/tmdb\//, "").split("?")[0] || "";
  const query = req.url?.split("?")[1] || "";
  const url = `${TMDB_API}/${tmdbPath}?${query}${
    query ? "&" : ""
  }api_key=${TMDB_KEY}`;

  try {
    const { data } = await axios.get(url);
    res.status(200).json(data);
  } catch (err: any) {
    console.error("❌ TMDB Proxy Error:", err.message);
    res.status(err.response?.status || 500).json({ error: err.message });
  }
}
