'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAgent, useCopilotKit } from '@copilotkit/react-core/v2';
import styles from './CodingArena.module.css';
import { ProblemSpecPanel, Problem } from './ProblemSpecPanel';
import { CodeWorkspacePanel } from './CodeWorkspacePanel';

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

    const { copilotkit } = useCopilotKit();
    const { agent: challengesAgent } = useAgent({ agentId: 'study_buddy_challenges' });
    const [wasGenerating, setWasGenerating] = useState(false);

    const currentProblem = problems.find((p) => p.id === selectedProblemId) || problems[0];

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
            console.error('Failed to fetch problems from DB:', err);
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
            console.error('Failed to trigger challenges agent:', err);
        }
    };

    // Load solutions from Supabase on mount
    useEffect(() => {
        const loadUserSolutions = async () => {
            try {
                const response = await fetch('/api/challenges');
                if (response.ok) {
                    const data = await response.json();
                    data.forEach((sol: any) => {
                        const cacheKey = `${sol.problem_id}-${sol.language}`;
                        codeCache.current[cacheKey] = sol.code;
                    });

                    // Set code for currently selected if present
                    const currentCacheKey = `${selectedProblemId}-${selectedLanguage}`;
                    if (codeCache.current[currentCacheKey] !== undefined) {
                        setCode(codeCache.current[currentCacheKey]);
                    }
                }
            } catch (err) {
                console.error('Failed to load user solutions from DB:', err);
            } finally {
                setLoaded(true);
            }
        };
        loadUserSolutions();
    }, [selectedProblemId, selectedLanguage]);

    // Load template code when problem or language changes, only after DB load completes
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
        }
    }, [selectedProblemId, selectedLanguage, currentProblem, loaded]);

    // Keep cache updated when user types
    const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setCode(val);
        const cacheKey = `${selectedProblemId}-${selectedLanguage}`;
        codeCache.current[cacheKey] = val;
    };

    // Support Tab key indentation inside textarea
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
            try {
                await fetch('/api/challenges', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        problemId: selectedProblemId,
                        language: selectedLanguage,
                        code: code,
                        completed: !!data.success,
                    }),
                });
            } catch (dbErr) {
                console.error('Failed to auto-save solution to DB:', dbErr);
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
