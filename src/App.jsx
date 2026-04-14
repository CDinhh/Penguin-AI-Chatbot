import React, { useState, useCallback, useRef, useEffect } from 'react';
import { VRMViewer } from './components/VRMViewer';
import { ControlsPanel } from './components/ControlsPanel';
import { ChatPanel } from './components/ChatPanel';
import { SpeechBubble } from './components/SpeechBubble';
import { useChatAPI } from './hooks/useChatAPI';
import { useTTSAudio } from './hooks/useTTSAudio';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import './App.css';

const ANIMATION_NAMES = [
    'Angry',
    'Blush',
    'Clapping',
    'Dancing',
    'Goodbye',
    'Jump',
    'LookAround',
    'Relax',
    'Sad',
    'Sleepy',
    'Surprised',
    'Thinking',
    'Show full body',
    'Greeting',
    'Peace sign',
    'Shoot',
    'Spin',
    'Model pose',
    'Squat',
];

export default function App() {
    const [vrmModel, setVrmModel] = useState('penguin.vrm');
    const [messages, setMessages] = useState([]);
    const [selectedModel, setSelectedModel] = useState('gemini-3.1-flash-lite-preview');
    const [customApiKey, setCustomApiKey] = useState('');
    const [status, setStatus] = useState('Đang chuẩn bị...');
    const [assistantState, setAssistantState] = useState('Đang đánh thức Tổng tài...');
    const [controlsCollapsed, setControlsCollapsed] = useState(false);
    const [chatCollapsed, setChatCollapsed] = useState(false);
    const [animations, setAnimations] = useState([]);
    const [selectedAnimation, setSelectedAnimation] = useState(null);
    const [activeAnimationIndex, setActiveAnimationIndex] = useState(null);
    const [pendingAnimationName, setPendingAnimationName] = useState(null);
    const [mouthOpen, setMouthOpen] = useState(0);
    const [speechBubbleText, setSpeechBubbleText] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [backgroundType, setBackgroundType] = useState('video');
    const hasAutoPlayedOnEntryRef = useRef(false);
    const hadBlushAutoPlayOnModelChangeRef = useRef(false);
    const shouldShowHdrToastRef = useRef(false);
    const wasBackgroundLoadingRef = useRef(false);
    const backgroundTypeRef = useRef(backgroundType);

    const { sendMessage, checkHealth, loading: chatLoading } = useChatAPI();
    const { speakText, speaking, updateLipSync } = useTTSAudio((value) => setMouthOpen(value));

    useEffect(() => {
        let cancelled = false;

        const initializeAssistant = async () => {
            try {
                await checkHealth();
                if (!cancelled) {
                    setAssistantState('Tổng tài đã sẵn sàng đợi lệnh.');
                }
            } catch (error) {
                if (!cancelled) {
                    setAssistantState('(Mất kết nối server) do server quá tải hoặc api free đã hết lượt.');
                }
            }
        };

        initializeAssistant();

        return () => {
            cancelled = true;
        };
    }, [checkHealth]);

    useEffect(() => {
        backgroundTypeRef.current = backgroundType;
    }, [backgroundType]);

    // Animation loop for lip sync
    useEffect(() => {
        if (!speaking) return;

        const interval = setInterval(() => {
            updateLipSync();
        }, 50);

        return () => clearInterval(interval);
    }, [speaking, updateLipSync]);

    const playAnimationByName = useCallback((animationName) => {
        if (!animationName) {
            return;
        }

        const index = ANIMATION_NAMES.findIndex(
            (name) => name.toLowerCase() === String(animationName).toLowerCase()
        );

        if (index < 0) {
            return;
        }

        const animation = animations?.[index];
        if (!animation?.clip) {
            setStatus(`Loading animation: ${ANIMATION_NAMES[index]}...`);
            setPendingAnimationName(animationName);
            return;
        }

        setSelectedAnimation({
            clip: animation.clip,
            name: animation.name || `anim-${index}`,
            playId: `${Date.now()}-${Math.random()}`,
        });
        setActiveAnimationIndex(index);
        setStatus(`Now Playing: ${ANIMATION_NAMES[index]}`);
        setPendingAnimationName(null);
    }, [animations]);

    useEffect(() => {
        if (!pendingAnimationName) {
            return;
        }

        playAnimationByName(pendingAnimationName);
    }, [pendingAnimationName, playAnimationByName]);

    useEffect(() => {
        if (hasAutoPlayedOnEntryRef.current) {
            return;
        }

        const hasAnyClip = Array.isArray(animations) && animations.some((item) => item?.clip);
        if (!hasAnyClip) {
            return;
        }

        playAnimationByName('Blush');
        hasAutoPlayedOnEntryRef.current = true;
    }, [animations, playAnimationByName]);

    // Reset auto-play flag and clear animation when model changes
    useEffect(() => {
        hadBlushAutoPlayOnModelChangeRef.current = false;
        setSelectedAnimation(null);
        setActiveAnimationIndex(null);
        setAnimations([]);
    }, [vrmModel]);

    // Auto-play Blush when switching model and new animations load if nothing is playing
    useEffect(() => {
        if (hadBlushAutoPlayOnModelChangeRef.current) {
            return;
        }

        const hasAnyClip = animations.some((item) => item?.clip);
        if (!hasAnyClip) {
            return;
        }

        if (!selectedAnimation?.clip) {
            playAnimationByName('Blush');
            hadBlushAutoPlayOnModelChangeRef.current = true;
        }
    }, [vrmModel, animations, selectedAnimation?.clip, playAnimationByName]);

    const handleSendMessage = useCallback(async (userMessage) => {
        if (!userMessage.trim()) return;

        // Add user message to chat
        setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
        setSpeechBubbleText('');
        setIsThinking(true);
        setAssistantState('Sếp đang suy nghĩ...');

        try {
            const response = await sendMessage(userMessage, selectedModel, customApiKey);

            setIsThinking(false);
            setAssistantState('Sếp đang chuẩn bị câu trả lời...');

            // Add assistant message to chat
            setMessages((prev) => [...prev, { role: 'assistant', text: response.reply, usage: response.usage }]);

            // Apply animation returned by backend (e.g. Clapping, Thinking...)
            playAnimationByName(response.animation);

            // Play TTS
            setSpeechBubbleText(response.reply);
            try {
                await speakText(response.reply);
            } catch (_ttsError) {
                // Keep chat usable even if TTS is temporarily unavailable.
            }

            setAssistantState('Sếp đã sẵn sàng');
            setSpeechBubbleText('');
        } catch (error) {
            console.error('Error:', error);
            setIsThinking(false);
            setAssistantState('Có lỗi xảy ra...');
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', text: `Lỗi: ${error.message}` },
            ]);
        }
    }, [sendMessage, selectedModel, customApiKey, speakText, playAnimationByName]);

    const handleManualReload = useCallback(async () => {
        try {
            await checkHealth();
            setAssistantState('Tổng tài đã sẵn sàng để nói chuyện nhảm.');
        } catch (error) {
            setAssistantState('(Mất kết nối server) do server quá tải hoặc api free đã hết lượt.');
        }
    }, [checkHealth]);

    const handleAnimationPlay = useCallback((animation, index) => {
        if (!animation?.clip) {
            return;
        }

        setSelectedAnimation({
            clip: animation.clip,
            name: animation.name || `anim-${index}`,
            playId: `${Date.now()}-${Math.random()}`,
        });
        setActiveAnimationIndex(index);
        setStatus(`Now Playing: ${ANIMATION_NAMES[index] || animation.name || 'Animation'}`);
    }, []);

    const handleBackgroundTypeChange = useCallback((nextBackgroundType) => {
        setBackgroundType((prevBackgroundType) => {
            if (nextBackgroundType === 'hdr' && prevBackgroundType !== 'hdr') {
                shouldShowHdrToastRef.current = true;
            } else if (nextBackgroundType !== 'hdr') {
                shouldShowHdrToastRef.current = false;
            }

            return nextBackgroundType;
        });
    }, []);

    const handleBackgroundLoadingChange = useCallback((isLoading) => {
        const wasLoading = wasBackgroundLoadingRef.current;

        if (wasLoading && !isLoading && backgroundTypeRef.current === 'hdr' && shouldShowHdrToastRef.current) {
            toast('Giữ chuột trái + di chuyển để xoay background 3D');
            shouldShowHdrToastRef.current = false;
        }

        wasBackgroundLoadingRef.current = isLoading;
    }, []);

    return (
        <div className="app-container">
            <VRMViewer
                vrmModel={vrmModel}
                onStatusChange={setStatus}
                onAnimationsLoaded={setAnimations}
                mouthOpen={mouthOpen}
                selectedAnimation={selectedAnimation}
                backgroundType={backgroundType}
                onBackgroundLoadingChange={handleBackgroundLoadingChange}
            />

            <SpeechBubble text={speechBubbleText} isThinking={isThinking} />

            <ControlsPanel
                vrmModel={vrmModel}
                onVrmChange={setVrmModel}
                animationNames={ANIMATION_NAMES}
                animations={animations}
                onAnimationPlay={handleAnimationPlay}
                activeAnimationIndex={activeAnimationIndex}
                status={status}
                isCollapsed={controlsCollapsed}
                onToggle={() => setControlsCollapsed(!controlsCollapsed)}
                backgroundType={backgroundType}
                onBackgroundTypeChange={handleBackgroundTypeChange}
            />

            <ChatPanel
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={chatLoading}
                assistantState={assistantState}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                customApiKey={customApiKey}
                onCustomApiKeyChange={setCustomApiKey}
                isCollapsed={chatCollapsed}
                onToggle={() => setChatCollapsed(!chatCollapsed)}
                onManualReload={handleManualReload}
            />

            <Toaster
                position="top-center"
                toastOptions={{
                    duration: 2800,
                    className: 'hdr-guide-toast',
                    style: {
                        whiteSpace: 'nowrap',
                        maxWidth: 'none',
                    },
                }}
            >
                {(t) => (
                    <ToastBar
                        toast={t}
                        style={{
                            ...t.style,
                            animation: t.visible
                                ? 'hdrToastPopIn 0.33s cubic-bezier(0.22, 1, 0.36, 1) forwards'
                                : 'hdrToastPopOut 0.2s ease-in forwards',
                        }}
                    />
                )}
            </Toaster>
        </div>
    );
}
