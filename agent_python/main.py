import os
from contextlib import asynccontextmanager
import uvicorn
from dotenv import load_dotenv
from starlette.applications import Starlette
from google.adk.a2a.utils.agent_to_a2a import to_a2a

from adk_agents.search_agent import root_agent
from adk_agents.qa_agent import qa_agent
from adk_agents.challenges_agent import challenges_agent
from utils.logger import logger

load_dotenv()

# Create A2A apps for each agent (rpc_path="" because Starlette mount handles subpaths)
search_app = to_a2a(root_agent, rpc_path="")
qa_app = to_a2a(qa_agent, rpc_path="")
challenges_app = to_a2a(challenges_agent, rpc_path="")

@asynccontextmanager
async def combined_lifespan(app: Starlette):
    async with search_app.router.lifespan_context(search_app):
        async with qa_app.router.lifespan_context(qa_app):
            async with challenges_app.router.lifespan_context(challenges_app):
                yield

# Combined main Starlette application
app = Starlette(lifespan=combined_lifespan)
app.mount("/search", search_app)
app.mount("/qa", qa_app)
app.mount("/challenges", challenges_app)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Unified Python ADK Agent server listening on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
