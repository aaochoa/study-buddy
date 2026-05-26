'use client';

import React from 'react';
import { ResearchPhase } from '@/lib/types';
import { ResearchStepItem, Step } from './ResearchStepItem';
import styles from './ResearchProgressPanel.module.css';

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
    messages?: any[];
}

function getCurrentSearchQuery(messages?: any[]): string | null {
    if (!messages) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.parts) {
            for (const part of msg.parts) {
                if (part.functionCall && part.functionCall.name === 'GOOGLE_SEARCH') {
                    const query = part.functionCall.args?.query;
                    if (query) return query;
                }
            }
        }
    }
    return null;
}

export function ResearchProgressPanel({
    phase,
    searchResult,
    messages,
}: ResearchProgressPanelProps) {
    const currentOrder = phaseOrder[phase];
    const activeQuery = getCurrentSearchQuery(messages);

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
                        <ResearchStepItem
                            key={step.id}
                            step={step}
                            idx={idx}
                            isActive={isActive}
                            isDone={isDone}
                            isPending={isPending}
                            activeQuery={activeQuery}
                        />
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
