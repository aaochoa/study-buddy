import os
import base64
from pathlib import Path
from typing import Any, Optional

from google.adk.agents import LlmAgent, ParallelAgent, SequentialAgent
from google.adk import Context
from google.adk.tools import google_search
from google.genai import types

from utils.prompts import (
    architecture_researcher_instruction,
    questions_researcher_instruction,
    pitfalls_researcher_instruction,
    challenges_researcher_instruction,
    report_agent_instruction,
)
from utils.file_definition import get_filename
from utils.openrouter_llm import OpenRouterLlm

def get_model() -> str:
    research_model = os.getenv("RESEARCH_MODEL")
    if research_model:
        models = research_model.split(",")
        return models[0].strip()
    return os.getenv("GOOGLE_GENAI_MODEL", "gemini-2.0-flash")

model_name = get_model()
model_instance = OpenRouterLlm(model=model_name)

async def report_agent_callback(callback_context: Context) -> Any:
    report = callback_context.state.get("report_result", "") or ""

    if not report:
        invocation_ctx = getattr(callback_context, "invocation_context", None)
        session = getattr(invocation_ctx, "session", None)
        events = getattr(session, "events", []) if session else []
        for ev in reversed(events):
            author = getattr(ev, "author", "")
            if author == callback_context.agent_name:
                content = getattr(ev, "content", None)
                parts = getattr(content, "parts", []) or []
                text = "".join([getattr(p, "text", "") or "" for p in parts])
                if text:
                    report = text
                    break

    filename = get_filename(callback_context)
    
    # Save markdown file under research folder
    research_dir = Path(__file__).parent.parent / "research"
    research_dir.mkdir(parents=True, exist_ok=True)
    
    full_path = research_dir / filename
    full_path.write_text(report, encoding="utf-8")

    # Base64 download link
    base64_content = base64.b64encode(report.encode("utf-8")).decode("utf-8")
    data_uri = f"data:application/octet-stream;base64,{base64_content}"
    download_link = f"[Click here to download {filename}]({data_uri})"

    return types.Content(
        role="model",
        parts=[types.Part.from_text(text=f"{report}\n\n{download_link}")]
    )

async def limit_llm_calls_callback(callback_context: Context) -> Optional[Any]:
    invocation_ctx = getattr(callback_context, "invocation_context", None)
    cost_mgr = getattr(invocation_ctx, "invocation_cost_manager", None) or getattr(invocation_ctx, "invocationCostManager", None)
    calls = getattr(cost_mgr, "number_of_llm_calls", 0) if cost_mgr else 0
    if calls >= 2:
        return types.Content(
            role="model",
            parts=[types.Part.from_text(text="Research limit reached.")]
        )
    return None

architecture_agent = LlmAgent(
    name="architecture_researcher",
    description="Researches core architecture and internals.",
    model=model_instance,
    instruction=architecture_researcher_instruction,
    tools=[google_search],
    output_key="architecture_result",
    before_model_callback=limit_llm_calls_callback,
    generate_content_config=types.GenerateContentConfig(
        max_output_tokens=2500,
        temperature=0.2,
    ),
)

questions_agent = LlmAgent(
    name="questions_researcher",
    description="Researches common interview questions.",
    model=model_instance,
    instruction=questions_researcher_instruction,
    tools=[google_search],
    output_key="questions_result",
    before_model_callback=limit_llm_calls_callback,
    generate_content_config=types.GenerateContentConfig(
        max_output_tokens=2500,
        temperature=0.2,
    ),
)

pitfalls_agent = LlmAgent(
    name="pitfalls_researcher",
    description="Researches pitfalls, gotchas, and anti-patterns.",
    model=model_instance,
    instruction=pitfalls_researcher_instruction,
    tools=[google_search],
    output_key="pitfalls_result",
    before_model_callback=limit_llm_calls_callback,
    generate_content_config=types.GenerateContentConfig(
        max_output_tokens=2500,
        temperature=0.2,
    ),
)

challenges_agent = LlmAgent(
    name="challenges_researcher",
    description="Researches coding challenges and design scenarios.",
    model=model_instance,
    instruction=challenges_researcher_instruction,
    tools=[google_search],
    output_key="challenges_result",
    before_model_callback=limit_llm_calls_callback,
    generate_content_config=types.GenerateContentConfig(
        max_output_tokens=2500,
        temperature=0.2,
    ),
)

research_agent = ParallelAgent(
    name="researcher",
    description="Performs parallel research across multiple domains.",
    sub_agents=[architecture_agent, questions_agent, pitfalls_agent, challenges_agent],
)

report_agent = LlmAgent(
    name="editor",
    description="Cleans up research results by removing redundancies and formatting the final report.",
    model=model_instance,
    instruction=report_agent_instruction(
        architecture_agent.output_key or "",
        questions_agent.output_key or "",
        pitfalls_agent.output_key or "",
        challenges_agent.output_key or "",
    ),
    output_key="report_result",
    after_agent_callback=report_agent_callback,
)

root_agent = SequentialAgent(
    name="search_assistant",
    description="An assistant that can search the web and create a report and return the final result as a well structured document to start the learning session.",
    sub_agents=[research_agent, report_agent],
)
