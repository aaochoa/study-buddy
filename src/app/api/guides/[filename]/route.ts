import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }) {
    try {
        const { filename } = await params;
        const supabase = await createClient();

        // Get the current authenticated user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch guide content from Supabase
        const { data: guide, error } = await supabase
            .from('guides')
            .select('content')
            .eq('user_id', user.id)
            .eq('filename', filename)
            .maybeSingle();

        if (error || !guide) {
            return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
        }

        return new NextResponse(guide.content, {
            headers: {
                'Content-Type': 'text/markdown; charset=utf-8',
            },
        });
    } catch (error: any) {
        console.error('Failed to get guide content from DB:', error);
        return NextResponse.json({ error: 'Failed to retrieve guide' }, { status: 500 });
    }
}
