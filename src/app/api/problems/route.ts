import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@/lib/logger';

/**
 * Handles GET requests to retrieve the list of all coding problems globally,
 * seeding them from the local fixtures file if the database table is empty.
 *
 * @returns A JSON response with the problems list or an error.
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
                        logger.error({ err: insertError }, 'Failed to seed default problems to DB');
                    } else if (insertedProblems) {
                        return NextResponse.json(insertedProblems);
                    }
                } catch (jsonErr) {
                    logger.error({ err: jsonErr }, 'Error parsing default problems JSON');
                }
            }
            return NextResponse.json([]);
        }

        return NextResponse.json(dbProblems);
    } catch (error: any) {
        logger.error({ err: error }, 'Failed to list problems from DB');
        return NextResponse.json({ error: 'Failed to list problems' }, { status: 500 });
    }
}

/**
 * Handles POST requests to batch save or update coding problems globally in the system.
 *
 * @param request - The incoming Request containing the array of problems to upsert.
 * @returns A JSON response with the upserted problems records or an error.
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

        const body = await request.json();
        let problems: any[] = [];
        let solutions: any[] = [];

        if (Array.isArray(body)) {
            problems = body;
        } else if (body && typeof body === 'object') {
            problems = body.problems || [];
            solutions = body.solutions || [];
        }

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

        // Save solutions if provided
        if (solutions && solutions.length > 0) {
            const problemIds = upsertData.map((p) => p.id);

            // Delete old solutions for these problems
            const { error: deleteError } = await supabase
                .from('solutions')
                .delete()
                .in('problem_id', problemIds);

            if (deleteError) {
                logger.error({ err: deleteError }, 'Failed to delete old solutions');
            } else {
                const solutionsData = solutions.map((s: any) => {
                    if (!s.problem_id || !s.proposed_solution || !s.languages || !s.explanation) {
                        throw new Error(
                            `Solution is missing required fields: ${JSON.stringify(s)}`,
                        );
                    }
                    return {
                        problem_id: s.problem_id,
                        proposed_solution: s.proposed_solution,
                        languages: s.languages,
                        explanation: s.explanation,
                    };
                });

                const { error: insertSolutionsError } = await supabase
                    .from('solutions')
                    .insert(solutionsData);

                if (insertSolutionsError) {
                    logger.error({ err: insertSolutionsError }, 'Failed to insert solutions');
                    throw insertSolutionsError;
                }
            }
        }

        return NextResponse.json(data);
    } catch (error: any) {
        logger.error({ err: error }, 'Failed to save problems to DB');
        return NextResponse.json(
            { error: error.message || 'Failed to save problems' },
            { status: 500 },
        );
    }
}
