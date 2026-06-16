import qaAgent from './adk-agents/qa-agent';
import { Runner, InMemorySessionService } from '@google/adk';
import { logger } from './utils/logger';

/**
 * Entry point for running the QA agent locally inside an ephemeral runner
 * to test if it correctly picks up the latest study guide and responds.
 */
async function main() {
    logger.info('Testing QA Agent...');
    const runner = new Runner({
        appName: 'test',
        agent: qaAgent,
        sessionService: new InMemorySessionService(),
    });

    const generator = runner.runEphemeral({
        userId: 'test-user',
        newMessage: {
            parts: [{ text: 'What is this study guide about?' }],
        },
    });

    for await (const event of generator) {
        logger.info({ event }, 'Event received');
    }
}

main().catch((err) => logger.error({ err }, 'Error running QA test runner'));
