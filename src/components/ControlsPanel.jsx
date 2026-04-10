import React, { useState } from 'react';

export function ControlsPanel({
    vrmModel,
    onVrmChange,
    animationNames,
    animations,
    onAnimationPlay,
    status,
    isCollapsed,
    onToggle,
    backgroundType,
    onBackgroundTypeChange,
}) {
    const [activeAnimation, setActiveAnimation] = useState(null);

    const animationLabelMap = {
        'Show full body': 'Show',
        'Peace sign': 'Peace',
        'Model pose': 'Pose',
    };

    const formatAnimationLabel = (name) => animationLabelMap[name] || String(name).replace(/\s+/g, '');

    const handleAnimationClick = (index, animation) => {
        if (!animation?.clip) {
            return;
        }

        setActiveAnimation(index);
        onAnimationPlay?.(animation, index);
    };

    return (
        <>
            <button
                className={`edge-toggle-btn controls-toggle`}
                onClick={onToggle}
                title={isCollapsed ? 'Mở khung trái' : 'Ẩn khung trái'}
                aria-label={isCollapsed ? 'Mở khung trái' : 'Ẩn khung trái'}
            >
                {isCollapsed ? '>' : '<'}
            </button>

            <div className={`controls ${isCollapsed ? 'is-collapsed' : ''}`}>
                <div className="panel-header">
                    <span className="eyebrow">Tương Tác</span>
                    <div className="panel-title">Biểu Cảm & Hành Động</div>
                    <div className="panel-subtitle">Chọn một hành động để Tổng tài thể hiện ngay nhé.</div>
                </div>

                <div className="section">
                    <label>VRM Model</label>
                    <select
                        value={vrmModel}
                        onChange={(e) => onVrmChange?.(e.target.value)}
                    >
                        <option value="penguin.vrm">penguin.vrm</option>
                        <option value="frieren.vrm">frieren.vrm</option>
                        <option value="marin.vrm">marin.vrm</option>
                        <option value="reze.vrm">reze.vrm</option>
                    </select>
                </div>

                <div className="section">
                    <label>Background</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <button
                            onClick={() => onBackgroundTypeChange?.('video')}
                            style={{
                                padding: '11px 12px',
                                border: backgroundType === 'video' ? '1.5px solid #1E40AF' : '1.5px solid rgba(59, 130, 246, 0.4)',
                                borderRadius: '14px',
                                background: backgroundType === 'video' ? 'linear-gradient(135deg, #1E40AF 0%, #1e3a8a 100%)' : 'linear-gradient(135deg, transparent 0%, rgba(59, 130, 246, 0.02) 100%)',
                                color: backgroundType === 'video' ? '#ffffff' : '#3b82f6',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                fontSize: '12px',
                                fontWeight: 600,
                                transition: 'all 0.2s ease',
                                boxShadow: backgroundType === 'video' ? '0 8px 20px rgba(30, 64, 175, 0.4)' : '0 2px 8px rgba(59, 130, 246, 0.08)',
                            }}
                        >
                            Video
                        </button>
                        <button
                            onClick={() => onBackgroundTypeChange?.('hdr')}
                            style={{
                                padding: '11px 12px',
                                border: backgroundType === 'hdr' ? '1.5px solid #1E40AF' : '1.5px solid rgba(59, 130, 246, 0.4)',
                                borderRadius: '14px',
                                background: backgroundType === 'hdr' ? 'linear-gradient(135deg, #1E40AF 0%, #1e3a8a 100%)' : 'linear-gradient(135deg, transparent 0%, rgba(59, 130, 246, 0.02) 100%)',
                                color: backgroundType === 'hdr' ? '#ffffff' : '#3b82f6',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                fontSize: '12px',
                                fontWeight: 600,
                                transition: 'all 0.2s ease',
                                boxShadow: backgroundType === 'hdr' ? '0 8px 20px rgba(30, 64, 175, 0.4)' : '0 2px 8px rgba(59, 130, 246, 0.08)',
                            }}
                        >
                            HDR
                        </button>
                    </div>
                </div>

                <div className="section">
                    <label className="vrma-buttons-label">VRMA Animations</label>
                    <div className="vrma-buttons">
                        {(animationNames || []).map((name, index) => (
                            <button
                                key={name}
                                className={`vrma-btn ${activeAnimation === index ? 'active' : ''}`}
                                onClick={() => handleAnimationClick(index, animations?.[index])}
                                disabled={!animations || !animations[index]}
                            >
                                {formatAnimationLabel(name)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mouse-guide">
                    <div className="mouse-guide-title">Hướng dẫn điều khiển</div>
                    <div className="mouse-guide-item">Chuột trái: xoay background</div>
                    <div className="mouse-guide-item">Chuột phải: di chuyển model</div>
                    <div className="mouse-guide-item">Lăn chuột: thu phóng</div>
                </div>

                <div className="status">{status}</div>
            </div>
        </>
    );
}
