import { renderHook, waitFor } from '@testing-library/react';
import { useReportAutoSave } from './useReportAutoSave';

describe('useReportAutoSave hook', () => {
    let mockSetSelectedReport: jest.Mock;
    let mockSetSelectedFilename: jest.Mock;
    let mockSetRefreshTrigger: jest.Mock;

    beforeEach(() => {
        mockSetSelectedReport = jest.fn();
        mockSetSelectedFilename = jest.fn();
        mockSetRefreshTrigger = jest.fn();
        global.fetch = jest.fn();
        jest.clearAllMocks();
    });

    it('does nothing when researchAgent has no report_result and no relevant messages', () => {
        const mockResearchAgent = {
            state: {},
            messages: [],
        };

        renderHook(() =>
            useReportAutoSave({
                researchAgent: mockResearchAgent,
                setSelectedReport: mockSetSelectedReport,
                setSelectedFilename: mockSetSelectedFilename,
                setRefreshTrigger: mockSetRefreshTrigger,
            }),
        );

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('saves report from state when report_result is present', async () => {
        const mockResearchAgent = {
            state: {
                report_result: '# My Title\nSome content',
            },
            messages: [],
        };

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
        });

        const { rerender } = renderHook(() =>
            useReportAutoSave({
                researchAgent: mockResearchAgent,
                setSelectedReport: mockSetSelectedReport,
                setSelectedFilename: mockSetSelectedFilename,
                setRefreshTrigger: mockSetRefreshTrigger,
            }),
        );

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/guides',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                }),
            );
        });

        const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
        expect(callBody.title).toBe('My Title');
        expect(callBody.content).toBe('# My Title\nSome content');
        expect(callBody.filename).toMatch(/^my_title_\d+\.md$/);

        // Simulate state update (re-render) to verify lastSavedReport cache prevents duplicate save
        rerender();
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });
    });

    it('extracts and saves report from messages when report_result is not in state', async () => {
        const mockResearchAgent = {
            state: {},
            messages: [
                {
                    role: 'assistant',
                    content:
                        '# Guide Title\nClick here to download the file\ndata:application/octet-stream;base64,abc',
                },
            ],
        };

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
        });

        renderHook(() =>
            useReportAutoSave({
                researchAgent: mockResearchAgent,
                setSelectedReport: mockSetSelectedReport,
                setSelectedFilename: mockSetSelectedFilename,
                setRefreshTrigger: mockSetRefreshTrigger,
            }),
        );

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
        });
        const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
        expect(callBody.title).toBe('Guide Title');
    });
});
