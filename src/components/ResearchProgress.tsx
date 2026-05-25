'use client';

import React, { useMemo } from 'react';
import { useAgent } from '@copilotkit/react-core/v2';
import { AgentState, ResearchPhase } from '@/lib/types';
import { ResearchProgressPanel } from './ResearchProgressPanel';
import { ResearchResult } from './ResearchResult';
import styles from './ResearchProgress.module.css';

export function ResearchProgress() {
    const { agent } = useAgent({ agentId: 'study_buddy_agent' });
    const state = (agent.state ?? {}) as AgentState;

    const phase = useMemo<ResearchPhase>(() => {
        if (state.report_result) return 'done';
        if (state.search_result) return 'editing';
        if (agent.isRunning) return 'researching';
        return 'idle';
    }, [state.search_result, state.report_result, agent.isRunning]);

    if (phase === 'idle') return null;

    return (
        <div className={styles['research-container']}>
            <ResearchProgressPanel phase={phase} searchResult={state.search_result} />
            {phase === 'done' && state.report_result && (
                <ResearchResult report={state.report_result} />
            )}
        </div>
    );
}
