import { GET } from './route';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

jest.mock('@/utils/supabase/server', () => ({
    createClient: jest.fn(),
}));

jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((data, init) => {
            const res = {
                status: init?.status || 200,
                json: async () => data,
            };
            return res;
        }),
    },
}));

describe('Guides API Route - GET', () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSupabase = {
            auth: {
                getUser: jest.fn(),
            },
            from: jest.fn(),
        };

        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    });

    it('returns 401 if user is unauthorized', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: new Error('Auth error'),
        });

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('returns list of guides from DB for authenticated user', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: 'test-user-id' } },
            error: null,
        });

        const mockGuides = [
            {
                filename: 'guide_2.md',
                title: 'React Guide',
                size: 200,
                mtime: '2026-05-26T11:00:00Z',
            },
            {
                filename: 'guide_1.md',
                title: 'Node Guide',
                size: 100,
                mtime: '2026-05-26T10:00:00Z',
            },
        ];

        const mockSelect = {
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockGuides, error: null }),
        };

        mockSupabase.from.mockReturnValue({
            select: jest.fn().mockReturnValue(mockSelect),
        });

        const response = await GET();
        const data = await response.json();

        expect(createClient).toHaveBeenCalled();
        expect(mockSupabase.auth.getUser).toHaveBeenCalled();
        expect(mockSupabase.from).toHaveBeenCalledWith('guides');
        expect(data).toHaveLength(2);
        expect(data[0].filename).toBe('guide_2.md');
        expect(data[1].filename).toBe('guide_1.md');
    });

    it('returns 500 error if operation throws', async () => {
        mockSupabase.auth.getUser.mockRejectedValue(new Error('DB connection failed'));

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: 'Failed to list guides' });
    });
});
