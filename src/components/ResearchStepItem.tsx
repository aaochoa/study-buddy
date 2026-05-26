'use client';

import React from 'react';
import { ResearchPhase } from '@/lib/types';
import styles from './ResearchProgressPanel.module.css';

export interface Step {
    id: ResearchPhase;
    label: string;
    description: string;
    icon: string;
}

interface ResearchStepItemProps {
    step: Step;
    idx: number;
    isActive: boolean;
    isDone: boolean;
    isPending: boolean;
    activeQuery: string | null;
}

export function ResearchStepItem({
    step,
    idx,
    isActive,
    isDone,
    isPending,
    activeQuery,
}: ResearchStepItemProps) {
    return (
        <div
            className={[
                styles.step,
                isActive ? styles.stepActive : '',
                isDone ? styles.stepDone : '',
                isPending ? styles.stepPending : '',
            ].join(' ')}
        >
            {/* Connector line above (not for first) */}
            {idx > 0 && (
                <div className={[styles.connector, isDone ? styles.connectorDone : ''].join(' ')} />
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
                        {isActive && step.id === 'researching' && activeQuery && (
                            <div className={styles.activeQueryContainer}>
                                <span className={styles.activeQueryLabel}>
                                    Active Google Search:
                                </span>
                                <span className={styles.activeQueryText}>
                                    &ldquo;{activeQuery}&rdquo;
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
