import { Router } from "express";
import {
  getAllLiveChannels,
  resolveLiveStream,
} from "../../src/lib/livetv/resolver";

const router = Router();

router.get("/channels", async (_req, res) => {
  try {
    const channels = await getAllLiveChannels();
    res.json({ success: true, channels });
  } catch (err) {
    console.error("LiveTV channels error:", err);
    res.status(500).json({
      success: false,
      error: "FAILED_TO_LOAD_CHANNELS",
    });
  }
});

router.post("/resolve", async (req, res) => {
  try {
    const { provider, channelId } = req.body ?? {};

    if (!provider || !channelId) {
      return res.status(400).json({
        success: false,
        error: "INVALID_PAYLOAD",
      });
    }

    const stream = await resolveLiveStream(provider, channelId);

    if (!stream) {
      return res.status(404).json({
        success: false,
        error: "STREAM_UNAVAILABLE",
      });
    }

    res.json({ success: true, stream });
  } catch (err) {
    console.error("LiveTV resolve error:", err);
    res.status(500).json({
      success: false,
      error: "RESOLVE_FAILED",
    });
  }
});

export default router;
