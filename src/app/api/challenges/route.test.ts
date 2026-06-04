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

describe('Challenges API Route - GET & POST', () => {
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

        it('returns list of challenges from DB for authenticated user', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'test-user-id' } },
                error: null,
            });

            const mockChallenges = [
                {
                    problem_id: 'two-sum',
                    language: 'python',
                    code: 'def two_sum(): pass',
                    completed: true,
                    updated_at: '2026-06-04T12:00:00.000Z',
                },
            ];

            const mockSelect = jest.fn().mockReturnThis();
            const mockEq = jest.fn().mockResolvedValue({ data: mockChallenges, error: null });

            mockSupabase.from.mockReturnValue({
                select: mockSelect,
            });
            mockSelect.mockReturnValue({
                eq: mockEq,
            });

            const response = await GET();
            const data = await response.json();

            expect(createClient).toHaveBeenCalled();
            expect(mockSupabase.auth.getUser).toHaveBeenCalled();
            expect(mockSupabase.from).toHaveBeenCalledWith('coding_challenges');
            expect(data).toHaveLength(1);
            expect(data[0].problem_id).toBe('two-sum');
        });

        it('returns 500 error if operation throws', async () => {
            mockSupabase.auth.getUser.mockRejectedValue(new Error('DB connection failed'));

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data).toEqual({ error: 'Failed to list coding challenges' });
        });
    });

    describe('POST', () => {
        it('returns 401 if user is unauthorized on POST', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: new Error('Auth error'),
            });

            const req = {
                json: jest.fn().mockResolvedValue({
                    problemId: 'two-sum',
                    language: 'python',
                    code: 'def two_sum(): pass',
                    completed: true,
                }),
            } as unknown as Request;

            const response = await POST(req);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data).toEqual({ error: 'Unauthorized' });
        });

        it('returns 400 if required parameters are missing', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'test-user-id' } },
                error: null,
            });

            const req = {
                json: jest.fn().mockResolvedValue({
                    problemId: '', // missing
                    language: 'python',
                    code: 'def two_sum(): pass',
                }),
            } as unknown as Request;

            const response = await POST(req);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data).toEqual({ error: 'Missing required parameters' });
        });

        it('upserts challenge successfully and returns data', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'test-user-id' } },
                error: null,
            });

            const req = {
                json: jest.fn().mockResolvedValue({
                    problemId: 'two-sum',
                    language: 'python',
                    code: 'def two_sum(): pass',
                    completed: true,
                }),
            } as unknown as Request;

            const mockUpsertResult = [
                {
                    id: 'challenge-uuid-1',
                    user_id: 'test-user-id',
                    problem_id: 'two-sum',
                    language: 'python',
                    code: 'def two_sum(): pass',
                    completed: true,
                },
            ];

            const mockUpsert = jest.fn().mockReturnThis();
            const mockSelect = jest.fn().mockResolvedValue({ data: mockUpsertResult, error: null });

            mockSupabase.from.mockReturnValue({
                upsert: mockUpsert,
            });
            mockUpsert.mockReturnValue({
                select: mockSelect,
            });

            const response = await POST(req);
            const data = await response.json();

            expect(mockSupabase.from).toHaveBeenCalledWith('coding_challenges');
            expect(mockUpsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: 'test-user-id',
                    problem_id: 'two-sum',
                    language: 'python',
                    code: 'def two_sum(): pass',
                    completed: true,
                }),
                expect.objectContaining({ onConflict: 'user_id,problem_id,language' }),
            );
            expect(response.status).toBe(200);
            expect(data.problem_id).toBe('two-sum');
        });

        it('returns 500 error if upsert fails', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'test-user-id' } },
                error: null,
            });

            const req = {
                json: jest.fn().mockResolvedValue({
                    problemId: 'two-sum',
                    language: 'python',
                    code: 'def two_sum(): pass',
                    completed: true,
                }),
            } as unknown as Request;

            const mockUpsert = jest.fn().mockReturnThis();
            const mockSelect = jest

                .fn()
                .mockResolvedValue({ data: null, error: new Error('Upsert failed') });

            mockSupabase.from.mockReturnValue({
                upsert: mockUpsert,
            });
            mockUpsert.mockReturnValue({
                select: mockSelect,
            });

            const response = await POST(req);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data).toEqual({ error: 'Failed to save coding challenge' });
        });
    });
});
