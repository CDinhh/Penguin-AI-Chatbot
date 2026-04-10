import { useState, useCallback, useRef } from 'react';

const isProd = window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'localhost';
const TTS_API_URL = isProd ? '/api/tts' : 'http://127.0.0.1:8002/tts';

export function useTTSAudio(onLipSyncUpdate) {
    const [speaking, setSpeaking] = useState(false);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const currentAudioRef = useRef(null);
    const speechJobIdRef = useRef(0);

    const setupLipSync = useCallback((audio) => {
        if (!audio) return;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContextClass();
        }

        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().catch(() => { });
        }

        sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audio);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 512;
        analyserRef.current.smoothingTimeConstant = 0.72;
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

        sourceNodeRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
    }, []);

    const updateLipSync = useCallback(() => {
        if (!analyserRef.current || !dataArrayRef.current) {
            if (onLipSyncUpdate) onLipSyncUpdate(0);
            return;
        }

        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        let energy = 0;
        for (let i = 0; i < dataArrayRef.current.length; i += 1) {
            energy += dataArrayRef.current[i];
        }

        const average = energy / dataArrayRef.current.length / 255;
        const mouthTarget = Math.max(0, Math.min(1, (average - 0.04) * 3.2));
        if (onLipSyncUpdate) onLipSyncUpdate(mouthTarget);
    }, [onLipSyncUpdate]);

    const fetchTtsAudio = useCallback(async (text) => {
        const response = await fetch(TTS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                speed: 1,
                pitch: 1,
            }),
        });

        const payload = await response.json();
        if (!response.ok || !payload.ok || !payload.audioBase64) {
            throw new Error(payload.error || 'TTS is not available');
        }

        return payload;
    }, []);

    const playAudioFromPayload = useCallback((payload) => {
        return new Promise((resolve, reject) => {
            const audio = new Audio(
                `data:${payload.mimeType || 'audio/webm; codecs=opus'};base64,${payload.audioBase64}`
            );
            currentAudioRef.current = audio;
            setupLipSync(audio);

            const handleEnded = () => {
                setSpeaking(false);
                if (onLipSyncUpdate) onLipSyncUpdate(0);
                audio.removeEventListener('ended', handleEnded);
                audio.removeEventListener('error', handleError);
                resolve();
            };

            const handleError = () => {
                setSpeaking(false);
                if (onLipSyncUpdate) onLipSyncUpdate(0);
                audio.removeEventListener('ended', handleEnded);
                audio.removeEventListener('error', handleError);
                reject(new Error('Failed to play audio from TTS'));
            };

            audio.addEventListener('ended', handleEnded, { once: true });
            audio.addEventListener('error', handleError, { once: true });

            audio.play().catch(reject);
        });
    }, [setupLipSync, onLipSyncUpdate]);

    const speakText = useCallback(
        async (text) => {
            if (!text) return;

            const speechJobId = ++speechJobIdRef.current;
            setSpeaking(true);

            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current.src = '';
                currentAudioRef.current = null;
                if (onLipSyncUpdate) onLipSyncUpdate(0);
            }

            try {
                const payload = await fetchTtsAudio(text);
                if (speechJobId !== speechJobIdRef.current) return;

                await playAudioFromPayload(payload);
            } catch (error) {
                console.error('Error speaking text:', error);
                setSpeaking(false);
                throw error;
            }
        },
        [fetchTtsAudio, playAudioFromPayload, onLipSyncUpdate]
    );

    const stopSpeaking = useCallback(() => {
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.src = '';
            currentAudioRef.current = null;
        }
        setSpeaking(false);
        if (onLipSyncUpdate) onLipSyncUpdate(0);
    }, [onLipSyncUpdate]);

    return {
        speakText,
        stopSpeaking,
        speaking,
        updateLipSync,
    };
}
