import { toA2a } from '@google/adk';
import express from 'express';
import rootAgent from './adk-agents/search-agent';
import qaAgent from './adk-agents/qa-agent';
import challengesAgent from './adk-agents/challenges-agent';
import { logger } from './utils/logger';

const app = express();
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json({ limit: '50mb' }));

const startServer = async () => {
    await toA2a(rootAgent, { app, basePath: '/search' });
    await toA2a(qaAgent, { app, basePath: '/qa' });
    await toA2a(challengesAgent, { app, basePath: '/challenges' });

    const port = Number(process.env.PORT || 8000);
    app.listen(port, () => {
        logger.info(`Unified Agent server listening on port ${port}`);
    });
};

startServer().catch((err) => {
    logger.error({ err }, 'Failed to start server');
});

export default rootAgent;
