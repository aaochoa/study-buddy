// State of the agent, make sure this aligns with your agent's state.
export type AgentState = {
    search_result?: string;
    report_result?: string;
};

export type ResearchPhase = 'idle' | 'researching' | 'editing' | 'done' | 'error';
