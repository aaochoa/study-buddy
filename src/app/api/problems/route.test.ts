import { GET, POST } from './route';
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

describe('Problems API Route - GET & POST', () => {
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

    describe('GET', () => {
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

        it('returns list of problems from DB for authenticated user', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'test-user-id' } },
                error: null,
            });

            const mockProblems = [
                {
                    id: 'two-sum',
                    title: 'Two Sum',
                    difficulty: 'Easy',
                    description: 'Two sum description',
                    languages: {},
                },
            ];

            const mockSelect = jest.fn().mockResolvedValue({ data: mockProblems, error: null });

            mockSupabase.from.mockReturnValue({
                select: mockSelect,
            });

            const response = await GET();
            const data = await response.json();

            expect(createClient).toHaveBeenCalled();
            expect(mockSupabase.auth.getUser).toHaveBeenCalled();
            expect(mockSupabase.from).toHaveBeenCalledWith('problems');
            expect(data).toHaveLength(1);
            expect(data[0].id).toBe('two-sum');
        });

        it('returns 500 error if operation throws', async () => {
            mockSupabase.auth.getUser.mockRejectedValue(new Error('DB connection failed'));

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data).toEqual({ error: 'Failed to list problems' });
        });
    });

    describe('POST', () => {
        it('returns 401 if user is unauthorized on POST', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: new Error('Auth error'),
            });

            const req = {
                json: jest.fn().mockResolvedValue([{ id: 'test' }]),
            } as unknown as Request;

            const response = await POST(req);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data).toEqual({ error: 'Unauthorized' });
        });
    });
});
