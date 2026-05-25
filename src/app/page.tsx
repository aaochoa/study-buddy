'use client';

import { ResearchProgress } from '@/components/ResearchProgress';
import { CopilotSidebar, useConfigureSuggestions } from '@copilotkit/react-core/v2';
import React from 'react';

export default function CopilotKitPage() {
    useConfigureSuggestions({
        suggestions: [
            {
                title: 'React & Next.js',
                message: 'Research React Server Components and compile an interview guide.',
            },
            {
                title: 'Node.js Internals',
                message:
                    'Research the Node.js Event Loop architecture and common interview topics.',
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

    return (
        <main>
            <MainContent />
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

function MainContent() {
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

            {/* Research progress + result — only visible while/after the agent runs */}
            <ResearchProgress />
        </div>
    );
}
