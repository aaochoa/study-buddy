import re
from datetime import datetime
from typing import Any

def get_filename(callback_context: Any) -> str:
    """
    Generates a friendly Markdown filename based on the user's research topic and the current date.
    Format: [sanitized_topic]_[DayMonthYear].md (e.g. react_hooks_06Aug2026.md)
    """
    user_prompt = ""
    user_content = getattr(callback_context, "user_content", None)
    if user_content and hasattr(user_content, "parts"):
        parts = user_content.parts or []
        extracted = []
        for part in parts:
            if isinstance(part, dict) and "text" in part:
                extracted.append(part["text"])
            elif hasattr(part, "text") and part.text:
                extracted.append(part.text)
        user_prompt = " ".join(extracted).strip()

    # Clean up the prompt to make it a friendly filename
    stop_words = r"\b(research|study|guide|prepare|for|about|on|can|you|please|me|a|an|the|write|create|generate|make)\b"
    topic = re.sub(stop_words, "", user_prompt, flags=re.IGNORECASE)
    topic = re.sub(r"[^a-zA-Z0-9\s_\-]", "", topic).strip()
    topic = re.sub(r"\s+", "_", topic).lower()

    if not topic:
        topic = "research"

    now = datetime.now()
    day = now.strftime("%d")
    month = now.strftime("%b")
    year = now.strftime("%Y")
    date_str = f"{day}{month}{year}"

    return f"{topic}_{date_str}.md"
