import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { type, id } = req.query;

  if (!type || !id) {
    return res.status(400).json({ error: 'Missing type or id' });
  }

  const embedUrl = `https://vidsrc.me/embed/${type}/${id}`;

  try {
    const html = await fetch(embedUrl).then((r) => r.text());
    const $ = cheerio.load(html);

    const scripts = $('script')
      .map((_, el) => $(el).html())
      .get();

    const candidate = scripts.find((s) => s?.includes('.m3u8') || s?.includes('.mp4'));
    const match = candidate?.match(/(https?:\/\/[^"'\\]+?\.(m3u8|mp4))/);
    const streamUrl = match?.[1];

    if (!streamUrl) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    return res.json({ url: streamUrl });
  } catch (err) {
    console.error('Scraping failed', err);
    return res.status(500).json({ error: 'Failed to scrape stream URL' });
  }
}
