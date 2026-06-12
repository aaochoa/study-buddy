'use client';

import React from 'react';
import { ResearchProgress } from '@/components/ResearchProgress';
import { ResearchResult } from '@/components/ResearchResult';
import { SavedGuides, GuideFile } from '@/components/SavedGuides';

interface MainContentProps {
    selectedReport: string | null;
    selectedFilename: string;
    onSelectGuide: (content: string, filename: string) => void;
    onClearGuide: () => void;
    refreshTrigger: number;
    agentRunning: boolean;
    onGuidesLoaded: (guides: GuideFile[]) => void;
    activeAgentId: string;
}

/**
 * MainContent component renders the central workspace of the application.
 * It toggles between Research Mode and Q&A Mode, displays progress, and
 * renders the selected study guides.
 *
 * @param props - Props for MainContent component including callbacks and active states.
 */
export function MainContent({
    selectedReport,
    selectedFilename,
    onSelectGuide,
    onClearGuide,
    refreshTrigger,
    agentRunning,
    onGuidesLoaded,
    activeAgentId,
}: MainContentProps) {
    return (
        <div
            className="min-h-screen flex flex-col justify-center items-center gap-6 py-10 px-4 bg-gradient-to-br transition-colors duration-300"
            style={{
                backgroundImage:
                    'linear-gradient(to bottom right, var(--bg-gradient-from), var(--bg-gradient-via), var(--bg-gradient-to))',
            }}
        >
            {/* Hero heading */}
            <div className="text-center mb-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500">
                    Study Buddy
                </h1>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Ask me to research any topic &mdash; I&apos;ll build you a full interview study
                    guide.
                </p>
            </div>

            {/* Mode Switcher */}
            <div
                className="flex backdrop-blur-md p-1 rounded-xl border border-indigo-500/20 shadow-xl max-w-sm w-full mx-auto transition-colors duration-300"
                style={{ background: 'var(--bg-mode-switcher)' }}
            >
                <button
                    type="button"
                    onClick={onClearGuide}
                    className={`flex-1 text-center py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                        activeAgentId === 'study_buddy_agent'
                            ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-600/20 font-semibold'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
                    }`}
                >
                    🔍 Research Mode
                </button>
                <button
                    type="button"
                    disabled={!selectedReport}
                    className={`flex-1 text-center py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        !selectedReport
                            ? 'opacity-40 cursor-not-allowed text-slate-500'
                            : activeAgentId === 'study_buddy_qa'
                              ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-600/20 font-semibold cursor-pointer'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/20 cursor-pointer'
                    }`}
                >
                    💬 Q&A Mode
                </button>
            </div>

            {/* Show active research panel if running, otherwise show manually selected guide or placeholders */}
            {activeAgentId === 'study_buddy_agent' ? (
                agentRunning ? (
                    <ResearchProgress />
                ) : selectedReport ? (
                    <div className="w-full max-w-3xl flex flex-col gap-4">
                        <ResearchResult report={selectedReport} onClose={onClearGuide} />
                    </div>
                ) : (
                    <div
                        className="w-full max-w-2xl p-8 rounded-2xl border border-indigo-500/10 backdrop-blur-md text-center flex flex-col items-center gap-4 shadow-xl transition-colors duration-300"
                        style={{ background: 'var(--bg-panel)' }}
                    >
                        <div className="p-4 bg-indigo-500/5 rounded-full text-indigo-400/80">
                            <svg
                                className="w-8 h-8"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h3
                                className="text-lg font-semibold"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                Ready to Research
                            </h3>
                            <p
                                className="mt-2 text-sm max-w-md mx-auto"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                Enter a topic in the chat sidebar to start web research and build a
                                comprehensive study guide.
                            </p>
                        </div>
                    </div>
                )
            ) : selectedReport ? (
                <div className="w-full max-w-3xl flex flex-col gap-4">
                    <ResearchResult report={selectedReport} onClose={onClearGuide} />
                </div>
            ) : (
                <div
                    className="w-full max-w-2xl p-8 rounded-2xl border border-indigo-500/20 backdrop-blur-md text-center flex flex-col items-center gap-4 shadow-xl transition-colors duration-300"
                    style={{ background: 'var(--bg-panel)' }}
                >
                    <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-400">
                        <svg
                            className="w-8 h-8"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <div>
                        <h3
                            className="text-lg font-semibold"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            No Study Guide Selected
                        </h3>
                        <p
                            className="mt-2 text-sm max-w-md mx-auto"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            To start a Q&A session, please research a new topic first or select one
                            of your previously saved guides below.
                        </p>
                    </div>
                </div>
            )}

            {/* Saved Guides history list */}
            <SavedGuides
                onSelectGuide={onSelectGuide}
                activeFilename={selectedFilename}
                refreshTrigger={refreshTrigger}
                onGuidesLoaded={onGuidesLoaded}
            />
        </div>
    );
}
