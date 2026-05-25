'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioVisualizer } from './audio-visualizer';
import { AudioControls } from './audio-controls';
import { VoiceSelector } from './voice-selector';
import { SpeedSelector } from './speed-selector';

interface AudioReaderProps {
    content: string;
}

const LANGUAGE_PATTERNS: Record<string, RegExp> = {
    es: /\b(el|la|los|las|un|una|y|en|que|de|es|son|para|con)\b/g,
    fr: /\b(le|la|les|un|une|et|dans|que|de|est|sont|pour|avec)\b/g,
    de: /\b(der|die|das|ein|eine|und|in|dass|von|ist|sind|für|mit)\b/g,
    pt: /\b(o|a|os|as|um|uma|e|em|que|de|é|são|para|com)\b/g,
    it: /\b(il|la|i|gli|le|un|una|e|in|che|di|è|sono|per|con)\b/g,
    en: /\b(the|a|an|and|in|that|of|is|are|to|it|for|with)\b/g,
};

// Heuristic to detect language of the generated text
export function detectLanguage(text: string): string {
    const textLower = text.toLowerCase();
    let bestLang = 'en';
    let maxCount = 0;

    for (const [lang, regex] of Object.entries(LANGUAGE_PATTERNS)) {
        const matches = textLower.match(regex);
        const count = matches ? matches.length : 0;
        if (count > maxCount) {
            maxCount = count;
            bestLang = lang;
        }
    }

    if (maxCount < 3 && typeof navigator !== 'undefined') {
        return navigator.language.split('-')[0].toLowerCase();
    }

    return bestLang;
}

// Clean and prepare markdown text for TTS engine
export function stripMarkdown(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, '') // Skip code blocks entirely
        .replace(/>\s+/g, '') // Remove blockquote markers
        .replace(/#+\s+/g, '') // Strip headers
        .replace(/^[*+-]\s+/gm, '') // Remove list bullet marks
        .replace(/^\d+\.\s+/gm, '') // Remove list numbers
        .replace(/\*\*|__/g, '') // Strip bold formatting
        .replace(/\*|_/g, '') // Strip italic formatting
        .replace(/`[^`]+`/g, (match) => match.slice(1, -1)) // Remove inline backticks
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Extract plain text from links
        .trim();
}

export function AudioReader({ content }: AudioReaderProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<string>('');
    const [rate, setRate] = useState<number>(1);

    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Stop speaking
    const handleStop = useCallback(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
            setIsPaused(false);
        }
    }, []);

    // Pause speaking
    const handlePause = useCallback(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis && isPlaying) {
            window.speechSynthesis.pause();
            setIsPlaying(false);
            setIsPaused(true);
        }
    }, [isPlaying]);

    // Load available voices
    useEffect(() => {
        const updateVoices = () => {
            if (typeof window === 'undefined' || !window.speechSynthesis) return;

            const availableVoices = window.speechSynthesis.getVoices();
            setVoices(availableVoices);

            // Auto-detect the text language
            const textLang = detectLanguage(content);

            // 1. Try to find voice matching detected language
            let defaultVoice = availableVoices.find((v) =>
                v.lang.toLowerCase().startsWith(textLang),
            );

            // 2. Fallback to browser language if no match
            if (!defaultVoice && typeof navigator !== 'undefined') {
                const browserLang = navigator.language.toLowerCase();
                defaultVoice =
                    availableVoices.find((v) => v.lang.toLowerCase().startsWith(browserLang)) ||
                    availableVoices.find((v) =>
                        v.lang.toLowerCase().startsWith(browserLang.split('-')[0]),
                    );
            }

            // 3. Fallback to first English voice
            if (!defaultVoice) {
                defaultVoice = availableVoices.find((v) => v.lang.toLowerCase().startsWith('en'));
            }

            // 4. Ultimate fallback
            if (!defaultVoice && availableVoices.length > 0) {
                defaultVoice = availableVoices[0];
            }

            if (defaultVoice) {
                setSelectedVoice(defaultVoice.name);
            }
        };

        updateVoices();
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = updateVoices;
        }

        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, [content]);

    // Start/Resume speaking
    const handlePlay = useCallback(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        if (isPaused) {
            window.speechSynthesis.resume();
            setIsPlaying(true);
            setIsPaused(false);
            return;
        }

        window.speechSynthesis.cancel();

        const cleanText = stripMarkdown(content);
        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);

        const voice = voices.find((v) => v.name === selectedVoice);
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
        }

        utterance.rate = rate;

        utterance.onend = () => {
            setIsPlaying(false);
            setIsPaused(false);
        };

        utterance.onerror = () => {
            setIsPlaying(false);
            setIsPaused(false);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
        setIsPaused(false);
    }, [isPaused, content, selectedVoice, voices, rate]);

    // Handle resetting speech when text/content updates
    useEffect(() => {
        handleStop();
    }, [content, handleStop]);

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md shadow-lg animate-fade-in">
            {/* Left side: Visualizer and state info */}
            <div className="flex items-center gap-2">
                <AudioVisualizer isPlaying={isPlaying} isPaused={isPaused} />
            </div>

            {/* Right side: Interactive Controls */}
            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto sm:justify-end">
                {voices.length > 0 && (
                    <VoiceSelector
                        voices={voices}
                        selectedVoice={selectedVoice}
                        onChange={setSelectedVoice}
                    />
                )}

                <SpeedSelector rate={rate} onChange={setRate} />

                <div className="border-l border-slate-800 h-6 hidden md:block" />

                <AudioControls
                    isPlaying={isPlaying}
                    isPaused={isPaused}
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onStop={handleStop}
                />
            </div>
        </div>
    );
}
