import os
from google.adk.agents import LlmAgent
from google.genai import types

from utils.prompts import challenges_creator_instruction
from utils.openrouter_llm import OpenRouterLlm

def get_model() -> str:
    challenges_model = os.getenv("CHALLENGES_MODEL")
    if challenges_model:
        return challenges_model.strip()
    research_model = os.getenv("RESEARCH_MODEL")
    if research_model:
        models = research_model.split(",")
        return models[0].strip()
    return os.getenv("GOOGLE_GENAI_MODEL", "gemini-2.0-flash")

model_name = get_model()
model_instance = OpenRouterLlm(model=model_name)

challenges_agent = LlmAgent(
    name="study_buddy_challenges",
    description="Generates 3 well-explained programming challenges (1 easy, 1 medium, 1 hard).",
    model=model_instance,
    instruction=challenges_creator_instruction,
    # Omit output_key so the agent always generates a fresh response
    generate_content_config=types.GenerateContentConfig(
        max_output_tokens=8000,
        temperature=0.3,
    ),
)
