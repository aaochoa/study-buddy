import os
import json
import httpx
from typing import AsyncGenerator, List, Dict, Any, Optional, ClassVar
from google.adk.models import BaseLlm, LlmRequest, LlmResponse, LLMRegistry
from google.genai import types
from utils.logger import logger

def redact_or_truncate(value: Any) -> Any:
    if isinstance(value, str):
        return value[:100] + "... [truncated]" if len(value) > 100 else value
    if isinstance(value, dict):
        res = {}
        for k, v in value.items():
            if k in ["content", "text", "arguments", "args"]:
                res[k] = (v[:100] + "... [truncated]") if isinstance(v, str) and len(v) > 100 else "[truncated]"
            else:
                res[k] = redact_or_truncate(v)
        return res
    if isinstance(value, list):
        return [redact_or_truncate(x) for x in value]
    return value

class OpenRouterLlm(BaseLlm):
    @classmethod
    def supported_models(cls) -> List[str]:
        return [r"^(gemini-)?([a-zA-Z0-9\-]+\/[a-zA-Z0-9\-]+.*)$"]

    def __init__(self, model: str, **kwargs):
        super().__init__(model=model, **kwargs)

    async def connect(self, llm_request: LlmRequest) -> Any:
        raise NotImplementedError("Live WebSocket connection is not supported for OpenRouterLlm")

    async def generate_content_async(
        self, llm_request: LlmRequest, stream: bool = False
    ) -> AsyncGenerator[LlmResponse, None]:
        url, headers, body = self._build_request_payload(llm_request, stream)

        async with httpx.AsyncClient(timeout=120.0) as client:
            if stream:
                async with client.stream("POST", url, headers=headers, json=body) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        raise RuntimeError(f"OpenRouter API error ({response.status_code}): {error_text.decode('utf-8')}")
                    async for item in self._handle_stream_response(response):
                        yield item
            else:
                response = await client.post(url, headers=headers, json=body)
                if response.status_code != 200:
                    raise RuntimeError(f"OpenRouter API error ({response.status_code}): {response.text}")
                for item in self._handle_single_response(response.json()):
                    yield item

    def _map_messages(self, contents: List[Any], system_instruction: Any = None) -> List[Dict[str, Any]]:
        messages = []

        # System instruction
        sys_text = ""
        if system_instruction:
            if isinstance(system_instruction, str):
                sys_text = system_instruction
            elif hasattr(system_instruction, "parts"):
                parts = system_instruction.parts or []
                sys_text = "".join([p.text for p in parts if hasattr(p, "text") and p.text])
            elif isinstance(system_instruction, dict):
                sys_text = system_instruction.get("text", "")

        if sys_text:
            messages.append({"role": "system", "content": sys_text})

        for content in contents or []:
            role = "assistant" if getattr(content, "role", None) == "model" else "user"
            text = ""
            tool_calls = []

            parts = getattr(content, "parts", []) or []
            for part in parts:
                part_text = getattr(part, "text", None)
                if part_text:
                    text += part_text
                
                # Check function call
                fn_call = getattr(part, "function_call", None)
                if fn_call:
                    call_id = getattr(fn_call, "id", None) or f"call_{os.urandom(4).hex()}"
                    args = getattr(fn_call, "args", {}) or {}
                    tool_calls.append({
                        "id": call_id,
                        "type": "function",
                        "function": {
                            "name": getattr(fn_call, "name", ""),
                            "arguments": json.dumps(args) if isinstance(args, dict) else str(args)
                        }
                    })

                # Check function response
                fn_resp = getattr(part, "function_response", None)
                if fn_resp:
                    resp_id = getattr(fn_resp, "id", "")
                    fn_name = getattr(fn_resp, "name", "")
                    resp_data = getattr(fn_resp, "response", {})
                    messages.append({
                        "role": "tool",
                        "tool_call_id": resp_id,
                        "name": fn_name,
                        "content": json.dumps(resp_data) if isinstance(resp_data, dict) else str(resp_data)
                    })

            if text or tool_calls:
                msg: Dict[str, Any] = {"role": role}
                if text:
                    msg["content"] = text
                if tool_calls:
                    msg["tool_calls"] = tool_calls
                messages.append(msg)

        return messages

    def _map_tools(self, tools: Any = None) -> List[Dict[str, Any]]:
        mapped_tools = []
        if not tools:
            return mapped_tools

        tool_list = tools if isinstance(tools, list) else [tools]
        for t in tool_list:
            fn_decls = getattr(t, "function_declarations", None)
            if fn_decls:
                for decl in fn_decls:
                    mapped_tools.append({
                        "type": "function",
                        "function": {
                            "name": getattr(decl, "name", ""),
                            "description": getattr(decl, "description", "") or "",
                            "parameters": getattr(decl, "parameters", {}) or {"type": "object", "properties": {}}
                        }
                    })
            elif getattr(t, "google_search", None) or getattr(t, "google_search_retrieval", None):
                mapped_tools.append({"type": "openrouter:web_search"})

        return mapped_tools

    def _build_request_payload(self, llm_request: LlmRequest, stream: bool) -> tuple[str, dict, dict]:
        sys_inst = None
        if hasattr(llm_request, "config") and llm_request.config:
            sys_inst = getattr(llm_request.config, "system_instruction", None)

        messages = self._map_messages(llm_request.contents, sys_inst)
        
        tools = None
        if hasattr(llm_request, "config") and llm_request.config:
            tools = getattr(llm_request.config, "tools", None)
        mapped_tools = self._map_tools(tools)

        openrouter_url = os.getenv("OPENROUTER_URL", "https://openrouter.ai").rstrip("/")
        api_key = os.getenv("OPENROUTER_API_KEY")

        if not api_key:
            # Fallback to Gemini / Google API key if OpenRouter key is not set and model is gemini
            api_key = os.getenv("GOOGLE_GENAI_API_KEY", "")

        model_name = self.model
        if model_name.startswith("gemini-"):
            model_name = model_name[7:]

        body: Dict[str, Any] = {
            "model": model_name,
            "messages": messages,
            "stream": stream,
        }

        if mapped_tools:
            body["tools"] = mapped_tools

        if hasattr(llm_request, "config") and llm_request.config:
            mime = getattr(llm_request.config, "response_mime_type", None)
            if mime == "application/json":
                body["response_format"] = {"type": "json_object"}

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "https://github.com/aaochoa/study-buddy",
            "X-Title": "Study Buddy AI Python",
        }

        return f"{openrouter_url}/api/v1/chat/completions", headers, body

    async def _handle_stream_response(self, response: httpx.Response) -> AsyncGenerator[LlmResponse, None]:
        accumulated_text = ""
        accumulated_tool_calls: Dict[int, Dict[str, Any]] = {}
        finish_reason = "STOP"

        async for line in response.aiter_lines():
            line = line.strip()
            if not line or not line.startswith("data: "):
                continue

            data_str = line[6:]
            if data_str == "[DONE]":
                break

            try:
                parsed = json.loads(data_str)
                choices = parsed.get("choices", [])
                if not choices:
                    continue
                
                choice = choices[0]
                if choice.get("finish_reason"):
                    finish_reason = "STOP" if choice["finish_reason"] == "stop" else choice["finish_reason"]

                delta = choice.get("delta", {})
                content_delta = delta.get("content")
                if content_delta:
                    accumulated_text += content_delta
                    part = types.Part.from_text(text=content_delta)
                    yield LlmResponse(
                        content=types.Content(role="model", parts=[part]),
                        partial=True
                    )

                tool_calls_delta = delta.get("tool_calls", [])
                for tc in tool_calls_delta:
                    idx = tc.get("index", 0)
                    if idx not in accumulated_tool_calls:
                        accumulated_tool_calls[idx] = {"arguments": ""}
                    acc = accumulated_tool_calls[idx]
                    if tc.get("id"):
                        acc["id"] = tc["id"]
                    fn = tc.get("function", {})
                    if fn.get("name"):
                        acc["name"] = fn["name"]
                    if fn.get("arguments"):
                        acc["arguments"] += fn["arguments"]

            except Exception:
                pass

        # Handle tool calls
        final_parts = []
        for idx in sorted(accumulated_tool_calls.keys()):
            acc = accumulated_tool_calls[idx]
            if acc.get("name"):
                try:
                    args = json.loads(acc["arguments"])
                except Exception:
                    args = {}
                fn_call = types.FunctionCall(name=acc["name"], args=args, id=acc.get("id"))
                final_parts.append(types.Part(function_call=fn_call))

        if not final_parts and accumulated_text:
            final_parts.append(types.Part.from_text(text=accumulated_text))

        if final_parts:
            yield LlmResponse(
                content=types.Content(role="model", parts=final_parts),
                partial=False
            )

    def _handle_single_response(self, data: dict) -> List[LlmResponse]:
        choices = data.get("choices", [])
        if not choices:
            raise RuntimeError(f"No choices returned from OpenRouter API: {data}")

        choice = choices[0]
        message = choice.get("message", {})
        parts = []

        if message.get("content"):
            parts.append(types.Part.from_text(text=message["content"]))

        for tc in message.get("tool_calls", []):
            if tc.get("type") == "function":
                fn = tc.get("function", {})
                try:
                    args = json.loads(fn.get("arguments", "{}"))
                except Exception:
                    args = {}
                fn_call = types.FunctionCall(name=fn.get("name", ""), args=args, id=tc.get("id"))
                parts.append(types.Part(function_call=fn_call))

        return [
            LlmResponse(
                content=types.Content(role="model", parts=parts),
                partial=False
            )
        ]

# Register OpenRouterLlm provider
LLMRegistry.register(OpenRouterLlm)
