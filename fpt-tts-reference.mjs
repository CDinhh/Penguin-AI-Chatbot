import 'dotenv/config';

export const FPT_API_URL = 'https://api.fpt.ai/hmi/tts/v5';
export const FPT_API_KEY = process.env.FPT_TTS_API_KEY || '';
export const FPT_DEFAULT_VOICE = process.env.FPT_TTS_VOICE || 'leminh';
export const FPT_DEFAULT_FORMAT = process.env.FPT_TTS_FORMAT || 'mp3';
export const FPT_POLL_INTERVAL_MS = Number(process.env.FPT_TTS_POLL_INTERVAL_MS || 1200);
export const FPT_POLL_TIMEOUT_MS = Number(process.env.FPT_TTS_POLL_TIMEOUT_MS || 90000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const resolveMimeType = (format) => {
  if (format === 'wav') {
    return 'audio/wav';
  }
  return 'audio/mpeg';
};

export const fetchFptAudioBuffer = async (asyncUrl) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < FPT_POLL_TIMEOUT_MS) {
    const response = await fetch(asyncUrl, {
      cache: 'no-store',
    });

    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    }

    await sleep(FPT_POLL_INTERVAL_MS);
  }

  throw new Error('FPT TTS timeout while waiting for audio file');
};

export const synthesizeWithFpt = async ({ text, voice, speed }, ttsCache, getCacheKey) => {
  if (!FPT_API_KEY) {
    throw new Error('Missing FPT_TTS_API_KEY in .env');
  }

  const cacheKey = getCacheKey ? getCacheKey({ text, voice, speed }) : `${voice}:${speed}:${text}`;
  if (ttsCache) {
    const cachedItem = ttsCache.get(cacheKey);
    if (cachedItem) {
      console.log(`[tts] cache hit fpt ${voice}`);
      return cachedItem;
    }
  }

  const startedAt = Date.now();
  const response = await fetch(FPT_API_URL, {
    method: 'POST',
    headers: {
      'api-key': FPT_API_KEY,
      'voice': voice || FPT_DEFAULT_VOICE,
      'speed': String(Math.round((speed || 1) - 1)),
      'format': FPT_DEFAULT_FORMAT,
      'Content-Type': 'text/plain; charset=utf-8',
    },
    body: text,
  });

  const payload = await response.json();
  if (!response.ok || payload.error !== 0 || !payload.async) {
    throw new Error(payload.message || 'FPT TTS request failed');
  }

  const audioBuffer = await fetchFptAudioBuffer(payload.async);
  console.log(`[tts] fpt buffered ${voice} in ${Date.now() - startedAt}ms`);

  const result = {
    audioBase64: audioBuffer.toString('base64'),
    mimeType: resolveMimeType(FPT_DEFAULT_FORMAT),
    voice: voice || FPT_DEFAULT_VOICE,
    provider: 'fpt',
  };
  
  if (ttsCache) {
    ttsCache.set(cacheKey, result);
  }
  
  return result;
};
