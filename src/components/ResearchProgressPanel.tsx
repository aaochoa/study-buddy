'use client';

import React from 'react';
import { ResearchPhase } from '@/lib/types';
import styles from './ResearchProgressPanel.module.css';

interface Step {
    id: ResearchPhase;
    label: string;
    description: string;
    icon: string;
}

const STEPS: Step[] = [
    {
        id: 'researching',
        label: 'Researching',
        description: 'Searching the web for authoritative sources…',
        icon: '🔍',
    },
    {
        id: 'editing',
        label: 'Editing',
        description: 'Synthesising raw findings into a study guide…',
        icon: '✍️',
    },
    {
        id: 'done',
        label: 'Complete',
        description: 'Your personalised study guide is ready.',
        icon: '✅',
    },
];

const phaseOrder: Record<ResearchPhase, number> = {
    idle: -1,
    researching: 0,
    editing: 1,
    done: 2,
    error: -1,
};

interface ResearchProgressPanelProps {
    phase: ResearchPhase;
    searchResult?: string;
}

export function ResearchProgressPanel({ phase, searchResult }: ResearchProgressPanelProps) {
    const currentOrder = phaseOrder[phase];

    return (
        <div className={styles.panel}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerIcon}>📚</div>
                <div>
                    <h2 className={styles.headerTitle}>Research In Progress</h2>
                    <p className={styles.headerSubtitle}>
                        Your Study Buddy is building a personalised study guide
                    </p>
                </div>
            </div>

            {/* Steps */}
            <div className={styles.steps}>
                {STEPS.map((step, idx) => {
                    const stepOrder = phaseOrder[step.id];
                    const isActive = step.id === phase;
                    const isDone = currentOrder > stepOrder;
                    const isPending = currentOrder < stepOrder;

                    return (
                        <div
                            key={step.id}
                            className={[
                                styles.step,
                                isActive ? styles.stepActive : '',
                                isDone ? styles.stepDone : '',
                                isPending ? styles.stepPending : '',
                            ].join(' ')}
                        >
                            {/* Connector line above (not for first) */}
                            {idx > 0 && (
                                <div
                                    className={[
                                        styles.connector,
                                        isDone ? styles.connectorDone : '',
                                    ].join(' ')}
                                />
                            )}

                            <div className={styles.stepInner}>
                                {/* Step circle */}
                                <div className={styles.circle}>
                                    {isDone ? (
                                        <span className={styles.checkmark}>✓</span>
                                    ) : isActive ? (
                                        <span className={styles.spinner} aria-hidden />
                                    ) : (
                                        <span className={styles.stepNumber}>{idx + 1}</span>
                                    )}
                                </div>

                                {/* Step text */}
                                <div className={styles.stepContent}>
                                    <span className={styles.stepIcon}>{step.icon}</span>
                                    <div>
                                        <p className={styles.stepLabel}>{step.label}</p>
                                        <p className={styles.stepDesc}>{step.description}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Raw search excerpt preview */}
            {searchResult && phase === 'editing' && (
                <div className={styles.preview}>
                    <p className={styles.previewLabel}>Raw research collected — editing now…</p>
                    <p className={styles.previewText}>
                        {searchResult.slice(0, 260)}
                        {searchResult.length > 260 && '…'}
                    </p>
                </div>
            )}
        </div>
    );
}
