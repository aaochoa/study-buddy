'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './CodingArena.module.css';
import problemsData from '../fixtures/problems.json';

// Type definitions
interface LanguageConfig {
    template: string;
    harness: string;
}

interface Problem {
    id: string;
    title: string;
    difficulty: string;
    description: string;
    languages: Record<string, LanguageConfig>;
}

export function CodingArena() {
    const problems = problemsData as Problem[];

    const [selectedProblemId, setSelectedProblemId] = useState<string>(problems[0]?.id || '');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
    const [code, setCode] = useState<string>('');
    const [terminalLogs, setTerminalLogs] = useState<
        Array<{ text: string; type: 'normal' | 'success' | 'error' | 'warning' }>
    >([]);
    const [loading, setLoading] = useState<boolean>(false);

    // In-memory cache to save written code between tab/problem/language switches
    const codeCache = useRef<Record<string, string>>({});

    const currentProblem = problems.find((p) => p.id === selectedProblemId) || problems[0];

    // Load template code when problem or language changes
    useEffect(() => {
        if (!currentProblem) return;

        const cacheKey = `${selectedProblemId}-${selectedLanguage}`;

        if (codeCache.current[cacheKey] !== undefined) {
            setCode(codeCache.current[cacheKey]);
        } else {
            const langConfig = currentProblem.languages[selectedLanguage];
            const defaultCode = langConfig ? langConfig.template : '';
            setCode(defaultCode);
            codeCache.current[cacheKey] = defaultCode;
        }
    }, [selectedProblemId, selectedLanguage, currentProblem]);

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
            const start = e.currentTarget.selectionStart;
            const end = e.currentTarget.selectionEnd;
            const val = e.currentTarget.value;

            const newVal = val.substring(0, start) + '    ' + val.substring(end);
            setCode(newVal);

            const cacheKey = `${selectedProblemId}-${selectedLanguage}`;
            codeCache.current[cacheKey] = newVal;

            // Maintain cursor position after state update
            setTimeout(() => {
                e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 4;
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
                logs.push({ text: `\n=== ERROR LOGGER ===\n${data.error}`, type: 'error' });
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

    const getDifficultyClass = (diff: string) => {
        switch (diff.toLowerCase()) {
            case 'easy':
                return styles.easy;
            case 'medium':
                return styles.medium;
            case 'hard':
                return styles.hard;
            default:
                return '';
        }
    };

    // Format markdown tags inside problem description
    const formatDescription = (desc: string) => {
        return desc.split('\n').map((line, index) => {
            if (line.startsWith('###')) {
                return (
                    <h3 key={index} className="text-md font-bold mt-4 mb-2 text-indigo-300">
                        {line.replace('###', '').trim()}
                    </h3>
                );
            }
            if (line.startsWith('-')) {
                return (
                    <ul key={index} className="list-disc pl-5 my-1">
                        <li>{line.substring(1).trim()}</li>
                    </ul>
                );
            }
            // Simple inline code replacement
            const parts = line.split('`');
            if (parts.length > 1) {
                return (
                    <p key={index} className="my-2">
                        {parts.map((p, i) =>
                            i % 2 === 1 ? (
                                <code
                                    key={i}
                                    className="bg-indigo-950/40 border border-indigo-900/30 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-xs"
                                >
                                    {p}
                                </code>
                            ) : (
                                p
                            ),
                        )}
                    </p>
                );
            }
            return (
                <p key={index} className="my-2">
                    {line}
                </p>
            );
        });
    };

    return (
        <div className={styles.container}>
            {/* ── LEFT PANEL: PROBLEM SPEC ──────────────────── */}
            <div className={styles.leftPanel}>
                <div className={styles.panelHeader}>
                    <div className={styles.selectors}>
                        <div className={styles.selectGroup}>
                            <select
                                value={selectedProblemId}
                                onChange={(e) => setSelectedProblemId(e.target.value)}
                                className={styles.select}
                                aria-label="Select Problem"
                            >
                                {problems.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.title}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                className={styles.select}
                                aria-label="Select Programming Language"
                            >
                                {Object.keys(currentProblem?.languages || {}).map((lang) => (
                                    <option key={lang} value={lang}>
                                        {lang === 'cpp'
                                            ? 'C++'
                                            : lang.charAt(0).toUpperCase() + lang.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {currentProblem && (
                            <span
                                className={[
                                    styles.badge,
                                    getDifficultyClass(currentProblem.difficulty),
                                ].join(' ')}
                            >
                                {currentProblem.difficulty}
                            </span>
                        )}
                    </div>
                </div>

                <div className={styles.scrollContent}>
                    {currentProblem && (
                        <div>
                            <h2
                                className="text-xl font-bold mb-4"
                                style={{ color: 'var(--text-heading)' }}
                            >
                                {currentProblem.title}
                            </h2>
                            <div className={styles.problemDesc}>
                                {formatDescription(currentProblem.description)}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── RIGHT PANEL: CODE WORKSPACE ────────────────── */}
            <div className={styles.rightPanel}>
                <div className={styles.panelHeader}>
                    <h3 className={styles.panelTitle}>
                        <span>📝 Editor Workspace</span>
                    </h3>
                </div>

                <div className={styles.editorWrapper}>
                    <textarea
                        value={code}
                        onChange={handleCodeChange}
                        onKeyDown={handleKeyDown}
                        className={styles.textarea}
                        spellCheck="false"
                        placeholder="Write your solution here..."
                        aria-label="Code Editor"
                    />
                </div>

                <div className={styles.terminalWrapper}>
                    <div className={styles.terminalHeader}>
                        <span
                            className="text-xs font-semibold"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            🖥️ Sandbox Terminal
                        </span>
                        <button
                            type="button"
                            onClick={handleRunCode}
                            disabled={loading || !code}
                            className={styles.submitBtn}
                        >
                            {loading ? 'Executing...' : 'Run & Validate'}
                        </button>
                    </div>

                    <div className={styles.terminalLogs}>
                        {terminalLogs.length === 0 ? (
                            <span
                                className="font-mono text-xs"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                {`Terminal idle. Click 'Run & Validate' to execute test assertions...`}
                            </span>
                        ) : (
                            terminalLogs.map((log, index) => {
                                let logClass = styles.logNormal;
                                if (log.type === 'success') logClass = styles.logSuccess;
                                else if (log.type === 'error') logClass = styles.logError;
                                else if (log.type === 'warning') logClass = styles.logWarning;

                                return (
                                    <div
                                        key={index}
                                        className={[logClass, 'font-mono text-xs mb-1'].join(' ')}
                                    >
                                        {log.text}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
