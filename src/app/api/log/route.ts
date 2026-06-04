import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const logPath = path.join(process.cwd(), 'scratch', 'frontend_log.txt');

        const logEntry = `[${new Date().toISOString()}] ${body.level}: ${JSON.stringify(body.message, null, 2)}\n`;

        fs.mkdirSync(path.dirname(logPath), { recursive: true });
        fs.appendFileSync(logPath, logEntry);

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: 'Failed to write log' }, { status: 500 });
    }
}
