'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './SavedGuides.module.css';

export interface GuideFile {
    filename: string;
    title: string;
    size: number;
    mtime: string;
}

interface SavedGuidesProps {
    onSelectGuide: (content: string, filename: string) => void;
    activeFilename?: string;
    refreshTrigger?: number;
    onGuidesLoaded?: (guides: GuideFile[]) => void;
}

export function SavedGuides({
    onSelectGuide,
    activeFilename,
    refreshTrigger = 0,
    onGuidesLoaded,
}: SavedGuidesProps) {
    const [guides, setGuides] = useState<GuideFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchGuides = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/guides');
            if (!response.ok) {
                throw new Error('Failed to load guides');
            }
            const data = await response.json();
            setGuides(data);
            setError(null);
            if (onGuidesLoaded) {
                onGuidesLoaded(data);
            }
        } catch (err: any) {
            setError(err.message || 'Error fetching guides');
        } finally {
            setLoading(false);
        }
    }, [onGuidesLoaded]);

    useEffect(() => {
        fetchGuides();
    }, [refreshTrigger, fetchGuides]);

    const handleSelect = async (filename: string) => {
        try {
            const response = await fetch(`/api/guides/${filename}`);
            if (!response.ok) {
                throw new Error('Failed to fetch guide content');
            }
            const content = await response.text();
            onSelectGuide(content, filename);
        } catch (err: any) {
            alert(err.message || 'Error loading guide');
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Saved Study Guides</h3>
                <button
                    type="button"
                    onClick={fetchGuides}
                    className={styles.refreshBtn}
                    title="Refresh List"
                    aria-label="Refresh List"
                >
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                </button>
            </div>

            {loading && guides.length === 0 ? (
                <div className={styles.loading}>Loading guides...</div>
            ) : error ? (
                <div className={styles.error}>{error}</div>
            ) : guides.length === 0 ? (
                <div className={styles.empty}>
                    No saved study guides yet. Start research in the sidebar!
                </div>
            ) : (
                <div className={styles.list}>
                    {guides.map((guide) => {
                        const isActive = activeFilename === guide.filename;
                        return (
                            <button
                                key={guide.filename}
                                type="button"
                                className={[styles.item, isActive ? styles.activeItem : ''].join(
                                    ' ',
                                )}
                                onClick={() => handleSelect(guide.filename)}
                            >
                                <span className={styles.itemTitle}>{guide.title}</span>
                                <span className={styles.itemMeta}>
                                    {formatDate(guide.mtime)} · {(guide.size / 1024).toFixed(1)} KB
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
