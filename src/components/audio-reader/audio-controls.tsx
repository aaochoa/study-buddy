import React from 'react';

interface AudioControlsProps {
    isPlaying: boolean;
    isPaused: boolean;
    onPlay: () => void;
    onPause: () => void;
    onStop: () => void;
}

export function AudioControls({
    isPlaying,
    isPaused,
    onPlay,
    onPause,
    onStop,
}: AudioControlsProps) {
    return (
        <div className="flex items-center gap-2">
            {isPlaying ? (
                <button
                    type="button"
                    onClick={onPause}
                    aria-label="Pause reading"
                    className="p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-all duration-300 active:scale-95 cursor-pointer flex items-center justify-center"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                        className="w-4 h-4"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 5.25v13.5m-7.5-13.5v13.5"
                        />
                    </svg>
                </button>
            ) : (
                <button
                    type="button"
                    onClick={onPlay}
                    aria-label={isPaused ? 'Resume reading' : 'Start reading'}
                    className="p-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/25 transition-all duration-300 active:scale-95 cursor-pointer flex items-center justify-center"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                        className="w-4 h-4"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653Z"
                        />
                    </svg>
                </button>
            )}

            {(isPlaying || isPaused) && (
                <button
                    type="button"
                    onClick={onStop}
                    aria-label="Stop reading"
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50 transition-all duration-300 active:scale-95 cursor-pointer flex items-center justify-center"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                        className="w-4 h-4"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9A2.25 2.25 0 0 1 5.25 16.5v-9Z"
                        />
                    </svg>
                </button>
            )}
        </div>
    );
}
