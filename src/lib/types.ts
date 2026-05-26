// State of the agent, make sure this aligns with your agent's state.
export type AgentState = {
    search_result?: string;
    architecture_result?: string;
    questions_result?: string;
    pitfalls_result?: string;
    challenges_result?: string;
    report_result?: string;
};

export type ResearchPhase = 'idle' | 'researching' | 'editing' | 'done' | 'error';
