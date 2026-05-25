import React from 'react';
import { render, screen } from '@testing-library/react';
import { WelcomeState } from '@/components/welcome-state';

describe('WelcomeState Component', () => {
    it('renders the welcome heading and description text', () => {
        render(<WelcomeState />);

        // Check for the main headline
        const heading = screen.getByRole('heading', {
            name: /Supercharge Your Technical Interview Preparation/i,
        });
        expect(heading).toBeInTheDocument();

        // Check for the description text
        expect(
            screen.getByText(/Our multi-agent researcher system will crawl the web/i),
        ).toBeInTheDocument();
    });

    it('renders all three procedural preparation steps', () => {
        render(<WelcomeState />);

        // Check for step 1
        expect(screen.getByText('Deep Web Search')).toBeInTheDocument();
        expect(screen.getByText(/Crawl official docs, engineering blogs/i)).toBeInTheDocument();

        // Check for step 2
        expect(screen.getByText('Edit & Structure')).toBeInTheDocument();
        expect(screen.getByText(/Eliminate noise, format code snippets/i)).toBeInTheDocument();

        // Check for step 3
        expect(screen.getByText('Download Markdown')).toBeInTheDocument();
        expect(screen.getByText(/Get a perfectly organized source doc/i)).toBeInTheDocument();
    });

    it('renders the tip notification at the bottom', () => {
        render(<WelcomeState />);
        expect(
            screen.getByText(/Tip: Type a topic in the side panel suggestions to begin/i),
        ).toBeInTheDocument();
    });
});
