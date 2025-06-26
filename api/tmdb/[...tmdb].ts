import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

const TMDB_API = "https://api.themoviedb.org/3";
const API_KEY = process.env.TMDB_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!API_KEY) {
    return res.status(500).json({ error: "Missing TMDB API key" });
  }

  const tmdbPath = Array.isArray(req.query.tmdb)
    ? req.query.tmdb.join("/")
    : req.query.tmdb;

  if (!tmdbPath) {
    return res.status(400).json({ error: "Missing TMDB path" });
  }

  const query = req.url?.split("?")[1] ?? "";
  const separator = query ? "&" : "";
  const url = `${TMDB_API}/${tmdbPath}?${query}${separator}api_key=${API_KEY}`;

  try {
    const response = await axios.get(url);
    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error("❌ TMDB proxy failed:", error.message);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message,
    });
  }
}
