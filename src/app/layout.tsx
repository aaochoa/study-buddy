import type { Metadata } from 'next';

import { CopilotWrapper } from '@/components/CopilotWrapper';
import { Navbar } from '@/components/Navbar';
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
                <CopilotWrapper>
                    <Navbar />
                    <div className="pt-16">{children}</div>
                </CopilotWrapper>
            </body>
        </html>
    );
}
