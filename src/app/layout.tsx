import type { Metadata } from 'next';

import { CopilotWrapper } from '@/components/CopilotWrapper';
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
                <CopilotWrapper>{children}</CopilotWrapper>
            </body>
        </html>
    );
}
