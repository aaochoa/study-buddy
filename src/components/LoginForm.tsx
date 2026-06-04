'use client';

import React, { useState, useTransition } from 'react';
import styles from './LoginForm.module.css';
import { login, signup } from '@/app/login/actions';

export function LoginForm() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = (isSignUp ? await signup(formData) : await login(formData)) as any;

            if (result?.error) {
                setError(result.error);
            } else if (result?.success) {
                setSuccess(result.success);
            }
        });
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.logo}>🎓</div>
                    <h1 className={styles.title}>Study Buddy</h1>
                    <p className={styles.subtitle}>
                        {isSignUp
                            ? 'Create an account to start studying'
                            : 'Sign in to access your study guides'}
                    </p>
                </div>

                <div className={styles.tabs}>
                    <button
                        type="button"
                        className={[styles.tab, !isSignUp ? styles.activeTab : ''].join(' ')}
                        onClick={() => {
                            setIsSignUp(false);
                            setError(null);
                            setSuccess(null);
                        }}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        className={[styles.tab, isSignUp ? styles.activeTab : ''].join(' ')}
                        onClick={() => {
                            setIsSignUp(true);
                            setError(null);
                            setSuccess(null);
                        }}
                    >
                        Create Account
                    </button>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    {error && (
                        <div className={styles.errorAlert}>
                            <span className={styles.alertIcon}>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className={styles.successAlert}>
                            <span className={styles.alertIcon}>✅</span>
                            <span>{success}</span>
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <label htmlFor="email" className={styles.label}>
                            Email Address
                            <input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="you@example.com"
                                required
                                className={styles.input}
                                autoComplete="email"
                            />
                        </label>
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password" className={styles.label}>
                            Password
                            <input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                className={styles.input}
                                autoComplete="current-password"
                                minLength={6}
                            />
                        </label>
                    </div>

                    <button type="submit" className={styles.button} disabled={isPending}>
                        {isPending ? (
                            <div className={styles.spinner} />
                        ) : isSignUp ? (
                            'Sign Up'
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
