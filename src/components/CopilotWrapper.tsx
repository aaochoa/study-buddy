'use client';

import React, { createContext, useContext, useState } from 'react';
import { CopilotKit } from '@copilotkit/react-core/v2';

type AgentContextType = {
    activeAgentId: string;
    setActiveAgentId: (id: string) => void;
};

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function CopilotWrapper({ children }: { children: React.ReactNode }) {
    const [activeAgentId, setActiveAgentId] = useState('study_buddy_agent');

    const value = React.useMemo(() => ({ activeAgentId, setActiveAgentId }), [activeAgentId]);

    return (
        <AgentContext.Provider value={value}>
            <CopilotKit runtimeUrl="/api/copilotkit" agent={activeAgentId}>
                {children}
            </CopilotKit>
        </AgentContext.Provider>
    );
}

export function useAgentSelector() {
    const context = useContext(AgentContext);
    if (!context) {
        throw new Error('useAgentSelector must be used within a CopilotWrapper');
    }
    return context;
}
