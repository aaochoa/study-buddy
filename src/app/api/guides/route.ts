import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@/lib/logger';

/**
 * Handles GET requests to list all study guides for the authenticated user,
 * syncing any newly created local markdown files into the database.
 *
 * @returns A JSON response with the list of user guides or an error.
 */
export async function GET() {
    try {
        const supabase = await createClient();

        // Get the current authenticated user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Auto-sync files from agent/research folder to the database in non-test environments
        if (process.env.NODE_ENV !== 'test') {
            try {
                const researchDir = path.join(process.cwd(), 'agent', 'research');
                if (fs.existsSync(researchDir)) {
                    const files = fs.readdirSync(researchDir);
                    for (const filename of files) {
                        if (filename.endsWith('.md')) {
                            // Check if it exists in DB for this user
                            const { data: existing } = await supabase
                                .from('guides')
                                .select('filename')
                                .eq('user_id', user.id)
                                .eq('filename', filename)
                                .maybeSingle();

                            if (!existing) {
                                // Read content and import
                                const filePath = path.join(researchDir, filename);
                                const content = fs.readFileSync(filePath, 'utf-8');

                                // Extract title
                                const titleMatch = content.match(/^#\s+(.+)$/m);
                                const title = titleMatch ? titleMatch[1].trim() : 'Study Guide';
                                const size = Buffer.byteLength(content, 'utf-8');
                                const stats = fs.statSync(filePath);
                                const mtime = stats.mtime.toISOString();

                                await supabase.from('guides').upsert(
                                    {
                                        user_id: user.id,
                                        title,
                                        filename,
                                        content,
                                        size,
                                        mtime,
                                    },
                                    { onConflict: 'user_id,filename' },
                                );
                            }
                        }
                    }
                }
            } catch (syncErr) {
                logger.error({ err: syncErr }, 'Failed to sync files from filesystem to DB');
            }
        }

        // Fetch guides belonging to the authenticated user, sorted by modification time (newest first)
        const { data: guides, error } = await supabase
            .from('guides')
            .select('filename, title, size, mtime')
            .eq('user_id', user.id)
            .order('mtime', { ascending: false });

        if (error) {
            throw error;
        }

        return NextResponse.json(guides || []);
    } catch (error: any) {
        logger.error({ err: error }, 'Failed to list guides from DB');
        return NextResponse.json({ error: 'Failed to list guides' }, { status: 500 });
    }
}

/**
 * Handles POST requests to save or update the content of a study guide
 * for the currently authenticated user.
 *
 * @param request - The incoming Request containing title, filename, and content.
 * @returns A JSON response with the saved guide details or an error.
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Get the current authenticated user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { title, filename, content } = await request.json();

        if (!title || !filename || !content) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // Calculate size in bytes and generate timestamps
        const size = Buffer.byteLength(content, 'utf-8');
        const now = new Date().toISOString();

        // Upsert the guide for the user
        const { data, error } = await supabase
            .from('guides')
            .upsert(
                {
                    user_id: user.id,
                    title,
                    filename,
                    content,
                    size,
                    mtime: now,
                },
                { onConflict: 'user_id,filename' },
            )
            .select();

        if (error) {
            throw error;
        }

        return NextResponse.json(data ? data[0] : null);
    } catch (error: any) {
        logger.error({ err: error }, 'Failed to save guide to DB');
        return NextResponse.json({ error: 'Failed to save guide' }, { status: 500 });
    }
}
