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
        if (
            state.search_result ||
            state.architecture_result ||
            state.questions_result ||
            state.pitfalls_result ||
            state.challenges_result
        ) {
            return 'editing';
        }
        if (agent.isRunning) return 'researching';
        return 'idle';
    }, [
        state.search_result,
        state.architecture_result,
        state.questions_result,
        state.pitfalls_result,
        state.challenges_result,
        state.report_result,
        agent.isRunning,
    ]);

    const combinedSearchResult = useMemo(() => {
        if (state.search_result) return state.search_result;
        const parts = [];
        if (state.architecture_result) parts.push(`[Architecture]\n${state.architecture_result}`);
        if (state.questions_result) parts.push(`[Questions]\n${state.questions_result}`);
        if (state.pitfalls_result) parts.push(`[Pitfalls]\n${state.pitfalls_result}`);
        if (state.challenges_result) parts.push(`[Challenges]\n${state.challenges_result}`);
        return parts.join('\n\n');
    }, [
        state.search_result,
        state.architecture_result,
        state.questions_result,
        state.pitfalls_result,
        state.challenges_result,
    ]);

    if (phase === 'idle') return null;

    return (
        <div className={styles['research-container']}>
            <ResearchProgressPanel
                phase={phase}
                searchResult={combinedSearchResult}
                messages={agent.messages}
            />
            {phase === 'done' && state.report_result && (
                <ResearchResult report={state.report_result} />
            )}
        </div>
    );
}
