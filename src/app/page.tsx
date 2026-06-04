'use client';

import { ResearchProgress } from '@/components/ResearchProgress';
import { ResearchResult } from '@/components/ResearchResult';
import { SavedGuides, GuideFile } from '@/components/SavedGuides';
import {
    CopilotSidebar,
    useConfigureSuggestions,
    useAgent,
    useCopilotKit,
} from '@copilotkit/react-core/v2';
import React, { useState, useEffect, useCallback } from 'react';
import { AgentState } from '@/lib/types';
import { useAgentSelector } from '@/components/CopilotWrapper';
import { CodingArena } from '@/components/CodingArena';

export default function CopilotKitPage() {
    const { activeAgentId, setActiveAgentId, currentView } = useAgentSelector();

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
                              'Compare PostgreSQL and MongoDB performance characteristics and trade-offs.',
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
    const { agent: challengesAgent } = useAgent({ agentId: 'study_buddy_challenges' });
    const { copilotkit } = useCopilotKit();

    const state = (researchAgent.state ?? {}) as AgentState;
    const challengesState = (challengesAgent.state ?? {}) as AgentState;

    const [selectedReport, setSelectedReport] = useState<string | null>(null);
    const [selectedFilename, setSelectedFilename] = useState<string>('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [shouldAutoSelect, setShouldAutoSelect] = useState(false);
    const [wasRunning, setWasRunning] = useState(false);
    const [lastSavedReport, setLastSavedReport] = useState<string>('');
    const [lastSavedChallenges, setLastSavedChallenges] = useState<string>('');
    const [challengesTriggered, setChallengesTriggered] = useState(false);

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
            setChallengesTriggered(false);
        } else if (wasRunning && !researchAgent.isRunning && !challengesAgent.isRunning) {
            // Agent finished running
            setWasRunning(false);
            setShouldAutoSelect(true);
            setRefreshTrigger((prev) => prev + 1);
        }
    }, [researchAgent.isRunning, challengesAgent.isRunning, wasRunning]);

    // Automatically save and show report when report generation finishes (if state or messages are updated)
    useEffect(() => {
        const getReportFromMessages = (messages: any[]) => {
            for (let i = messages.length - 1; i >= 0; i--) {
                const msg = messages[i];
                if (msg.role === 'assistant' || msg.role === 'agent') {
                    let content = '';
                    if (typeof msg.content === 'string') {
                        content = msg.content;
                    } else if (Array.isArray(msg.parts)) {
                        content = msg.parts.map((part: any) => part.text || '').join('');
                    }
                    if (
                        content.includes('#') &&
                        (content.includes('Click here to download') ||
                            content.includes('data:application/octet-stream;base64'))
                    ) {
                        return content;
                    }
                }
            }
            return null;
        };

        const reportFromMessages = getReportFromMessages(researchAgent.messages || []);
        const reportContent = state.report_result || reportFromMessages;

        if (reportContent && reportContent !== lastSavedReport) {
            const saveReport = async () => {
                try {
                    // Extract title from the first heading in the markdown report
                    const titleMatch = reportContent.match(/^#\s+(.+)$/m);
                    const title = titleMatch ? titleMatch[1].trim() : 'Study Guide';

                    // Generate a clean filename from title
                    const cleanTitle = title
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '_')
                        .substring(0, 50);
                    const filename = `${cleanTitle}_${Date.now()}.md`;

                    // Clean the content from any appended download link
                    const cleanedContent = reportContent.replace(
                        /\n\n\[Click here to download [^\]]+\]\(data:[^)]+\)$/,
                        '',
                    );

                    const response = await fetch('/api/guides', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title,
                            filename,
                            content: cleanedContent,
                        }),
                    });

                    if (response.ok) {
                        setLastSavedReport(reportContent);
                        setSelectedReport(cleanedContent);
                        setSelectedFilename(filename);
                        setRefreshTrigger((prev) => prev + 1);
                    }
                } catch (err) {
                    console.error('Failed to auto-save generated guide to DB:', err);
                }
            };
            saveReport();
        }
    }, [state.report_result, researchAgent.messages, lastSavedReport]);

    // Automatically run the challenges agent when the study guide completes
    useEffect(() => {
        if (
            !researchAgent.isRunning &&
            state.report_result &&
            !challengesAgent.isRunning &&
            !challengesState.code_challenges &&
            !challengesTriggered
        ) {
            const runChallenges = async () => {
                setChallengesTriggered(true);
                try {
                    challengesAgent.addMessage({
                        id: crypto.randomUUID(),
                        role: 'user',
                        content:
                            'Generate 3 coding challenges based on the latest researched study guide.',
                    });
                    await copilotkit.runAgent({ agent: challengesAgent });
                } catch (err) {
                    console.error('Failed to trigger independent challenges agent:', err);
                }
            };
            runChallenges();
        }
    }, [
        researchAgent.isRunning,
        state.report_result,
        challengesAgent.isRunning,
        challengesState.code_challenges,
        challengesTriggered,
        copilotkit,
        challengesAgent,
    ]);

    // Automatically save generated coding challenges to DB when they are ready
    useEffect(() => {
        if (challengesAgent.isRunning) {
            return;
        }

        const logToServer = (level: string, message: any) => {
            fetch('/api/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ level, message }),
            }).catch(() => {});
        };

        const getChallengesFromMessages = (messages: any[]) => {
            for (let i = messages.length - 1; i >= 0; i--) {
                const msg = messages[i];
                if (msg.role === 'assistant' || msg.role === 'agent') {
                    let content = '';
                    if (typeof msg.content === 'string') {
                        content = msg.content;
                    } else if (Array.isArray(msg.parts)) {
                        content = msg.parts.map((part: any) => part.text || '').join('');
                    }
                    logToServer('DEBUG', `Message Content: ${content.substring(0, 500)}...`);

                    if (
                        content.includes('[') &&
                        content.includes(']') &&
                        content.includes('"difficulty"') &&
                        content.includes('"languages"')
                    ) {
                        return content;
                    }
                }
            }
            return null;
        };

        const challengesFromMessages = getChallengesFromMessages(challengesAgent.messages || []);
        const challengesContent = challengesState.code_challenges || challengesFromMessages;

        if (challengesContent && challengesContent !== lastSavedChallenges) {
            const saveChallenges = async () => {
                const logToServer = (level: string, message: any) => {
                    fetch('/api/log', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ level, message }),
                    }).catch(() => {});
                };

                logToServer('INFO', 'Starting saveChallenges execution');

                try {
                    let cleanedJson = challengesContent.trim();
                    const jsonMatch = cleanedJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                    if (jsonMatch) {
                        cleanedJson = jsonMatch[1].trim();
                    } else {
                        const firstBracket = cleanedJson.indexOf('[');
                        const lastBracket = cleanedJson.lastIndexOf(']');
                        if (
                            firstBracket !== -1 &&
                            lastBracket !== -1 &&
                            lastBracket > firstBracket
                        ) {
                            cleanedJson = cleanedJson.substring(firstBracket, lastBracket + 1);
                        } else {
                            // Maybe it's wrapped in an object {}
                            const firstBrace = cleanedJson.indexOf('{');
                            const lastBrace = cleanedJson.lastIndexOf('}');
                            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                                cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
                            }
                        }
                    }

                    logToServer('DEBUG', { cleanedJson: cleanedJson.substring(0, 500) + '...' });

                    let parsed = JSON.parse(cleanedJson);

                    if (!Array.isArray(parsed)) {
                        if (parsed.problems && Array.isArray(parsed.problems))
                            parsed = parsed.problems;
                        else if (parsed.challenges && Array.isArray(parsed.challenges))
                            parsed = parsed.challenges;
                    }

                    if (Array.isArray(parsed) && parsed.length > 0) {
                        logToServer(
                            'INFO',
                            `Parsed successfully, posting ${parsed.length} problems`,
                        );
                        const response = await fetch('/api/problems', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(parsed),
                        });

                        if (response.ok) {
                            setLastSavedChallenges(challengesContent);
                            logToServer('SUCCESS', 'Successfully saved generated challenges to DB');
                            console.log('Successfully saved generated challenges to DB');
                        } else {
                            const errData = await response.json();
                            logToServer('ERROR', { type: 'Server Error', data: errData });
                            console.error(
                                'Failed to save challenges to DB (Server Error):',
                                errData,
                            );
                        }
                    } else {
                        logToServer('ERROR', { type: 'Not an array or empty', parsed });
                    }
                } catch (err: any) {
                    logToServer('ERROR', {
                        type: 'Parse or save exception',
                        msg: err.message,
                        stack: err.stack,
                    });
                    console.error('Failed to parse or auto-save generated challenges:', err);
                }
            };
            saveChallenges();
        }
    }, [
        challengesState.code_challenges,
        challengesAgent.messages,
        lastSavedChallenges,
        challengesAgent.isRunning,
    ]);

    const handleSelectGuide = useCallback((content: string, filename: string) => {
        setSelectedReport(content);
        setSelectedFilename(filename);
    }, []);

    const handleClearGuide = useCallback(() => {
        setSelectedReport(null);
        setSelectedFilename('');
    }, []);

    const handleGuidesLoaded = useCallback(
        async (guides: GuideFile[]) => {
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
        },
        [shouldAutoSelect],
    );

    const welcomeMessage =
        activeAgentId === 'study_buddy_qa'
            ? '💬 Ask me any questions about your current study guide! What would you like to clarify?'
            : "👋 Hi, there! I'm your Study Buddy. What would you like to study today?";

    return (
        <main>
            {currentView === 'research' ? (
                <>
                    <MainContent
                        selectedReport={selectedReport}
                        selectedFilename={selectedFilename}
                        onSelectGuide={handleSelectGuide}
                        onClearGuide={handleClearGuide}
                        refreshTrigger={refreshTrigger}
                        agentRunning={researchAgent.isRunning || challengesAgent.isRunning}
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
                </>
            ) : (
                <CodingArena />
            )}
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
