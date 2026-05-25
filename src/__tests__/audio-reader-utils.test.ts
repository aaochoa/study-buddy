import { detectLanguage, stripMarkdown } from '@/components/audio-reader';

describe('Audio Reader Utils', () => {
    describe('detectLanguage', () => {
        it('should detect English text correctly', () => {
            const text =
                'The quick brown fox jumps over the lazy dog. In that case, it is for you.';
            expect(detectLanguage(text)).toBe('en');
        });

        it('should detect Spanish text correctly', () => {
            const text =
                'El perro rápido salta sobre el perro perezoso. Con esto, que de es un tema especial.';
            expect(detectLanguage(text)).toBe('es');
        });

        it('should detect French text correctly', () => {
            const text =
                'Le chat noir dort sur le lit. C’est pour elle, avec un grand plaisir dans la maison.';
            expect(detectLanguage(text)).toBe('fr');
        });

        it('should detect German text correctly', () => {
            const text =
                'Der Hund läuft im Garten. Das ist ein schöner Tag mit den Kindern in der Schule.';
            expect(detectLanguage(text)).toBe('de');
        });

        it('should detect Portuguese text correctly', () => {
            const text =
                'O livro é muito bom. Com isso, é para você ler em casa que de são importantes.';
            expect(detectLanguage(text)).toBe('pt');
        });
    });

    describe('stripMarkdown', () => {
        it('should strip markdown headers', () => {
            const text = '# Main Header\n## Sub Header\n### Small Header';
            expect(stripMarkdown(text)).toBe('Main Header\nSub Header\nSmall Header');
        });

        it('should strip bold and italic markers', () => {
            const text =
                'This is **bold** and this is *italic* and __underline bold__ and _underline italic_.';
            expect(stripMarkdown(text)).toBe(
                'This is bold and this is italic and underline bold and underline italic.',
            );
        });

        it('should extract plain text from links', () => {
            const text = 'Check out [Google](https://google.com) for answers.';
            expect(stripMarkdown(text)).toBe('Check out Google for answers.');
        });

        it('should strip list bullet marks and list numbers', () => {
            const text = '- Bullet item 1\n* Bullet item 2\n1. Numbered item 1\n2. Numbered item 2';
            expect(stripMarkdown(text)).toBe(
                'Bullet item 1\nBullet item 2\nNumbered item 1\nNumbered item 2',
            );
        });

        it('should strip code blocks entirely', () => {
            const text =
                'Here is some explanation.\n```typescript\nconst a = 12;\nconsole.log(a);\n```\nAnd here is more explanation.';
            const stripped = stripMarkdown(text);
            expect(stripped).toContain('Here is some explanation.');
            expect(stripped).toContain('And here is more explanation.');
            expect(stripped).not.toContain('const a = 12');
            expect(stripped).not.toContain('console.log');
        });

        it('should handle inline code backticks', () => {
            const text = 'You can use the `const` keyword in JavaScript.';
            expect(stripMarkdown(text)).toBe('You can use the const keyword in JavaScript.');
        });

        it('should strip blockquotes', () => {
            const text = '> This is a blockquote.';
            expect(stripMarkdown(text)).toBe('This is a blockquote.');
        });
    });
});
