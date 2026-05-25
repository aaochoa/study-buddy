import React from 'react';

interface AudioVisualizerProps {
    isPlaying: boolean;
    isPaused: boolean;
}

export function AudioVisualizer({ isPlaying, isPaused }: AudioVisualizerProps) {
    const getStatusText = () => {
        if (isPlaying) return 'Reading guide...';
        if (isPaused) return 'Speech paused';
        return 'Listen to Guide';
    };

    return (
        <div className="flex items-center gap-3">
            <div className="flex items-end gap-0.5 h-6 w-8 justify-center">
                {[1, 2, 3, 4, 5].map((bar) => {
                    const delay = `${(bar - 1) * 150}ms`;
                    return (
                        <span
                            key={bar}
                            style={{
                                animationDelay: isPlaying ? delay : '0ms',
                            }}
                            className={`w-1 rounded-full bg-gradient-to-t from-indigo-500 to-violet-400 transition-all duration-300 ${
                                isPlaying ? 'animate-soundwave h-5' : 'h-1.5'
                            } ${isPaused && !isPlaying ? 'h-3 animate-pulse bg-violet-500/50' : ''}`}
                        />
                    );
                })}
            </div>
            <span className="text-xs text-slate-300 font-semibold tracking-wide font-sans">
                {getStatusText()}
            </span>
        </div>
    );
}
