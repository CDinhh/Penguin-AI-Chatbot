import React, { useState, useRef, useEffect } from 'react';

export function ChatPanel({
    messages,
    onSendMessage,
    isLoading,
    assistantState,
    selectedModel,
    onModelChange,
    customApiKey,
    onCustomApiKeyChange,
    isCollapsed,
    onToggle,
    onManualReload,
}) {
    const [inputValue, setInputValue] = useState('');
    const chatLogRef = useRef(null);

    useEffect(() => {
        if (chatLogRef.current) {
            chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (inputValue.trim() && !isLoading) {
            onSendMessage?.(inputValue);
            setInputValue('');
        }
    };

    return (
        <>
            <button
                className={`edge-toggle-btn chat-toggle`}
                onClick={onToggle}
                title={isCollapsed ? 'Mở khung chat' : 'Ẩn khung chat'}
                aria-label={isCollapsed ? 'Mở khung chat' : 'Ẩn khung chat'}
            >
                {isCollapsed ? '<' : '>'}
            </button>

            <div className={`chat-shell ${isCollapsed ? 'is-collapsed' : ''}`}>
                <div className="panel-header">
                    <span className="eyebrow">Trò Chuyện</span>
                    <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, color: '#1E40AF' }}>Tổng tài</span>
                        <span
                            style={{
                                display: 'inline-block',
                                width: '12px',
                                height: '12px',
                                background: '#10b981',
                                borderRadius: '50%',
                                boxShadow: '0 0 12px rgba(16, 185, 129, 0.8), inset 0 1px 3px rgba(255,255,255,0.3)',
                                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                            }}
                        ></span>
                    </div>
                    <div className="panel-subtitle" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <span>Sếp luôn ở đây lắng nghe và hỗ trợ em giải quyết mọi vấn đề.</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '12px', alignItems: 'center', width: '100%' }}>
                            <span style={{ fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mô hình:</span>
                            <select
                                value={selectedModel}
                                onChange={(e) => onModelChange?.(e.target.value)}
                            >
                                <optgroup label="Khuyên dùng">
                                    <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite Preview (mặc định)</option>
                                    <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                                    <option value="gemma-3-27b-it">Gemma 3 27B IT (dự phòng quota cao)</option>
                                </optgroup>
                            </select>
                            <span style={{ fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Google AI Studio Key:</span>
                            <input
                                type="password"
                                placeholder="nếu key default hết token"
                                value={customApiKey}
                                onChange={(e) => onCustomApiKeyChange?.(e.target.value)}
                                style={{
                                    background: '#ffffff',
                                    color: '#1f2937',
                                    border: '1.5px solid #e5e7eb',
                                    padding: '10px 12px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    outline: 'none',
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    boxShadow: '0 2px 6px rgba(31, 38, 135, 0.08)',
                                    fontWeight: 500,
                                    transition: 'all 0.2s ease',
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#3b82f6';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e5e7eb';
                                    e.target.style.boxShadow = '0 2px 6px rgba(31, 38, 135, 0.08)';
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingBottom: '12px', borderBottom: '1.5px solid rgba(59, 130, 246, 0.12)' }}>
                    <div className="assistant-state" style={{ flex: 1 }}>
                        {assistantState}
                    </div>
                    <button
                        onClick={onManualReload}
                        className="reload-btn"
                        title="Tự gọi lại Sếp"
                    >
                        ↻
                    </button>
                </div>

                <div className="chat-log" ref={chatLogRef}>
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`chat-row ${msg.role}`}>
                            <div className="chat-bubble">
                                {msg.text}
                                {msg.usage && (
                                    <span className="usage-badge">
                                        Tokens: {msg.usage.total} (Prompt: {msg.usage.prompt}, Answer: {msg.usage.candidates})
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="chat-row thinking" id="thinkingMessage">
                            <div className="chat-bubble">
                                Đang trả lời - sẽ mất thời gian do api free =)) <span className="thinking-dots"><span></span><span></span><span></span></span>
                            </div>
                        </div>
                    )}
                </div>

                <form className="chat-composer" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Nhập tin nhắn..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        disabled={isLoading}
                        autoComplete="off"
                        maxLength="1000"
                    />
                    <button type="submit" disabled={isLoading} aria-label="Gửi">
                        <svg viewBox="0 0 24 24">
                            <path
                                d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                            />
                        </svg>
                    </button>
                </form>
            </div>
        </>
    );
}
