import { GET } from './route';
import fs from 'fs';
import { NextResponse } from 'next/server';

jest.mock('fs');
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
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns empty array if research directory does not exist', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        const response = await GET();
        const data = await response.json();

        expect(fs.existsSync).toHaveBeenCalled();
        expect(data).toEqual([]);
    });

    it('returns list of guides sorted by mtime descending', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readdirSync as jest.Mock).mockReturnValue([
            'guide_1.md',
            'guide_2.md',
            'not_a_guide.txt',
        ]);

        (fs.statSync as jest.Mock).mockImplementation((filePath: string) => {
            if (filePath.endsWith('guide_1.md')) {
                return { size: 100, mtime: new Date('2026-05-26T10:00:00.000Z') };
            }
            if (filePath.endsWith('guide_2.md')) {
                return { size: 200, mtime: new Date('2026-05-26T11:00:00.000Z') };
            }
            return { size: 0, mtime: new Date() };
        });

        (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
            if (filePath.endsWith('guide_1.md')) {
                return '# Custom Title 1\nSome content';
            }
            if (filePath.endsWith('guide_2.md')) {
                return 'No title here';
            }
            return '';
        });

        const response = await GET();
        const data = await response.json();

        expect(NextResponse.json).toHaveBeenCalled();
        expect(data).toHaveLength(2);

        // Sorting check (newest mtime first: guide_2.md (11:00) then guide_1.md (10:00))
        expect(data[0].filename).toBe('guide_2.md');
        expect(data[0].title).toBe('guide 2'); // Title fallback
        expect(data[0].size).toBe(200);

        expect(data[1].filename).toBe('guide_1.md');
        expect(data[1].title).toBe('Custom Title 1'); // Title from markdown header
        expect(data[1].size).toBe(100);
    });

    it('returns 500 error if operation throws', async () => {
        (fs.existsSync as jest.Mock).mockImplementation(() => {
            throw new Error('Disk error');
        });

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: 'Failed to list guides' });
    });
});
