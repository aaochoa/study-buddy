'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAgent, useCopilotKit } from '@copilotkit/react-core/v2';
import { logger } from '@/lib/logger';
import styles from './CodingArena.module.css';
import { ProblemSpecPanel, Problem } from './ProblemSpecPanel';
import { CodeWorkspacePanel } from './CodeWorkspacePanel';

/**
 * CodingArena component provides an interactive workspace for practicing coding challenges.
 * It lets the user select a problem, pick a programming language, edit the solution code
 * with tab indentation, execute the tests in a sandbox, and view output/results in a terminal.
 */
export function CodingArena() {
    const [problems, setProblems] = useState<Problem[]>([]);
    const [selectedProblemId, setSelectedProblemId] = useState<string>('');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
    const [code, setCode] = useState<string>('');
    const [terminalLogs, setTerminalLogs] = useState<
        Array<{ text: string; type: 'normal' | 'success' | 'error' | 'warning' }>
    >([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [loaded, setLoaded] = useState<boolean>(false);

    // In-memory cache to save written code between tab/problem/language switches
    const codeCache = useRef<Record<string, string>>({});
    // In-memory cache to track completion status and last saved code to prevent redundant saves
    const completedRef = useRef<Record<string, boolean>>({});
    const lastSavedCodeRef = useRef<Record<string, string>>({});

    const { copilotkit } = useCopilotKit();
    const { agent: challengesAgent } = useAgent({ agentId: 'study_buddy_challenges' });
    const [wasGenerating, setWasGenerating] = useState(false);

    const currentProblem = problems.find((p) => p.id === selectedProblemId) || problems[0];

    /**
     * Fetches the global list of coding problems from the server-side database
     * and auto-selects the first available problem if none is currently selected.
     */
    const fetchProblems = useCallback(async () => {
        try {
            const res = await fetch('/api/problems');
            if (res.ok) {
                const data = await res.json();
                setProblems(data);
                if (data.length > 0) {
                    setSelectedProblemId((prev) => {
                        // If current selected ID still exists in new data, keep it, else pick first
                        return data.some((p: Problem) => p.id === prev) ? prev : data[0].id;
                    });
                }
            }
        } catch (err) {
            logger.error({ err }, 'Failed to fetch problems from DB');
        }
    }, []);

    // Fetch problems from Supabase on mount
    useEffect(() => {
        fetchProblems();
    }, [fetchProblems]);

    // Refresh problems when challenges agent finishes generating
    useEffect(() => {
        if (challengesAgent.isRunning) {
            setWasGenerating(true);
        } else if (wasGenerating && !challengesAgent.isRunning) {
            setWasGenerating(false);
            // Delay slightly to let page.tsx effect save the problems to DB
            setTimeout(() => {
                fetchProblems();
            }, 2500);
        }
    }, [challengesAgent.isRunning, wasGenerating, fetchProblems]);

    /**
     * Triggers the challenges agent to generate new coding challenges
     * to populate the problems database.
     */
    const handleGenerateNewProblems = async () => {
        if (challengesAgent.isRunning) return;

        try {
            challengesAgent.addMessage({
                id: crypto.randomUUID(),
                role: 'user',
                content: 'Generate 3 coding challenges.',
            });
            await copilotkit.runAgent({ agent: challengesAgent });
        } catch (err) {
            logger.error({ err }, 'Failed to trigger challenges agent');
        }
    };

    // Load solutions from Supabase on mount
    useEffect(() => {
        /**
         * Fetches and caches the user's previously saved solutions from the database
         * to pre-populate their workspace editor.
         */
        const loadUserSolutions = async () => {
            try {
                const response = await fetch('/api/challenges');
                if (response.ok) {
                    const data = await response.json();
                    data.forEach((sol: any) => {
                        const cacheKey = `${sol.problem_id}-${sol.language}`;
                        codeCache.current[cacheKey] = sol.code;
                        completedRef.current[cacheKey] = !!sol.completed;
                        lastSavedCodeRef.current[cacheKey] = sol.code;
                    });
                }
            } catch (err) {
                logger.error({ err }, 'Failed to load user solutions from DB');
            } finally {
                setLoaded(true);
            }
        };
        loadUserSolutions();
    }, []); // Run ONLY once on mount

    // Load template code or cached code when problem or language changes, only after DB load completes
    useEffect(() => {
        if (!currentProblem || !loaded) return;

        const cacheKey = `${selectedProblemId}-${selectedLanguage}`;

        if (codeCache.current[cacheKey] !== undefined) {
            setCode(codeCache.current[cacheKey]);
        } else {
            const langConfig = currentProblem.languages[selectedLanguage];
            const defaultCode = langConfig ? langConfig.template : '';
            setCode(defaultCode);
            codeCache.current[cacheKey] = defaultCode;
            lastSavedCodeRef.current[cacheKey] = defaultCode;
        }
    }, [selectedProblemId, selectedLanguage, currentProblem, loaded]);

    // Auto-save solution to DB on typing (debounced)
    useEffect(() => {
        if (!loaded || !selectedProblemId || !selectedLanguage) return;

        const cacheKey = `${selectedProblemId}-${selectedLanguage}`;

        // If code is the same as the last saved code, do not save
        if (code === lastSavedCodeRef.current[cacheKey]) return;

        const timer = setTimeout(async () => {
            try {
                const codeToSave = code;
                const isCompleted = !!completedRef.current[cacheKey];

                const response = await fetch('/api/challenges', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        problemId: selectedProblemId,
                        language: selectedLanguage,
                        code: codeToSave,
                        completed: isCompleted,
                    }),
                });

                if (response.ok) {
                    lastSavedCodeRef.current[cacheKey] = codeToSave;
                } else {
                    const errData = await response.json();
                    logger.error({ errData }, 'Failed to auto-save solution to DB');
                }
            } catch (dbErr) {
                logger.error({ err: dbErr }, 'Failed to auto-save solution to DB');
            }
        }, 1500); // 1.5s debounce

        return () => {
            clearTimeout(timer);
        };
    }, [code, selectedProblemId, selectedLanguage, loaded]);

    // Auto-save the previous problem/language when user switches
    const prevProblemIdRef = useRef(selectedProblemId);
    const prevLanguageRef = useRef(selectedLanguage);

    useEffect(() => {
        const prevProblemId = prevProblemIdRef.current;
        const prevLanguage = prevLanguageRef.current;

        if (
            prevProblemId &&
            prevLanguage &&
            (prevProblemId !== selectedProblemId || prevLanguage !== selectedLanguage)
        ) {
            const prevCacheKey = `${prevProblemId}-${prevLanguage}`;
            const prevCode = codeCache.current[prevCacheKey];
            if (prevCode && prevCode !== lastSavedCodeRef.current[prevCacheKey]) {
                const isCompleted = !!completedRef.current[prevCacheKey];
                fetch('/api/challenges', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        problemId: prevProblemId,
                        language: prevLanguage,
                        code: prevCode,
                        completed: isCompleted,
                    }),
                })
                    .then((res) => {
                        if (res.ok) {
                            lastSavedCodeRef.current[prevCacheKey] = prevCode;
                        }
                    })
                    .catch((err) =>
                        logger.error({ err }, 'Failed to save previous challenge on switch'),
                    );
            }
        }

        prevProblemIdRef.current = selectedProblemId;
        prevLanguageRef.current = selectedLanguage;
    }, [selectedProblemId, selectedLanguage]);

    // Auto-save on component unmount
    const codeRef = useRef(code);
    const selectedProblemIdRef = useRef(selectedProblemId);
    const selectedLanguageRef = useRef(selectedLanguage);

    useEffect(() => {
        codeRef.current = code;
        selectedProblemIdRef.current = selectedProblemId;
        selectedLanguageRef.current = selectedLanguage;
    }, [code, selectedProblemId, selectedLanguage]);

    useEffect(() => {
        const lastSavedCode = lastSavedCodeRef.current;
        const completed = completedRef.current;
        return () => {
            const problemId = selectedProblemIdRef.current;
            const language = selectedLanguageRef.current;
            const cacheKey = `${problemId}-${language}`;
            const currentCode = codeRef.current;

            if (problemId && language && currentCode && currentCode !== lastSavedCode[cacheKey]) {
                const isCompleted = !!completed[cacheKey];
                fetch('/api/challenges', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        problemId,
                        language,
                        code: currentCode,
                        completed: isCompleted,
                    }),
                }).catch((err) => logger.error({ err }, 'Failed to save on unmount'));
            }
        };
    }, []);

    /**
     * Updates the code state and caches the code in memory as the user types.
     *
     * @param e - The text area change event.
     */
    const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setCode(val);
        const cacheKey = `${selectedProblemId}-${selectedLanguage}`;
        codeCache.current[cacheKey] = val;
    };

    /**
     * Intercepts the keydown event to support 4-spaces Tab key indentation
     * inside the textarea code editor.
     *
     * @param e - The keyboard event.
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const target = e.currentTarget;
            const start = target.selectionStart;
            const end = target.selectionEnd;
            const val = target.value;

            const newVal = val.substring(0, start) + '    ' + val.substring(end);
            setCode(newVal);

            const cacheKey = `${selectedProblemId}-${selectedLanguage}`;
            codeCache.current[cacheKey] = newVal;

            // Maintain cursor position after state update
            setTimeout(() => {
                target.selectionStart = target.selectionEnd = start + 4;
            }, 0);
        }
    };

    /**
     * Submits the user's code to the compilation/sandbox execution API,
     * updates the console/terminal output, and persists the solution state.
     */
    const handleRunCode = async () => {
        if (loading) return;
        setLoading(true);
        setTerminalLogs([
            {
                text: `[1/3] Preparing workspace for ${selectedLanguage.toUpperCase()} solution...`,
                type: 'normal',
            },
            { text: '[2/3] Executing compiler/interpreter in local sandbox...', type: 'normal' },
        ]);

        try {
            const res = await fetch('/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    language: selectedLanguage,
                    problemId: selectedProblemId,
                }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Execution failed');
            }

            const data = await res.json();

            const logs: Array<{ text: string; type: 'normal' | 'success' | 'error' | 'warning' }> =
                [];
            logs.push({ text: '[3/3] Sandbox execution finished.', type: 'normal' });

            if (data.error) {
                const isSyntax = data.error.toLowerCase().includes('syntax');
                const prefix = isSyntax ? '--- SYNTAX ERROR ---' : '--- EXECUTION ERROR ---';
                logs.push({ text: `\n${prefix}\n${data.error}`, type: 'error' });
            }

            if (data.output) {
                logs.push({ text: `\n=== CONSOLE OUTPUT ===\n${data.output}`, type: 'normal' });
            }

            if (data.total > 0) {
                const rateText = `\nRESULT: ${data.passed}/${data.total} Test Cases Passed.`;
                if (data.success) {
                    logs.push({
                        text: rateText + '\n\n🎉 Code execution completed successfully!',
                        type: 'success',
                    });
                } else {
                    logs.push({
                        text:
                            rateText +
                            '\n\n⚠️ Mismatch in assertion output. Please review test failure logs.',
                        type: 'warning',
                    });
                }
            } else if (!data.error) {
                logs.push({
                    text: '\n⚠️ Code executed, but no assertions were reported.',
                    type: 'warning',
                });
            }

            setTerminalLogs((prev) => [...prev, ...logs]);

            // Save solution to Supabase
            const cacheKey = `${selectedProblemId}-${selectedLanguage}`;
            const isCompleted = !!data.success;
            completedRef.current[cacheKey] = isCompleted;

            try {
                const response = await fetch('/api/challenges', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        problemId: selectedProblemId,
                        language: selectedLanguage,
                        code: code,
                        completed: isCompleted,
                    }),
                });
                if (response.ok) {
                    lastSavedCodeRef.current[cacheKey] = code;
                } else {
                    const errData = await response.json();
                    logger.error({ errData }, 'Failed to save solution to DB');
                }
            } catch (dbErr) {
                logger.error({ err: dbErr }, 'Failed to auto-save solution to DB');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setTerminalLogs((prev) => [
                ...prev,
                {
                    text: `\n[FATAL ERROR] Compilation/execution server error: ${message}`,
                    type: 'error',
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <ProblemSpecPanel
                problems={problems}
                selectedProblemId={selectedProblemId}
                onSelectProblem={setSelectedProblemId}
                selectedLanguage={selectedLanguage}
                onSelectLanguage={setSelectedLanguage}
                currentProblem={currentProblem}
                isGenerating={challengesAgent.isRunning}
                onGenerateNew={handleGenerateNewProblems}
            />

            <CodeWorkspacePanel
                code={code}
                onCodeChange={handleCodeChange}
                onKeyDown={handleKeyDown}
                terminalLogs={terminalLogs}
                loading={loading}
                onRunCode={handleRunCode}
            />
        </div>
    );
}
