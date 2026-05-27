'use client';

import { ResearchProgress } from '@/components/ResearchProgress';
import { ResearchResult } from '@/components/ResearchResult';
import { SavedGuides, GuideFile } from '@/components/SavedGuides';
import { CopilotSidebar, useConfigureSuggestions, useAgent } from '@copilotkit/react-core/v2';
import React, { useState, useEffect } from 'react';
import { AgentState } from '@/lib/types';
import { useAgentSelector } from '@/components/CopilotWrapper';

export default function CopilotKitPage() {
    const { activeAgentId, setActiveAgentId } = useAgentSelector();

    useConfigureSuggestions({
        suggestions:
            activeAgentId === 'study_buddy_qa'
                ? [
                      {
                          title: 'Explain core internals',
                          message:
                              'Can you explain the core internals and architecture of the topic?',
                      },
                      {
                          title: 'Review key gotchas',
                          message: 'What are the main gotchas and pitfalls I should be careful of?',
                      },
                      {
                          title: 'Suggest interview questions',
                          message:
                              'Can you quiz me on this topic with some senior-level questions?',
                      },
                      {
                          title: 'Walk through coding challenge',
                          message:
                              'Can you walk me through one of the coding challenges in the guide?',
                      },
                  ]
                : [
                      {
                          title: 'React & Next.js',
                          message: 'Research React and Next.js core concepts and best practices .',
                      },
                      {
                          title: 'Node.js',
                          message: 'Research the Node.js common interview topics.',
                      },
                      {
                          title: 'Database Architecture',
                          message:
                              'Compare PostgreSQL and MongoDB performance characteristics and design trade-offs.',
                      },
                      {
                          title: 'System Design',
                          message:
                              'Research horizontal scaling and load balancing strategies for high-traffic APIs.',
                      },
                      {
                          title: 'TypeScript Deep Dive',
                          message:
                              'Research advanced TypeScript patterns: generics, conditional types, and mapped types.',
                      },
                  ],
    });

    const { agent: researchAgent } = useAgent({ agentId: 'study_buddy_agent' });
    const state = (researchAgent.state ?? {}) as AgentState;

    const [selectedReport, setSelectedReport] = useState<string | null>(null);
    const [selectedFilename, setSelectedFilename] = useState<string>('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [shouldAutoSelect, setShouldAutoSelect] = useState(false);
    const [wasRunning, setWasRunning] = useState(false);

    // Sync the active agent based on whether a study guide is selected/loaded
    useEffect(() => {
        if (selectedReport) {
            setActiveAgentId('study_buddy_qa');
        } else {
            setActiveAgentId('study_buddy_agent');
        }
    }, [selectedReport, setActiveAgentId]);

    // Clear selected report when agent starts running a new request, and track running state
    useEffect(() => {
        if (researchAgent.isRunning) {
            setWasRunning(true);
            setSelectedReport(null);
            setSelectedFilename('');
            setShouldAutoSelect(true);
        } else if (wasRunning) {
            // Agent finished running
            setWasRunning(false);
            setRefreshTrigger((prev) => prev + 1);
        }
    }, [researchAgent.isRunning, wasRunning]);

    // Automatically trigger list refresh and show report when report generation finishes (if state is updated)
    useEffect(() => {
        if (state.report_result) {
            setSelectedReport(state.report_result);
            setRefreshTrigger((prev) => prev + 1);
        }
    }, [state.report_result]);

    const handleSelectGuide = (content: string, filename: string) => {
        setSelectedReport(content);
        setSelectedFilename(filename);
    };

    const handleClearGuide = () => {
        setSelectedReport(null);
        setSelectedFilename('');
    };

    const handleGuidesLoaded = async (guides: GuideFile[]) => {
        if (shouldAutoSelect && guides.length > 0) {
            const newest = guides[0];
            try {
                const response = await fetch(`/api/guides/${newest.filename}`);
                if (response.ok) {
                    const content = await response.text();
                    setSelectedReport(content);
                    setSelectedFilename(newest.filename);
                    setShouldAutoSelect(false);
                }
            } catch (err) {
                console.error('Failed to auto-load newest guide:', err);
            }
        }
    };

    const welcomeMessage =
        activeAgentId === 'study_buddy_qa'
            ? '💬 Ask me any questions about your current study guide! What would you like to clarify?'
            : "👋 Hi, there! I'm your Study Buddy. What would you like to study today?";

    return (
        <main>
            <MainContent
                selectedReport={selectedReport}
                selectedFilename={selectedFilename}
                onSelectGuide={handleSelectGuide}
                onClearGuide={handleClearGuide}
                refreshTrigger={refreshTrigger}
                agentRunning={researchAgent.isRunning}
                onGuidesLoaded={handleGuidesLoaded}
                activeAgentId={activeAgentId}
            />
            <CopilotSidebar
                key={activeAgentId}
                defaultOpen
                labels={{
                    welcomeMessageText: welcomeMessage,
                }}
            />
        </main>
    );
}

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

function MainContent({
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
        <div className="min-h-screen flex flex-col justify-center items-center gap-6 py-10 px-4 bg-gradient-to-br from-[#0f0f23] via-[#1a1a3e] to-[#0f0f23]">
            {/* Hero heading */}
            <div className="text-center mb-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                    Study Buddy
                </h1>
                <p className="mt-2 text-slate-400 text-sm">
                    Ask me to research any topic &mdash; I&apos;ll build you a full interview study
                    guide.
                </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-[#161633]/80 backdrop-blur-md p-1 rounded-xl border border-indigo-500/20 shadow-xl max-w-sm w-full mx-auto">
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
                    <div className="w-full max-w-2xl p-8 rounded-2xl border border-indigo-500/10 bg-[#161633]/30 backdrop-blur-md text-center flex flex-col items-center gap-4 shadow-xl">
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
                            <h3 className="text-lg font-semibold text-slate-300">
                                Ready to Research
                            </h3>
                            <p className="mt-2 text-slate-400 text-sm max-w-md mx-auto">
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
                <div className="w-full max-w-2xl p-8 rounded-2xl border border-indigo-500/20 bg-[#161633]/50 backdrop-blur-md text-center flex flex-col items-center gap-4 shadow-xl">
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
                        <h3 className="text-lg font-semibold text-slate-200">
                            No Study Guide Selected
                        </h3>
                        <p className="mt-2 text-slate-400 text-sm max-w-md mx-auto">
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
