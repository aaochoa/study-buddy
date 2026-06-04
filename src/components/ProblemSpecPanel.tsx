import React from 'react';
import styles from './CodingArena.module.css';

export interface LanguageConfig {
    template: string;
    harness: string;
}

export interface Problem {
    id: string;
    title: string;
    difficulty: string;
    description: string;
    languages: Record<string, LanguageConfig>;
}

interface ProblemSpecPanelProps {
    problems: Problem[];
    selectedProblemId: string;
    onSelectProblem: (id: string) => void;
    selectedLanguage: string;
    onSelectLanguage: (lang: string) => void;
    currentProblem?: Problem;
    isGenerating: boolean;
    onGenerateNew: () => void;
}

export function ProblemSpecPanel({
    problems,
    selectedProblemId,
    onSelectProblem,
    selectedLanguage,
    onSelectLanguage,
    currentProblem,
    isGenerating,
    onGenerateNew,
}: ProblemSpecPanelProps) {
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
        <div className={styles.leftPanel}>
            <div className={styles.panelHeader}>
                <div className={styles.selectors}>
                    <div className={styles.selectGroup}>
                        <select
                            value={selectedProblemId}
                            onChange={(e) => onSelectProblem(e.target.value)}
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
                            onChange={(e) => onSelectLanguage(e.target.value)}
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

                        <button
                            type="button"
                            onClick={onGenerateNew}
                            disabled={isGenerating}
                            className={styles.generateBtn}
                            title="Generate new challenges based on your latest study guide"
                            aria-label="Generate new problems"
                        >
                            {isGenerating ? 'Generating...' : '✨ Generate'}
                        </button>
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
    );
}
