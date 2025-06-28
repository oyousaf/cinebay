import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 Enable CORS for Vercel frontend
app.use(
  cors({
    origin: ["https://cinebayy.vercel.app"],
    credentials: true,
  })
);

app.use(express.json());

app.get("/api/tmdb/search/multi", async (req, res) => {
  const query = req.query;

  try {
    const response = await axios.get(
      "https://api.themoviedb.org/3/search/multi",
      {
        params: { api_key: process.env.TMDB_API_KEY, ...query },
      }
    );
    res.json(response.data);
  } catch (err) {
    console.error("❌ /search/multi failed:", err);
    res.status(500).json({ error: "TMDB multi-search failed" });
  }
});

// 🔁 Proxy TMDB requests
app.get("/api/tmdb/:category/:id?", async (req, res) => {
  const { category, id } = req.params;
  const query = req.query;
  const endpoint = id
    ? `https://api.themoviedb.org/3/${category}/${id}`
    : `https://api.themoviedb.org/3/${category}`;

  try {
    const response = await axios.get(endpoint, {
      params: { api_key: process.env.TMDB_API_KEY, ...query },
    });
    res.json(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "TMDB fetch failed" });
  }
});

app.get("/api/hello", (req, res) => {
  res.json({ message: "Backend active!" });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
