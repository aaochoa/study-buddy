import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const researchDir = path.join(process.cwd(), 'research');

        if (!fs.existsSync(researchDir)) {
            return NextResponse.json([]);
        }

        const files = fs.readdirSync(researchDir);
        const mdFiles = files.filter((f) => f.toLowerCase().endsWith('.md'));

        const guides = mdFiles.map((filename) => {
            const filePath = path.join(researchDir, filename);
            const stats = fs.statSync(filePath);

            // Try to extract a title from the markdown file's first heading
            let title = filename.replace(/_/g, ' ').replace(/\.md$/i, '');
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const titleMatch = content.match(/^#\s+(.+)$/m);
                if (titleMatch) {
                    title = titleMatch[1].trim();
                }
            } catch (err) {
                console.error(`Failed to read file for title: ${filename}`, err);
            }

            return {
                filename,
                title,
                size: stats.size,
                mtime: stats.mtime.toISOString(),
            };
        });

        // Sort by mtime descending (newest first)
        guides.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());

        return NextResponse.json(guides);
    } catch (error: any) {
        console.error('Failed to list guides:', error);
        return NextResponse.json({ error: 'Failed to list guides' }, { status: 500 });
    }
}
