'use client';

import { AgentState } from '@/lib/types';
import { useCoAgent } from '@copilotkit/react-core';
import { CopilotKitCSSProperties, CopilotSidebar } from '@copilotkit/react-ui';
import { useState } from 'react';

// Import our newly refactored smaller components
import { DashboardHeader } from '@/components/dashboard-header';
import { WelcomeState } from '@/components/welcome-state';
import { StatusCard } from '@/components/status-card';
import { SearchLoader } from '@/components/search-loader';
import { MarkdownViewer } from '@/components/markdown-viewer';
import { ErrorState } from '@/components/error-state';
import { AudioReader } from '@/components/audio-reader';

export default function CopilotKitPage() {
    const [themeColor, setThemeColor] = useState('#4f46e5');

    return (
        <main
            style={{ '--copilot-kit-primary-color': themeColor } as CopilotKitCSSProperties}
            className="h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans"
        >
            <CopilotSidebar
                disableSystemMessage
                clickOutsideToClose={false}
                defaultOpen
                labels={{
                    title: 'Study Prep Assistant',
                    initial:
                        '👋 Ask me to research any topic to generate a comprehensive Interview Study Guide!',
                }}
                suggestions={[
                    {
                        title: 'React Server Components',
                        message: 'Research React Server Components and generate a guide.',
                    },
                    {
                        title: 'PostgreSQL Indexing',
                        message: 'Research PostgreSQL Indexing and generate a guide.',
                    },
                    {
                        title: 'Google Cloud',
                        message: 'Research Google Cloud and generate a guide.',
                    },
                    {
                        title: 'Amazon Web Services',
                        message: 'Research Amazon Web Services and generate a guide.',
                    },
                    {
                        title: 'Ruby on Rails',
                        message: 'Research Ruby on Rails and generate a guide.',
                    },
                    {
                        title: 'Node.js',
                        message: 'Research Node.js and generate a guide.',
                    },
                ]}
            >
                <StudyBuddyDashboard />
            </CopilotSidebar>
        </main>
    );
}

function StudyBuddyDashboard() {
    // Shared state with the search_assistant A2A agent
    const { state, setState, running } = useCoAgent<AgentState>({
        name: 'my_agent',
        initialState: {},
    });

    const hasSearch = !!state?.search_result;
    const hasReport = !!state?.report_result;
    const hasError = !!state?.error;
    const isAgentActive = running || !!state?.current_step;

    const downloadReport = () => {
        if (!state.report_result) return;
        const blob = new Blob([state.report_result], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'notebooklm_source.md';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleReset = () => {
        setState({});
    };

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/20 overflow-y-auto">
            {/* Navbar / Header */}
            <DashboardHeader hasReport={hasReport} downloadReport={downloadReport} />

            {/* Main Content Area */}
            <div className="flex-1 max-w-5xl w-full mx-auto px-8 py-8 flex flex-col justify-center">
                {hasError ? (
                    <div className="space-y-6">
                        <StatusCard
                            hasReport={hasReport}
                            error={state.error}
                            currentStep={state.current_step}
                            statusMessage={state.status_message}
                            running={running}
                        />
                        <ErrorState error={state.error!} onReset={handleReset} />
                    </div>
                ) : !isAgentActive && !hasSearch && !hasReport ? (
                    /* Welcome State */
                    <WelcomeState />
                ) : (
                    /* Active / Completed State */
                    <div className="space-y-6 flex-1 flex flex-col justify-start">
                        {/* Status Card */}
                        <StatusCard
                            hasReport={hasReport}
                            currentStep={state.current_step}
                            statusMessage={state.status_message}
                            running={running}
                        />

                        {/* Report Viewer / Preview or Search Loader */}
                        {hasReport ? (
                            <div className="space-y-4 flex-1 flex flex-col">
                                {/* High-Fidelity Download & Info Banner */}
                                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-violet-950/20 to-slate-900/50 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg animate-fade-in">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={2}
                                                stroke="currentColor"
                                                className="w-5 h-5"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                                                />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white font-mono">
                                                notebooklm_source.md
                                            </h4>
                                            <p className="text-[11px] text-slate-400">
                                                Fully structured source file optimized to feed
                                                directly into NotebookLM
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={downloadReport}
                                        className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl transition-all duration-300 shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/25 active:scale-95 cursor-pointer self-stretch sm:self-auto justify-center"
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
                                                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                                            />
                                        </svg>
                                        Download Study Guide
                                    </button>
                                </div>

                                {/* Audio Reader */}
                                <AudioReader content={state.report_result!} />

                                {/* Markdown Content Box */}
                                <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800/80 shadow-2xl backdrop-blur-md flex-1">
                                    <MarkdownViewer content={state.report_result!} />
                                </div>
                            </div>
                        ) : (
                            <SearchLoader
                                currentStep={state.current_step}
                                statusMessage={state.status_message}
                                searchQuery={state.search_query}
                                searchResult={state.search_result}
                                running={running}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
