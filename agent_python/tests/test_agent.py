import unittest
from unittest.mock import MagicMock
from utils.file_definition import get_filename
from utils.openrouter_llm import OpenRouterLlm, redact_or_truncate


class TestFileDefinition(unittest.TestCase):
    def test_get_filename_sanitization(self):
        """Tests topic cleaning and date suffix formatting in get_filename."""
        mock_context = MagicMock()
        mock_context.user_content.parts = [{"text": "Can you please research React Server Components for me?"}]

        filename = get_filename(mock_context)
        self.assertTrue(filename.startswith("react_server_components_"))
        self.assertTrue(filename.endswith(".md"))

    def test_get_filename_empty_fallback(self):
        """Tests fallback topic name when user prompt is empty or contains only stop words."""
        mock_context = MagicMock()
        mock_context.user_content.parts = [{"text": "please for about"}]

        filename = get_filename(mock_context)
        self.assertTrue(filename.startswith("research_"))
        self.assertTrue(filename.endswith(".md"))


class TestOpenRouterLlm(unittest.TestCase):
    def test_supported_models_regex(self):
        """Tests supported_models regex patterns."""
        import re

        pattern = OpenRouterLlm.supported_models()[0]
        self.assertTrue(re.match(pattern, "google/gemini-2.5-flash"))
        self.assertTrue(re.match(pattern, "qwen/qwen3-coder:free"))
        self.assertTrue(re.match(pattern, "gemini-google/gemini-2.0-flash"))
        self.assertIsNone(re.match(pattern, "plain-model-without-slash"))

    def test_redact_or_truncate(self):
        """Tests string and dict truncation helper."""
        long_string = "a" * 150
        truncated = redact_or_truncate(long_string)
        self.assertTrue(truncated.endswith("... [truncated]"))
        self.assertEqual(len(truncated), 115)

        data = {"text": long_string, "other": "short"}
        res = redact_or_truncate(data)
        self.assertTrue(res["text"].endswith("... [truncated]"))
        self.assertEqual(res["other"], "short")

    def test_map_messages_system_and_user(self):
        """Tests _map_messages mapping from Google ADK content formats to OpenRouter JSON."""
        llm = OpenRouterLlm(model="google/gemini-2.5-flash")

        mock_content = MagicMock()
        mock_content.role = "user"
        mock_part = MagicMock()
        mock_part.text = "Hello study agent!"
        mock_part.function_call = None
        mock_part.function_response = None
        mock_content.parts = [mock_part]

        messages = llm._map_messages([mock_content], system_instruction="System prompt")
        self.assertEqual(len(messages), 2)
        self.assertEqual(messages[0], {"role": "system", "content": "System prompt"})
        self.assertEqual(messages[1], {"role": "user", "content": "Hello study agent!"})


if __name__ == "__main__":
    unittest.main()
