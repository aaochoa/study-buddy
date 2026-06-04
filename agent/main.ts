import { toA2a } from '@google/adk';
import express from 'express';
import rootAgent from './adk-agents/search-agent';
import qaAgent from './adk-agents/qa-agent';
import challengesAgent from './adk-agents/challenges-agent';

const app = express();
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json({ limit: '50mb' }));

const startServer = async () => {
    await toA2a(rootAgent, { app, basePath: '/search' });
    await toA2a(qaAgent, { app, basePath: '/qa' });
    await toA2a(challengesAgent, { app, basePath: '/challenges' });

    const port = Number(process.env.PORT || 8000);
    app.listen(port, () => {
        console.log(`Unified Agent server listening on port ${port}`);
    });
};

startServer().catch((err) => {
    console.error('Failed to start server:', err);
});

export default rootAgent;
