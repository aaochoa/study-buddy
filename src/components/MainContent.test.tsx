import React from 'react';
import { render, screen } from '@testing-library/react';
import { MainContent } from './MainContent';

// Mock sub-components
jest.mock('@/components/ResearchProgress', () => ({
    ResearchProgress: () => <div data-testid="research-progress">ResearchProgress Mock</div>,
}));

jest.mock('@/components/ResearchResult', () => ({
    ResearchResult: ({ report, onClose }: { report: string; onClose: () => void }) => (
        <div data-testid="research-result">
            <span>ResearchResult Mock: {report}</span>
            <button type="button" onClick={onClose}>
                Close
            </button>
        </div>
    ),
}));

jest.mock('@/components/SavedGuides', () => ({
    SavedGuides: ({ activeFilename }: { activeFilename?: string }) => (
        <div data-testid="saved-guides">SavedGuides Mock: {activeFilename}</div>
    ),
}));

describe('MainContent Component', () => {
    const mockOnSelectGuide = jest.fn();
    const mockOnClearGuide = jest.fn();
    const mockOnGuidesLoaded = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders "Ready to Research" screen when agent is idle and no report is selected', () => {
        render(
            <MainContent
                selectedReport={null}
                selectedFilename=""
                onSelectGuide={mockOnSelectGuide}
                onClearGuide={mockOnClearGuide}
                refreshTrigger={0}
                agentRunning={false}
                onGuidesLoaded={mockOnGuidesLoaded}
                activeAgentId="study_buddy_agent"
            />,
        );

        expect(screen.getByText('Ready to Research')).toBeInTheDocument();
        expect(screen.queryByTestId('research-progress')).not.toBeInTheDocument();
        expect(screen.queryByTestId('research-result')).not.toBeInTheDocument();
        expect(screen.getByTestId('saved-guides')).toBeInTheDocument();
    });

    it('renders ResearchProgress when agent is running', () => {
        render(
            <MainContent
                selectedReport={null}
                selectedFilename=""
                onSelectGuide={mockOnSelectGuide}
                onClearGuide={mockOnClearGuide}
                refreshTrigger={0}
                agentRunning
                onGuidesLoaded={mockOnGuidesLoaded}
                activeAgentId="study_buddy_agent"
            />,
        );

        expect(screen.getByTestId('research-progress')).toBeInTheDocument();
        expect(screen.queryByText('Ready to Research')).not.toBeInTheDocument();
    });

    it('renders ResearchResult when a report is selected', () => {
        render(
            <MainContent
                selectedReport="Markdown Report Content"
                selectedFilename="report.md"
                onSelectGuide={mockOnSelectGuide}
                onClearGuide={mockOnClearGuide}
                refreshTrigger={0}
                agentRunning={false}
                onGuidesLoaded={mockOnGuidesLoaded}
                activeAgentId="study_buddy_agent"
            />,
        );

        expect(screen.getByTestId('research-result')).toBeInTheDocument();
        expect(
            screen.getByText('ResearchResult Mock: Markdown Report Content'),
        ).toBeInTheDocument();
    });

    it('renders "No Study Guide Selected" screen when in Q&A mode and no report is selected', () => {
        render(
            <MainContent
                selectedReport={null}
                selectedFilename=""
                onSelectGuide={mockOnSelectGuide}
                onClearGuide={mockOnClearGuide}
                refreshTrigger={0}
                agentRunning={false}
                onGuidesLoaded={mockOnGuidesLoaded}
                activeAgentId="study_buddy_qa"
            />,
        );

        expect(screen.getByText('No Study Guide Selected')).toBeInTheDocument();
    });
});
