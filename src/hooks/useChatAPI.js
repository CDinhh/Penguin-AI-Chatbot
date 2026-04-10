import { useState, useCallback } from 'react';

const isProd = window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'localhost';
const CHAT_API_URL = isProd ? '/api/chat' : 'http://127.0.0.1:8001/chat';
const CHAT_HEALTH_URL = isProd ? '/api/chat/health' : 'http://127.0.0.1:8001/chat/health';

export function useChatAPI() {
    const [loading, setLoading] = useState(false);

    const checkHealth = useCallback(async () => {
        const response = await fetch(CHAT_HEALTH_URL, { method: 'GET' });
        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(data.error || 'Chat server is not ready');
        }

        return data;
    }, []);

    const sendMessage = useCallback(async (userMessage, selectedModel, customApiKey) => {
        setLoading(true);
        try {
            const response = await fetch(CHAT_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage,
                    model: selectedModel,
                    ...(customApiKey && { api_key: customApiKey }),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send message');
            }

            return {
                reply: data.reply || '',
                usage: data.usage || null,
                model: data.model || selectedModel,
                animation: data.animation || null,
            };
        } catch (error) {
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    return { sendMessage, checkHealth, loading };
}
