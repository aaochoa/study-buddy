import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }) {
    try {
        const { filename } = await params;
        const cleanFilename = path.basename(filename);

        if (!cleanFilename.toLowerCase().endsWith('.md')) {
            return NextResponse.json({ error: 'Invalid file format' }, { status: 400 });
        }

        const researchDir = path.join(process.cwd(), 'research');
        const filePath = path.join(researchDir, cleanFilename);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        return new NextResponse(content, {
            headers: {
                'Content-Type': 'text/markdown; charset=utf-8',
            },
        });
    } catch (error: any) {
        console.error('Failed to get guide content:', error);
        return NextResponse.json({ error: 'Failed to retrieve guide' }, { status: 500 });
    }
}
