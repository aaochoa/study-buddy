'use client';

import React, { useState, useCallback } from 'react';
import styles from './ResearchResult.module.css';

interface ResearchResultProps {
    report: string;
    onClose?: () => void;
}

/**
 * Minimal markdown → HTML conversion helper for headers, bold, inline code, lists.
 *
 * @param md - The raw markdown content.
 * @returns The converted HTML string.
 */
function markdownToHtml(md: string): string {
    // Handle fenced code blocks first (before HTML escaping)
    const codePlaceholders: string[] = [];
    const withCodePlaceholders = md.replace(
        /```(\w*)\n([^`][\s\S]*?)```/gm,
        (_match, lang: string, code: string) => {
            const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const placeholder = `\x00CODE${codePlaceholders.length}\x00`;
            codePlaceholders.push(`<pre><code class="lang-${lang}">${escaped}</code></pre>`);
            return placeholder;
        },
    );

    let html = withCodePlaceholders
        // Escape remaining HTML
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Headings
        .replace(/^#{4} (.+)$/gm, '<h4>$1</h4>')
        .replace(/^#{3} (.+)$/gm, '<h3>$1</h3>')
        .replace(/^#{2} (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Horizontal rule
        .replace(/^---$/gm, '<hr />')
        // Unordered lists
        .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
        // Ordered lists
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        // Line breaks
        .replace(/\n/g, '<br />');

    // Wrap consecutive <li> items in <ul>
    html = html.replace(/(<li>[^<]*(?:<(?!\/li>)[^<]*)*<\/li>)+/g, (match) => {
        return `<ul>${match}</ul>`;
    });

    // Restore code blocks
    codePlaceholders.forEach((block, i) => {
        html = html.replace(`\x00CODE${i}\x00`, block);
    });

    return html;
}

/**
 * ResearchResult component displays the generated study guide report.
 * It supports toggle views between preview (HTML rendered) and raw markdown,
 * and actions to copy the markdown text or download it as a file.
 *
 * @param props - Props including report content and optional onClose handler.
 */
export function ResearchResult({ report, onClose }: ResearchResultProps) {
    const [copied, setCopied] = useState(false);
    const [view, setView] = useState<'rendered' | 'raw'>('rendered');

    /**
     * Copies the raw markdown report text to the user's clipboard.
     */
    const handleCopy = useCallback(async () => {
        await navigator.clipboard.writeText(report);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [report]);

    /**
     * Downloads the report content as a .md file.
     */
    const handleDownload = useCallback(() => {
        // Extract a filename from the first heading if present
        const titleMatch = report.match(/^# (.+)$/m);
        const title = titleMatch
            ? titleMatch[1].replace(/[^a-z0-9]/gi, '-').toLowerCase()
            : 'study-guide';
        const filename = `${title}.md`;

        const blob = new Blob([report], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }, [report]);

    const wordCount = report.trim().split(/\s+/).length;
    const charCount = report.length;

    return (
        <div className={styles.wrapper}>
            {/* ── Header bar ─────────────────────────────── */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <span className={styles.badge}>Study Guide Ready</span>
                    <span className={styles.meta}>
                        {wordCount.toLocaleString()} words · {charCount.toLocaleString()} chars
                    </span>
                </div>
                <div className={styles.headerActions}>
                    {/* Toggle view */}
                    <div className={styles.toggle} role="group" aria-label="View mode">
                        <button
                            id="view-rendered"
                            type="button"
                            className={[
                                styles.toggleBtn,
                                view === 'rendered' ? styles.toggleActive : '',
                            ].join(' ')}
                            onClick={() => setView('rendered')}
                        >
                            Preview
                        </button>
                        <button
                            id="view-raw"
                            type="button"
                            className={[
                                styles.toggleBtn,
                                view === 'raw' ? styles.toggleActive : '',
                            ].join(' ')}
                            onClick={() => setView('raw')}
                        >
                            Markdown
                        </button>
                    </div>

                    {/* Copy */}
                    <button
                        id="copy-report"
                        type="button"
                        aria-label={copied ? 'Copied!' : 'Copy markdown'}
                        className={styles.iconBtn}
                        onClick={handleCopy}
                        title="Copy markdown"
                    >
                        {copied ? (
                            <span className={styles.copiedIcon}>✓</span>
                        ) : (
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                        )}
                    </button>

                    {/* Download */}
                    <button
                        id="download-report"
                        type="button"
                        aria-label="Download .md file"
                        className={styles.iconBtn}
                        onClick={handleDownload}
                        title="Download .md file"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                    </button>

                    {/* Close */}
                    {onClose && (
                        <button
                            id="close-report"
                            type="button"
                            aria-label="Close report"
                            className={styles.iconBtn}
                            onClick={onClose}
                            title="Close guide"
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* ── Report body ─────────────────────────────── */}
            {view === 'rendered' ? (
                <div
                    className={styles.content}
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(report) }}
                />
            ) : (
                <pre className={styles.raw}>{report}</pre>
            )}

            {/* ── Footer tip ──────────────────────────────── */}
            <div className={styles.footer}>
                <span className={styles.footerTip}>
                    💡 Document ready. You can start your learning session now.
                </span>
            </div>
        </div>
    );
}
