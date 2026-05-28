'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CopilotKit } from '@copilotkit/react-core/v2';

type Theme = 'light' | 'dark';

type AgentContextType = {
    activeAgentId: string;
    setActiveAgentId: (id: string) => void;
    currentView: 'research' | 'coding';
    setCurrentView: (view: 'research' | 'coding') => void;
    theme: Theme;
    toggleTheme: () => void;
};

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function CopilotWrapper({ children }: { children: React.ReactNode }) {
    const [activeAgentId, setActiveAgentId] = useState('study_buddy_agent');
    const [currentView, setCurrentView] = useState<'research' | 'coding'>('research');
    const [theme, setTheme] = useState<Theme>('dark');

    // On mount, read saved preference or fall back to system preference
    useEffect(() => {
        const saved = localStorage.getItem('study-buddy-theme') as Theme | null;
        if (saved === 'light' || saved === 'dark') {
            setTheme(saved);
        } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            setTheme('light');
        }
    }, []);

    // Sync the `dark` class on <html> and persist whenever theme changes
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('study-buddy-theme', theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    }, []);

    const value = React.useMemo(
        () => ({
            activeAgentId,
            setActiveAgentId,
            currentView,
            setCurrentView,
            theme,
            toggleTheme,
        }),
        [activeAgentId, currentView, theme, toggleTheme],
    );

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
