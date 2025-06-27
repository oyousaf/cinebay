import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());

app.get("/api/tmdb/*", async (req, res) => {
  const TMDB_KEY = process.env.TMDB_KEY;
  if (!TMDB_KEY) return res.status(500).json({ error: "Missing TMDB API key" });

  const tmdbPath = req.params[0];
  const query = req.url.split("?")[1] ?? "";
  const separator = query ? "&" : "";
  const url = `https://api.themoviedb.org/3/${tmdbPath}?${query}${separator}api_key=${TMDB_KEY}`;

  try {
    const { data } = await axios.get(url);
    res.status(200).json(data);
  } catch (err) {
    console.error("❌ Proxy error:", err.message);
    res.status(500).json({ error: "Failed to fetch from TMDB" });
  }
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
