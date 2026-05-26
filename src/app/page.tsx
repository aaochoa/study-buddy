'use client';

import { ResearchProgress } from '@/components/ResearchProgress';
import { ResearchResult } from '@/components/ResearchResult';
import { SavedGuides, GuideFile } from '@/components/SavedGuides';
import { CopilotSidebar, useConfigureSuggestions, useAgent } from '@copilotkit/react-core/v2';
import React, { useState, useEffect } from 'react';
import { AgentState } from '@/lib/types';

export default function CopilotKitPage() {
    useConfigureSuggestions({
        suggestions: [
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

    const { agent } = useAgent({ agentId: 'study_buddy_agent' });
    const state = (agent.state ?? {}) as AgentState;

    const [selectedReport, setSelectedReport] = useState<string | null>(null);
    const [selectedFilename, setSelectedFilename] = useState<string>('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [shouldAutoSelect, setShouldAutoSelect] = useState(false);
    const [wasRunning, setWasRunning] = useState(false);

    // Clear selected report when agent starts running a new request, and track running state
    useEffect(() => {
        if (agent.isRunning) {
            setWasRunning(true);
            setSelectedReport(null);
            setSelectedFilename('');
            setShouldAutoSelect(true);
        } else if (wasRunning) {
            // Agent finished running
            setWasRunning(false);
            setRefreshTrigger((prev) => prev + 1);
        }
    }, [agent.isRunning, wasRunning]);

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

    return (
        <main>
            <MainContent
                selectedReport={selectedReport}
                selectedFilename={selectedFilename}
                onSelectGuide={handleSelectGuide}
                refreshTrigger={refreshTrigger}
                agentRunning={agent.isRunning}
                onGuidesLoaded={handleGuidesLoaded}
            />
            <CopilotSidebar
                defaultOpen
                labels={{
                    welcomeMessageText:
                        "👋 Hi, there! I'm your Study Buddy. What would you like to study today?",
                }}
            />
        </main>
    );
}

interface MainContentProps {
    selectedReport: string | null;
    selectedFilename: string;
    onSelectGuide: (content: string, filename: string) => void;
    refreshTrigger: number;
    agentRunning: boolean;
    onGuidesLoaded: (guides: GuideFile[]) => void;
}

function MainContent({
    selectedReport,
    selectedFilename,
    onSelectGuide,
    refreshTrigger,
    agentRunning,
    onGuidesLoaded,
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

            {/* Show active research panel if running, otherwise show manually selected guide */}
            {agentRunning ? (
                <ResearchProgress />
            ) : selectedReport ? (
                <div className="w-full max-w-3xl flex flex-col gap-4">
                    <ResearchResult report={selectedReport} />
                </div>
            ) : (
                <ResearchProgress />
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
