import React from 'react';

export function SpeechBubble({ text, isThinking }) {
    const isVisible = text || isThinking;
    const clippedText = text && text.length > 180 ? `${text.slice(0, 177)}...` : text;

    return (
        <div
            className={`speech-bubble ${isVisible ? 'visible' : ''} ${isThinking ? 'thinking' : ''}`}
            role="status"
            aria-live="polite"
        >
            {isThinking ? (
                <div className="model-thinking">
                    <span className="model-thinking-label">Đang suy nghĩ</span>
                    <span className="thinking-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </span>
                </div>
            ) : (
                clippedText
            )}
        </div>
    );
}
