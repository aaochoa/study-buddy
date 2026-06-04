import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import * as fs from 'fs';
import * as path from 'path';

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

        // Fetch problems globally
        const { data: dbProblems, error } = await supabase
            .from('problems')
            .select('id, title, difficulty, description, languages');

        if (error) {
            throw error;
        }

        // If the table does not have any problems yet, seed the default ones
        if (!dbProblems || dbProblems.length === 0) {
            const defaultDbPath = path.join(process.cwd(), 'src', 'fixtures', 'problems.json');
            if (fs.existsSync(defaultDbPath)) {
                try {
                    const defaultProblems = JSON.parse(fs.readFileSync(defaultDbPath, 'utf-8'));

                    // Batch insert default problems globally
                    const seedData = defaultProblems.map((p: any) => ({
                        id: p.id,
                        title: p.title,
                        difficulty: p.difficulty,
                        description: p.description,
                        languages: p.languages,
                    }));

                    const { data: insertedProblems, error: insertError } = await supabase
                        .from('problems')
                        .insert(seedData)
                        .select('id, title, difficulty, description, languages');

                    if (insertError) {
                        console.error('Failed to seed default problems to DB:', insertError);
                    } else if (insertedProblems) {
                        return NextResponse.json(insertedProblems);
                    }
                } catch (jsonErr) {
                    console.error('Error parsing default problems JSON:', jsonErr);
                }
            }
            return NextResponse.json([]);
        }

        return NextResponse.json(dbProblems);
    } catch (error: any) {
        console.error('Failed to list problems from DB:', error);
        return NextResponse.json({ error: 'Failed to list problems' }, { status: 500 });
    }
}

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

        const problems = await request.json();

        if (!Array.isArray(problems) || problems.length === 0) {
            return NextResponse.json({ error: 'Invalid or empty problems array' }, { status: 400 });
        }

        // Map and validate the incoming problems array
        const upsertData = problems.map((p: any) => {
            if (!p.id || !p.title || !p.difficulty || !p.description || !p.languages) {
                throw new Error(`Problem is missing required fields: ${JSON.stringify(p)}`);
            }
            return {
                id: p.id,
                title: p.title,
                difficulty: p.difficulty,
                description: p.description,
                languages: p.languages,
            };
        });

        // Batch upsert the problems globally
        const { data, error } = await supabase
            .from('problems')
            .upsert(upsertData, { onConflict: 'id' })
            .select('id, title, difficulty, description, languages');

        if (error) {
            throw error;
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Failed to save problems to DB:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to save problems' },
            { status: 500 },
        );
    }
}
