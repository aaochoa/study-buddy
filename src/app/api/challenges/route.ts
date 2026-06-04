import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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

        // Fetch solutions belonging to the authenticated user
        const { data: challenges, error } = await supabase
            .from('coding_challenges')
            .select('problem_id, language, code, completed, updated_at')
            .eq('user_id', user.id);

        if (error) {
            throw error;
        }

        return NextResponse.json(challenges || []);
    } catch (error: any) {
        console.error('Failed to list coding challenges from DB:', error);
        return NextResponse.json({ error: 'Failed to list coding challenges' }, { status: 500 });
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

        const { problemId, language, code, completed } = await request.json();

        if (!problemId || !language || code === undefined) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const now = new Date().toISOString();

        // Upsert the challenge code for the user
        const { data, error } = await supabase
            .from('coding_challenges')
            .upsert(
                {
                    user_id: user.id,
                    problem_id: problemId,
                    language,
                    code,
                    completed: !!completed,
                    updated_at: now,
                },
                { onConflict: 'user_id,problem_id,language' },
            )
            .select();

        if (error) {
            throw error;
        }

        return NextResponse.json(data ? data[0] : null);
    } catch (error: any) {
        console.error('Failed to save coding challenge to DB:', error);
        return NextResponse.json({ error: 'Failed to save coding challenge' }, { status: 500 });
    }
}
