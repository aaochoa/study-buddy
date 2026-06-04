'use client';

import React, { useMemo } from 'react';
import { useAgent } from '@copilotkit/react-core/v2';
import { AgentState, ResearchPhase } from '@/lib/types';
import { ResearchProgressPanel } from './ResearchProgressPanel';
import { ResearchResult } from './ResearchResult';
import styles from './ResearchProgress.module.css';

export function ResearchProgress() {
    const { agent: researchAgent } = useAgent({ agentId: 'study_buddy_agent' });
    const { agent: challengesAgent } = useAgent({ agentId: 'study_buddy_challenges' });

    const state = (researchAgent.state ?? {}) as AgentState;
    const challengesState = (challengesAgent.state ?? {}) as AgentState;

    const phase = useMemo<ResearchPhase>(() => {
        // First check if the final report is in messages (or state)
        const hasFinalReport =
            state.report_result ||
            researchAgent.messages?.some((msg: any) => {
                if (msg.role === 'assistant' || msg.role === 'agent') {
                    let content = '';
                    if (typeof msg.content === 'string') {
                        content = msg.content;
                    } else if (Array.isArray(msg.parts)) {
                        content = msg.parts.map((part: any) => part.text || '').join('');
                    }
                    return (
                        content.includes('Click here to download') ||
                        content.includes('data:application/octet-stream;base64')
                    );
                }
                return false;
            });

        if (hasFinalReport) {
            return challengesAgent.isRunning || !challengesState.code_challenges
                ? 'challenges'
                : 'done';
        }

        if (
            state.search_result ||
            state.architecture_result ||
            state.questions_result ||
            state.pitfalls_result ||
            state.challenges_result
        ) {
            return 'editing';
        }

        if (researchAgent.isRunning) {
            // Check if assistant has started streaming a message
            const hasStartedStreaming = researchAgent.messages?.some(
                (msg: any) => msg.role === 'assistant' || msg.role === 'agent',
            );
            return hasStartedStreaming ? 'editing' : 'researching';
        }

        return 'idle';
    }, [
        state.search_result,
        state.architecture_result,
        state.questions_result,
        state.pitfalls_result,
        state.challenges_result,
        state.report_result,
        researchAgent.messages,
        researchAgent.isRunning,
        challengesAgent.isRunning,
        challengesState.code_challenges,
    ]);

    const combinedSearchResult = useMemo(() => {
        if (state.search_result) return state.search_result;
        const parts = [];
        if (state.architecture_result) parts.push(`[Architecture]\n${state.architecture_result}`);
        if (state.questions_result) parts.push(`[Questions]\n${state.questions_result}`);
        if (state.pitfalls_result) parts.push(`[Pitfalls]\n${state.pitfalls_result}`);
        if (state.challenges_result) parts.push(`[Challenges]\n${state.challenges_result}`);
        if (parts.length > 0) return parts.join('\n\n');

        // Fallback: If editing and we are streaming the report, show current streamed content
        const assistantMsg = researchAgent.messages?.find(
            (msg: any) => msg.role === 'assistant' || msg.role === 'agent',
        ) as any;
        if (assistantMsg) {
            let content = '';
            if (typeof assistantMsg.content === 'string') {
                content = assistantMsg.content;
            } else if (Array.isArray(assistantMsg.parts)) {
                content = assistantMsg.parts.map((part: any) => part.text || '').join('');
            }
            return content;
        }

        return '';
    }, [
        state.search_result,
        state.architecture_result,
        state.questions_result,
        state.pitfalls_result,
        state.challenges_result,
        researchAgent.messages,
    ]);

    if (phase === 'idle') return null;

    // Use active agent's messages to extract function calls / search queries
    const activeMessages =
        phase === 'challenges' ? challengesAgent.messages : researchAgent.messages;

    return (
        <div className={styles['research-container']}>
            <ResearchProgressPanel
                phase={phase}
                searchResult={combinedSearchResult}
                messages={activeMessages}
            />
            {phase === 'done' && state.report_result && (
                <ResearchResult report={state.report_result} />
            )}
        </div>
    );
}
