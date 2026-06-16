import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';

const execAsync = promisify(exec);

/**
 * Handles POST requests to compile/execute the user's coding challenge solution,
 * combining the code with the language's test harness, running it in a sandbox command-line execution,
 * and returning the test run output and statistics.
 *
 * @param req - The incoming request with code, language, and problemId.
 * @returns A JSON response with execution success status, passed/total tests, output, and errors.
 */
export async function POST(req: Request) {
    let tempFile = '';
    let tempBin = '';

    try {
        const { code, language, problemId } = await req.json();

        if (!code || !language || !problemId) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // 1. Load the problem database to retrieve the test harness
        const supabase = await createClient();

        // Get the current authenticated user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch the problem definition from the database
        const { data: problem, error: problemError } = await supabase
            .from('problems')
            .select('languages')
            .eq('id', problemId)
            .maybeSingle();

        if (problemError || !problem) {
            return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
        }

        const langConfig = (problem.languages as any)?.[language];
        if (!langConfig) {
            return NextResponse.json(
                { error: `Language ${language} not supported for this problem` },
                { status: 400 },
            );
        }

        // 2. Combine starter code with test harness
        const fullContent = code + '\n' + langConfig.harness;

        // 3. Create temp directory in workspace
        const tempDir = path.join(process.cwd(), '.tmp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Determine file extensions and execution commands
        let runCommand = '';
        const id = Math.random().toString(36).substring(7);

        if (language === 'python') {
            tempFile = path.join(tempDir, `solution_${id}.py`);
            fs.writeFileSync(tempFile, fullContent, 'utf-8');
            runCommand = `python3 "${tempFile}"`;
        } else if (language === 'ruby') {
            tempFile = path.join(tempDir, `solution_${id}.rb`);
            fs.writeFileSync(tempFile, fullContent, 'utf-8');
            runCommand = `ruby "${tempFile}"`;
        } else if (language === 'javascript') {
            tempFile = path.join(tempDir, `solution_${id}.js`);
            fs.writeFileSync(tempFile, fullContent, 'utf-8');
            runCommand = `node "${tempFile}"`;
        } else if (language === 'typescript') {
            tempFile = path.join(tempDir, `solution_${id}.ts`);
            fs.writeFileSync(tempFile, fullContent, 'utf-8');
            runCommand = `npx tsx "${tempFile}"`;
        } else if (language === 'cpp') {
            tempFile = path.join(tempDir, `solution_${id}.cpp`);
            tempBin = path.join(tempDir, `solution_${id}_bin`);
            fs.writeFileSync(tempFile, fullContent, 'utf-8');
            runCommand = `clang++ -std=c++17 "${tempFile}" -o "${tempBin}" && "${tempBin}"`;
        } else {
            return NextResponse.json(
                { error: `Unsupported language: ${language}` },
                { status: 400 },
            );
        }

        // 4. Execute the command with a 4-second timeout limit
        let stdout = '';
        let stderr = '';
        try {
            const { stdout: out, stderr: err } = await execAsync(runCommand, { timeout: 4000 });
            stdout = out;
            stderr = err;
        } catch (execErr: any) {
            // Include stdout/stderr even if execution failed (e.g. compiler error or assertion failure returns status code != 0)
            stdout = execErr.stdout || '';
            stderr = execErr.stderr || execErr.message || '';
        }

        // 5. Parse test results
        const resultMatch = stdout.match(/RESULT:(\d+)\/(\d+)/);
        let passed = 0;
        let total = 0;
        let success = false;

        if (resultMatch) {
            passed = parseInt(resultMatch[1], 10);
            total = parseInt(resultMatch[2], 10);
            success = passed === total && total > 0;
        }

        // Format clean console logs
        const cleanOutput = stdout.replace(/RESULT:\d+\/\d+/, '').trim();

        return NextResponse.json({
            success,
            passed,
            total,
            output: cleanOutput,
            error: stderr.trim(),
        });
    } catch (err: any) {
        logger.error({ err }, 'Execution router error');
        return NextResponse.json({ error: err.message || 'Execution error' }, { status: 500 });
    } finally {
        // 6. Clean up temporary files
        try {
            if (tempFile && fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
            if (tempBin && fs.existsSync(tempBin)) {
                fs.unlinkSync(tempBin);
            }
        } catch (cleanupErr) {
            logger.error({ err: cleanupErr }, 'Failed to cleanup temp files');
        }
    }
}
