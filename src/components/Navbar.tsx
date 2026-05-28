'use client';

import React from 'react';
import styles from './Navbar.module.css';
import { useAgentSelector } from './CopilotWrapper';

export function Navbar() {
    const { currentView, setCurrentView, theme, toggleTheme } = useAgentSelector();

    return (
        <nav className={styles.nav}>
            <div className={styles.brand}>
                <span className={styles.brandIcon}>🎓</span>
                <span>Study Buddy</span>
            </div>
            <div className={styles.tabs}>
                <button
                    type="button"
                    onClick={() => setCurrentView('research')}
                    className={[
                        styles.tab,
                        currentView === 'research' ? styles.activeTab : '',
                    ].join(' ')}
                >
                    🔍 Research
                </button>
                <button
                    type="button"
                    onClick={() => setCurrentView('coding')}
                    className={[styles.tab, currentView === 'coding' ? styles.activeTab : ''].join(
                        ' ',
                    )}
                >
                    💻 Code Arena
                </button>
            </div>
            <button
                type="button"
                onClick={toggleTheme}
                className={styles.themeToggle}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
                {theme === 'dark' ? '☀️' : '🌙'}
            </button>
        </nav>
    );
}
