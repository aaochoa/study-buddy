import type { Metadata } from 'next';

import { CopilotKit } from '@copilotkit/react-core/v2';
import './globals.css';
import '@copilotkit/react-core/v2/styles.css';

export const metadata: Metadata = {
    title: 'Study Buddy',
    description: 'Study Buddy is a Copilot Kit based application that helps you study.',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="antialiased">
                <CopilotKit runtimeUrl="/api/copilotkit" agent="study_buddy_agent">
                    {children}
                </CopilotKit>
            </body>
        </html>
    );
}
