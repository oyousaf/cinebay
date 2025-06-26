import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

const TMDB_API = "https://api.themoviedb.org/3";
const API_KEY = process.env.TMDB_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!API_KEY) {
    return res.status(500).json({ error: "Missing TMDB API key" });
  }

  const pathSegments = req.query.tmdb;
  const tmdbPath = Array.isArray(pathSegments)
    ? pathSegments.join("/")
    : pathSegments;

  if (!tmdbPath) {
    return res.status(400).json({ error: "Missing TMDB path" });
  }

  const query = req.url?.split("?")[1] ?? "";
  const apiUrl = `${TMDB_API}/${tmdbPath}?${query}${
    query ? "&" : ""
  }api_key=${API_KEY}`;

  try {
    const { data } = await axios.get(apiUrl);
    res.status(200).json(data);
  } catch (err: any) {
    console.error("❌ TMDB proxy error:", err.message);
    res.status(err.response?.status || 500).json({
      error: err.message,
      detail: err.response?.data,
    });
  }
}
