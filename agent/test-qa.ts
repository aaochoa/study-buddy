import qaAgent from './qa-main';
import { Runner, InMemorySessionService } from '@google/adk';

async function main() {
    console.log('Testing QA Agent...');
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
        console.log('Event received:', JSON.stringify(event, null, 2));
    }
}

main().catch(console.error);
