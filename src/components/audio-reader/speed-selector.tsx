import React from 'react';

interface SpeedSelectorProps {
    rate: number;
    onChange: (rate: number) => void;
}

export function SpeedSelector({ rate, onChange }: SpeedSelectorProps) {
    return (
        <div className="flex items-center">
            <label
                htmlFor="speed-select"
                className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5"
            >
                Speed:
                <select
                    id="speed-select"
                    value={rate}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="text-xs bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer font-medium normal-case"
                >
                    <option value="0.5">0.5x</option>
                    <option value="0.75">0.75x</option>
                    <option value="1">1.0x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2.0x</option>
                </select>
            </label>
        </div>
    );
}
