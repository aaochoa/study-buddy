import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SavedGuides } from './SavedGuides';

describe('SavedGuides Component', () => {
    const mockOnSelectGuide = jest.fn();
    const mockOnGuidesLoaded = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock global fetch
        global.fetch = jest.fn();
    });

    it('renders loading state initially', async () => {
        (global.fetch as jest.Mock).mockReturnValue(
            new Promise(() => {}), // never resolves to keep loading state active
        );

        render(<SavedGuides onSelectGuide={mockOnSelectGuide} />);
        expect(screen.getByText('Loading guides...')).toBeInTheDocument();
    });

    it('renders empty state when there are no guides', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => [],
        });

        render(<SavedGuides onSelectGuide={mockOnSelectGuide} />);

        await waitFor(() => {
            expect(screen.getByText(/No saved study guides yet/i)).toBeInTheDocument();
        });
    });

    it('renders error state when fetch fails', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
        });

        render(<SavedGuides onSelectGuide={mockOnSelectGuide} />);

        await waitFor(() => {
            expect(screen.getByText('Failed to load guides')).toBeInTheDocument();
        });
    });

    it('renders guides list and calls onSelectGuide when a guide is clicked', async () => {
        const mockGuides = [
            {
                filename: 'guide1.md',
                title: 'Test Guide 1',
                size: 2048,
                mtime: '2026-05-26T12:00:00.000Z',
            },
            {
                filename: 'guide2.md',
                title: 'Test Guide 2',
                size: 4096,
                mtime: '2026-05-26T13:00:00.000Z',
            },
        ];

        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockGuides,
            }) // First fetch for list
            .mockResolvedValueOnce({
                ok: true,
                text: async () => '# Test Guide 1 Content',
            }); // Second fetch for content

        render(
            <SavedGuides onSelectGuide={mockOnSelectGuide} onGuidesLoaded={mockOnGuidesLoaded} />,
        );

        await waitFor(() => {
            expect(screen.getByText('Test Guide 1')).toBeInTheDocument();
            expect(screen.getByText('Test Guide 2')).toBeInTheDocument();
        });

        expect(mockOnGuidesLoaded).toHaveBeenCalledWith(mockGuides);

        // Click first guide
        const guideButton = screen.getByText('Test Guide 1');
        fireEvent.click(guideButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/guides/guide1.md');
            expect(mockOnSelectGuide).toHaveBeenCalledWith('# Test Guide 1 Content', 'guide1.md');
        });
    });
});
