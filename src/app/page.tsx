'use client';

import { GuideFile } from '@/components/SavedGuides';
import {
    CopilotSidebar,
    useConfigureSuggestions,
    useAgent,
    useCopilotKit,
} from '@copilotkit/react-core/v2';
import { useEffect, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

// ... existing component definition continues below

import { AgentState } from '@/lib/types';
import { useAgentSelector } from '@/components/CopilotWrapper';
import { MainContent } from '@/components/MainContent';
import { CodingArena } from '@/components/CodingArena';
import { useReportAutoSave } from '@/hooks/useReportAutoSave';

/**
 * CopilotKitPage component serves as the main interactive page for the Study Buddy application,
 * integrating CopilotKit agents for research/Q&A, suggestions, and rendering MainContent/CodingArena.
 */
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

    // Automatically save and show report when report generation finishes
    useReportAutoSave({
        researchAgent,
        setSelectedReport,
        setSelectedFilename,
        setRefreshTrigger,
    });

    // Automatically run the challenges agent when the study guide completes
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

        if (
            !researchAgent.isRunning &&
            reportContent &&
            !challengesAgent.isRunning &&
            !challengesState.code_challenges &&
            !challengesTriggered
        ) {
            /**
             * Triggers the independent challenges agent to generate coding problems
             * based on the newly completed study guide.
             */
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
                    logger.error({ err }, 'Failed to trigger independent challenges agent');
                }
            };
            runChallenges();
        }
    }, [
        researchAgent.isRunning,
        state.report_result,
        researchAgent.messages,
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

        /**
         * Helper function to post diagnostics/logs to the server-side logging endpoint.
         *
         * @param level - The log level (e.g. INFO, DEBUG, ERROR).
         * @param message - The log payload message.
         */
        const logToServer = (level: string, message: any) => {
            fetch('/api/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ level, message }),
            }).catch(() => {});
        };

        /**
         * Traverses the messages history in reverse to find the latest
         * JSON-formatted block containing coding challenges definitions.
         *
         * @param messages - The history of messages.
         * @returns The JSON challenges string if found, or null.
         */
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
            /**
             * Extracts, cleans, parses, and batch saves the generated challenges JSON
             * into the database by calling the problems API.
             */
            const saveChallenges = async () => {
                /**
                 * Local logging utility to send progress reports of the save operation to the log endpoint.
                 */
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
                            logger.info('Successfully saved generated challenges to DB');
                        } else {
                            const errData = await response.json();
                            logToServer('ERROR', { type: 'Server Error', data: errData });
                            logger.error(
                                { errData },
                                'Failed to save challenges to DB (Server Error)',
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
                    logger.error({ err }, 'Failed to parse or auto-save generated challenges');
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

    /**
     * Callback invoked to select and display a specific study guide in the dashboard workspace.
     *
     * @param content - The markdown content of the guide.
     * @param filename - The filename of the guide.
     */
    const handleSelectGuide = useCallback((content: string, filename: string) => {
        setSelectedReport(content);
        setSelectedFilename(filename);
    }, []);

    /**
     * Callback invoked to clear the current active study guide selection, reverting back to Research Mode.
     */
    const handleClearGuide = useCallback(() => {
        setSelectedReport(null);
        setSelectedFilename('');
    }, []);

    /**
     * Callback invoked when the saved guides list finishes loading from the server.
     * Auto-selects the newest guide if the auto-select flag is true.
     *
     * @param guides - List of guide files retrieved.
     */
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
                    logger.error({ err }, 'Failed to auto-load newest guide');
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
