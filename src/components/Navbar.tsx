'use client';

import React, { useEffect, useState } from 'react';
import styles from './Navbar.module.css';
import { useAgentSelector } from './CopilotWrapper';
import { createClient } from '@/utils/supabase/client';
import { signout } from '@/app/login/actions';
import { User } from '@supabase/supabase-js';

export function Navbar() {
    const { currentView, setCurrentView, theme, toggleTheme } = useAgentSelector();
    const [user, setUser] = useState<User | null>(null);
    const supabase = createClient();

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase]);

    const handleSignOut = async () => {
        await signout();
    };

    return (
        <nav className={styles.nav}>
            <div className={styles.brand}>
                <span className={styles.brandIcon}>🎓</span>
                <span>Study Buddy</span>
            </div>

            {user && (
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
                        className={[
                            styles.tab,
                            currentView === 'coding' ? styles.activeTab : '',
                        ].join(' ')}
                    >
                        💻 Code Arena
                    </button>
                </div>
            )}

            <div className={styles.rightSection}>
                {user && (
                    <div className={styles.userContainer}>
                        <span className={styles.userEmail} title={user.email}>
                            {user.email}
                        </span>
                        <button type="button" onClick={handleSignOut} className={styles.signOutBtn}>
                            Sign Out
                        </button>
                    </div>
                )}
                <button
                    type="button"
                    onClick={toggleTheme}
                    className={styles.themeToggle}
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
            </div>
        </nav>
    );
}
