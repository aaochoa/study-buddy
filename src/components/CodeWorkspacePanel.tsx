import React from 'react';
import styles from './CodingArena.module.css';

interface CodeWorkspacePanelProps {
    code: string;
    onCodeChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    terminalLogs: Array<{ text: string; type: 'normal' | 'success' | 'error' | 'warning' }>;
    loading: boolean;
    onRunCode: () => void;
}

export function CodeWorkspacePanel({
    code,
    onCodeChange,
    onKeyDown,
    terminalLogs,
    loading,
    onRunCode,
}: CodeWorkspacePanelProps) {
    return (
        <div className={styles.rightPanel}>
            <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>
                    <span>📝 Editor Workspace</span>
                </h3>
            </div>

            <div className={styles.editorWrapper}>
                <textarea
                    value={code}
                    onChange={onCodeChange}
                    onKeyDown={onKeyDown}
                    className={styles.textarea}
                    spellCheck="false"
                    placeholder="Write your solution here..."
                    aria-label="Code Editor"
                />
            </div>

            <div className={styles.terminalWrapper}>
                <div className={styles.terminalHeader}>
                    <span
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        🖥️ Sandbox Terminal
                    </span>
                    <button
                        type="button"
                        onClick={onRunCode}
                        disabled={loading || !code}
                        className={styles.submitBtn}
                    >
                        {loading ? 'Executing...' : 'Run & Validate'}
                    </button>
                </div>

                <div className={styles.terminalLogs}>
                    {terminalLogs.length === 0 ? (
                        <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                            {`Terminal idle. Click 'Run & Validate' to execute test assertions...`}
                        </span>
                    ) : (
                        terminalLogs.map((log, index) => {
                            let logClass = styles.logNormal;
                            if (log.type === 'success') logClass = styles.logSuccess;
                            else if (log.type === 'error') logClass = styles.logError;
                            else if (log.type === 'warning') logClass = styles.logWarning;

                            return (
                                <div
                                    key={index}
                                    className={[logClass, 'font-mono text-xs mb-1'].join(' ')}
                                >
                                    {log.text}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
