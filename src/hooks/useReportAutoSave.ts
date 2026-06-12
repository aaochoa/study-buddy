import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { AgentState } from '@/lib/types';

interface UseReportAutoSaveParams {
    researchAgent: any;
    setSelectedReport: (val: string | null) => void;
    setSelectedFilename: (val: string) => void;
    setRefreshTrigger: (cb: (prev: number) => number) => void;
}

export function useReportAutoSave({
    researchAgent,
    setSelectedReport,
    setSelectedFilename,
    setRefreshTrigger,
}: UseReportAutoSaveParams) {
    const [lastSavedReport, setLastSavedReport] = useState<string>('');
    const state = (researchAgent.state ?? {}) as AgentState;

    useEffect(() => {
        let active = true;

        const getReportFromMessages = (messages: any[]) => {
            for (let i = messages.length - 1; i >= 0; i--) {
                const msg = messages[i];
                if (msg.role === 'assistant' || msg.role === 'agent') {
                    let content = '';
                    if (typeof msg.content === 'string') {
                        content = msg.content;
                    } else if (Array.isArray(msg.parts)) {
                        content = msg.parts.map((part: any) => part.text || '').join('');
                    }
                    if (
                        content.includes('#') &&
                        (content.includes('Click here to download') ||
                            content.includes('data:application/octet-stream;base64'))
                    ) {
                        return content;
                    }
                }
            }
            return null;
        };

        const reportFromMessages = getReportFromMessages(researchAgent.messages || []);
        const reportContent = state.report_result || reportFromMessages;

        if (reportContent && reportContent !== lastSavedReport) {
            const saveReport = async () => {
                try {
                    // Extract title from the first heading in the markdown report
                    const titleMatch = reportContent.match(/^#\s+(.+)$/m);
                    const title = titleMatch ? titleMatch[1].trim() : 'Study Guide';

                    // Generate a clean filename from title
                    const cleanTitle = title
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '_')
                        .substring(0, 50);
                    const filename = `${cleanTitle}_${Date.now()}.md`;

                    // Clean the content from any appended download link (markdown or plain text/raw data variants)
                    let cleanedContent = reportContent.replace(
                        /\n\n\[Click here to download [^\]]+\]\(data:[^)]+\)$/,
                        '',
                    );
                    cleanedContent = cleanedContent.replace(
                        /\n*(?:Click here to download(?: [^:\n]+)?\s*)?data:[^\s]+$/i,
                        '',
                    );

                    const response = await fetch('/api/guides', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title,
                            filename,
                            content: cleanedContent,
                        }),
                    });

                    if (response.ok) {
                        if (!active) return;
                        setLastSavedReport(reportContent);
                        setSelectedReport(cleanedContent);
                        setSelectedFilename(filename);
                        setRefreshTrigger((prev) => prev + 1);
                    }
                } catch (err) {
                    if (active) {
                        logger.error({ err }, 'Failed to auto-save generated guide to DB');
                    }
                }
            };
            saveReport();
        }

        return () => {
            active = false;
        };
    }, [
        state.report_result,
        researchAgent.messages,
        lastSavedReport,
        setSelectedReport,
        setSelectedFilename,
        setRefreshTrigger,
    ]);
}
