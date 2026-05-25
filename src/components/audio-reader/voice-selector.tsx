import React, { useMemo } from 'react';

interface VoiceSelectorProps {
    voices: SpeechSynthesisVoice[];
    selectedVoice: string;
    onChange: (voiceName: string) => void;
}

const LANGUAGE_NAMES: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    pt: 'Portuguese',
    it: 'Italian',
    ja: 'Japanese',
    zh: 'Chinese',
    ko: 'Korean',
    ru: 'Russian',
    nl: 'Dutch',
    pl: 'Polish',
    tr: 'Turkish',
    sv: 'Swedish',
    da: 'Danish',
    fi: 'Finnish',
    no: 'Norwegian',
};

function getFriendlyLanguageName(langCode: string): string {
    const mainLang = langCode.split('-')[0].toLowerCase();
    return LANGUAGE_NAMES[mainLang] || mainLang.toUpperCase();
}

export function VoiceSelector({ voices, selectedVoice, onChange }: VoiceSelectorProps) {
    const sortedVoices = useMemo(() => {
        return [...voices].sort((a, b) => {
            const langA = getFriendlyLanguageName(a.lang);
            const langB = getFriendlyLanguageName(b.lang);
            if (langA !== langB) {
                return langA.localeCompare(langB);
            }
            return a.name.localeCompare(b.name);
        });
    }, [voices]);

    if (voices.length === 0) {
        return (
            <select
                disabled
                className="text-xs bg-slate-950/60 border border-slate-800/80 text-slate-500 rounded-xl px-3 py-1.5 focus:outline-none cursor-not-allowed"
            >
                <option>No voices found</option>
            </select>
        );
    }
    return (
        <div className="flex items-center">
            <label
                htmlFor="voice-select"
                className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5"
            >
                Voice:
                <select
                    id="voice-select"
                    value={selectedVoice}
                    onChange={(e) => onChange(e.target.value)}
                    className="text-xs bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer font-medium max-w-[200px] sm:max-w-[240px] md:max-w-[280px] truncate normal-case"
                >
                    {sortedVoices.map((voice) => {
                        const langFriendly = getFriendlyLanguageName(voice.lang);
                        const region = voice.lang.split('-')[1]
                            ? ` (${voice.lang.split('-')[1]})`
                            : '';
                        return (
                            <option key={voice.name} value={voice.name}>
                                {langFriendly}
                                {region} -{' '}
                                {voice.name
                                    .replace(/Google/gi, '')
                                    .replace(/Microsoft/gi, '')
                                    .trim()}
                            </option>
                        );
                    })}
                </select>
            </label>
        </div>
    );
}
