import React, { useState, useEffect } from 'react';

const ANIMATION_NAMES = [
    'Angry', 'Blush', 'Clapping', 'Goodbye', 'Jump',
    'LookAround', 'Relax', 'Sad', 'Sleepy', 'Surprised', 'Thinking'
];

export function ControlsPanel({
    vrmModel,
    onVrmChange,
    animations,
    onAnimationPlay,
    status,
    isCollapsed,
    onToggle,
}) {
    const [activeAnimation, setActiveAnimation] = useState(null);

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
                    <label className="vrma-buttons-label">VRMA Animations</label>
                    <div className="vrma-buttons">
                        {ANIMATION_NAMES.map((name, index) => (
                            <button
                                key={name}
                                className={`vrma-btn ${activeAnimation === index ? 'active' : ''}`}
                                onClick={() => handleAnimationClick(index, animations?.[index])}
                                disabled={!animations || !animations[index]}
                            >
                                {name}
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
