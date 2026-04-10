import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const port = Number(process.env.TTS_PORT || 8002);

// API Constants
const VCLIP_API_KEY = process.env.VCLIP_API_KEY || 'sk_live_WgXsYX3onTjXePo6fd62xVZsYh2ZRLk9';
const VCLIP_VOICE_ID = process.env.VCLIP_VOICE_ID || '8VXsCLxU7Pn55ADXQc6sAb';
const API_URL = 'https://api-tts.vclip.io/json-rpc';

const ttsCache = new Map();
const MAX_CACHE_ITEMS = 200;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

const getCacheKey = ({ text, speed }) => `${VCLIP_VOICE_ID}::${speed}::${text}`;

const setCache = (cacheKey, value) => {
  if (ttsCache.size >= MAX_CACHE_ITEMS) {
    const firstKey = ttsCache.keys().next().value;
    if (firstKey) {
      ttsCache.delete(firstKey);
    }
  }
  ttsCache.set(cacheKey, value);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createAudioJob = async (text, speed) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VCLIP_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      method: "ttsLongText",
      input: {
        text: text,
        userVoiceId: VCLIP_VOICE_ID,
        speed: Number(speed) || 1.0
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status} when creating audio job`);
  }
  
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'API Error createAudioJob');
  }
  return data.result.projectExportId;
};

const getAudioStatus = async (projectExportId) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VCLIP_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      method: "getExportStatus",
      input: {
        projectExportId
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status} when getting audio status`);
  }
  
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'API Error getAudioStatus');
  }
  return data.result;
};

const synthesizeWithVclip = async ({ text, speed }) => {
  const cacheKey = getCacheKey({ text, speed });
  const cachedItem = ttsCache.get(cacheKey);
  if (cachedItem) {
    console.log(`[tts] cache hit vclip`);
    return cachedItem;
  }

  const startedAt = Date.now();
  const projectExportId = await createAudioJob(text, speed);
  console.log(`[tts] vclip job created: ${projectExportId}`);

  let audioUrl = null;
  while (true) {
    const status = await getAudioStatus(projectExportId);
    
    if (status.state === 'completed') {
      // Find URL from result
      audioUrl = status.url || status.exportUrl || status.audioUrl;
      console.log(`[tts] vclip generation completed. URL: ${audioUrl}`);
      break;
    }
    
    if (status.state === 'failed' || status.state === 'error') {
      throw new Error(`Vclip TTS generation failed with state: ${status.state}`);
    }
    
    await sleep(2500); // Polling every 2.5 seconds
  }

  if (!audioUrl) {
    throw new Error('Vclip TTS generation completed but no URL was found in response');
  }

  // Fetch the audio buffer from the URL and convert to base64
  console.log(`[tts] fetching audio from generated URL...`);
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to fetch audio from generated URL: ${audioResponse.statusText}`);
  }
  
  const arrayBuffer = await audioResponse.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);
  
  console.log(`[tts] vclip buffered in ${Date.now() - startedAt}ms`);

  const payload = {
    audioBase64: audioBuffer.toString('base64'),
    mimeType: 'audio/mpeg', // standard MP3 format or webm depending on what Vclip returns
    voice: VCLIP_VOICE_ID,
    provider: 'vclip',
  };
  setCache(cacheKey, payload);
  return payload;
};

app.get(['/health', '/api/tts/health', '/tts/health', '/api/tts', '/tts', '/'], (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'tts',
    provider: 'vclip',
    defaultVoice: VCLIP_VOICE_ID,
  });
});

app.post(['/tts', '/api/tts', '/'], async (req, res) => {
  const text = String(req.body?.text || '').trim();
  const speed = Number(req.body?.speed || 1);

  if (!text) {
    return res.status(400).json({
      ok: false,
      error: 'text is required',
    });
  }

  try {
    const payload = await synthesizeWithVclip({ text, speed });

    return res.status(200).json({
      ok: true,
      ...payload,
    });
  } catch (error) {
    console.error('TTS error:', error);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to synthesize speech',
    });
  }
});

if (process.env.NODE_ENV !== 'production' || process.argv.length > 2) {
  app.listen(port, () => {
    console.log(`TTS server (vclip) running at http://127.0.0.1:${port}`);
  });
}

export default app;
