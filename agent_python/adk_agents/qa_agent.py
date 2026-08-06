import os
from pathlib import Path
from typing import Any, Optional

from google.adk.agents import LlmAgent
from google.adk import Context
from google.genai import types

from utils.prompts import qa_agent_instruction
from utils.openrouter_llm import OpenRouterLlm
from utils.logger import logger

def get_model() -> str:
    qa_model = os.getenv("QA_MODEL")
    if qa_model:
        return qa_model.strip()
    research_model = os.getenv("RESEARCH_MODEL")
    if research_model:
        models = research_model.split(",")
        return models[0].strip()
    return os.getenv("GOOGLE_GENAI_MODEL", "gemini-2.0-flash")

model_name = get_model()
model_instance = OpenRouterLlm(model=model_name)

def get_latest_guide_content() -> str:
    research_dir = Path(__file__).parent.parent / "research"
    if not research_dir.exists():
        research_dir = Path(__file__).parent.parent.parent / "agent" / "research"
        if not research_dir.exists():
            return ""

    try:
        md_files = list(research_dir.glob("*.md"))
        if not md_files:
            return ""

        sorted_files = sorted(md_files, key=lambda p: p.stat().st_mtime, reverse=True)
        return sorted_files[0].read_text(encoding="utf-8")
    except Exception as err:
        logger.error(f"Failed to read latest guide file: {err}")
        return ""

async def limit_llm_calls_callback(callback_context: Context) -> Optional[Any]:
    invocation_ctx = getattr(callback_context, "invocation_context", None)
    cost_mgr = getattr(invocation_ctx, "invocation_cost_manager", None) or getattr(invocation_ctx, "invocationCostManager", None)
    calls = getattr(cost_mgr, "number_of_llm_calls", 0) if cost_mgr else 0
    if calls >= 10:
        return types.Content(
            role="model",
            parts=[types.Part.from_text(text="Conversation limit reached for this session.")]
        )
    return None

async def prepare_qa_instruction_callback(callback_context: Context) -> None:
    latest_guide = get_latest_guide_content()
    instruction = qa_agent_instruction
    if latest_guide:
        instruction += f"\n\nHere is the content of the current study guide you must answer questions about:\n\n=== STUDY GUIDE START ===\n{latest_guide}\n=== STUDY GUIDE END ==="
    else:
        instruction += "\n\nIMPORTANT: Currently, no study guide has been generated yet. Please politely ask the user to research a topic first in the sidebar."
    callback_context.agent.instruction = instruction

qa_agent = LlmAgent(
    name="study_buddy_qa",
    description="QA assistant that answers questions based on the latest researched study guide.",
    model=model_instance,
    instruction=qa_agent_instruction,
    before_agent_callback=prepare_qa_instruction_callback,
    before_model_callback=limit_llm_calls_callback,
    generate_content_config=types.GenerateContentConfig(
        max_output_tokens=2000,
        temperature=0.3,
    ),
)
