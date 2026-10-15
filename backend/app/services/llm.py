"""Gemini LLM client for extraction, chat, and agent reasoning."""
from __future__ import annotations

import json
import logging
import re
import time
from typing import Any, Callable, TypeVar

from ..core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Transient server errors worth one more try on the same model. 503 ("high demand")
# is excluded: retrying it rarely helps, so we move straight to the next model.
RETRY_SAME_MODEL_CODES = {500, 502, 504}
RETRY_DELAY_SECONDS = 1.5
# After a model fails, skip it for this long so every request doesn't pay its latency.
MODEL_COOLDOWN_SECONDS = 60
MAX_TOOL_ROUNDS = 5


class EmptyResponseError(RuntimeError):
    pass


class LLMService:
    def __init__(self) -> None:
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.GEMINI_MODEL
        self.fallback_models = [
            m.strip() for m in (settings.GEMINI_FALLBACK_MODELS or "").split(",") if m.strip()
        ]
        self._client = None
        self._cooldown_until: dict[str, float] = {}

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    @property
    def models(self) -> list[str]:
        chain: list[str] = []
        for m in [self.model, *self.fallback_models]:
            if m and m not in chain:
                chain.append(m)
        return chain

    def _get_client(self):
        if self._client is None:
            if not self.api_key:
                raise RuntimeError("GEMINI_API_KEY is not configured")
            from google import genai
            from google.genai import types

            self._client = genai.Client(
                api_key=self.api_key,
                http_options=types.HttpOptions(timeout=settings.GEMINI_REQUEST_TIMEOUT_MS),
            )
        return self._client

    def _with_fallback(self, call: Callable[[str], T]) -> T:
        now = time.monotonic()
        healthy = [m for m in self.models if self._cooldown_until.get(m, 0) <= now]
        # If every model is cooling down, try them all anyway rather than refusing the request.
        chain = healthy or self.models

        last_exc: Exception | None = None
        for model in chain:
            for attempt in (1, 2):
                try:
                    result = call(model)
                    self._cooldown_until.pop(model, None)
                    if model != self.model:
                        logger.warning("Gemini fallback model %s served the request", model)
                    return result
                except Exception as exc:
                    last_exc = exc
                    code = getattr(exc, "code", None)
                    logger.warning("Gemini model %s failed (attempt %s): %s", model, attempt, str(exc)[:200])
                    if attempt == 1 and code in RETRY_SAME_MODEL_CODES:
                        time.sleep(RETRY_DELAY_SECONDS)
                        continue
                    self._cooldown_until[model] = time.monotonic() + MODEL_COOLDOWN_SECONDS
                    break
        raise last_exc or RuntimeError("No Gemini models configured")

    def complete(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int = 2048,
        temperature: float = 0.2,
        response_mime_type: str | None = None,
    ) -> str:
        if not self.available:
            raise RuntimeError("GEMINI_API_KEY is not configured")

        from google.genai import types

        client = self._get_client()
        config = types.GenerateContentConfig(
            system_instruction=system,
            temperature=temperature,
            max_output_tokens=max_tokens,
        )
        if response_mime_type:
            config.response_mime_type = response_mime_type

        def call(model: str) -> str:
            response = client.models.generate_content(model=model, contents=user, config=config)
            text = (response.text or "").strip()
            if not text:
                raise EmptyResponseError(f"{model} returned an empty response")
            return text

        return self._with_fallback(call)

    def complete_json(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int = 2048,
    ) -> dict[str, Any]:
        text = self.complete(
            system,
            user,
            max_tokens=max_tokens,
            temperature=0,
            response_mime_type="application/json",
        )
        return self._parse_json(text)

    @staticmethod
    def _parse_json(text: str) -> dict[str, Any]:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        try:
            data = json.loads(cleaned)
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            pass
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if match:
            return json.loads(match.group(0))
        raise ValueError(f"LLM did not return valid JSON: {text[:200]}")

    def chat_with_tools(
        self,
        system: str,
        user: str,
        tools: list,
        *,
        max_tokens: int = 2048,
        temperature: float = 0.2,
    ) -> tuple[str, list[dict[str, Any]]]:
        if not self.available:
            raise RuntimeError("GEMINI_API_KEY is not configured")

        from google.genai import types

        client = self._get_client()
        config = types.GenerateContentConfig(
            system_instruction=system,
            temperature=temperature,
            max_output_tokens=max_tokens,
            tools=tools,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
        )

        # Tools can have side effects (e.g. generating a filing), so a model switch
        # mid-conversation must reuse earlier results instead of re-running them.
        tool_results: dict[str, dict[str, Any]] = {}

        def run_tool(fn_name: str, args: dict[str, Any]) -> dict[str, Any]:
            key = f"{fn_name}:{json.dumps(args, sort_keys=True, default=str)}"
            if key in tool_results:
                return tool_results[key]
            target_fn = next((t for t in tools if t.__name__ == fn_name), None)
            if not target_fn:
                res_dict = {"error": f"Unknown tool: {fn_name}"}
            else:
                try:
                    res_dict = {"result": target_fn(**args)}
                except Exception as e:
                    res_dict = {"error": str(e)}
            tool_results[key] = res_dict
            return res_dict

        def call(model: str) -> tuple[str, list[dict[str, Any]]]:
            detailed_calls: list[dict[str, Any]] = []
            chat = client.chats.create(model=model, config=config)
            response = chat.send_message(user)

            for _ in range(MAX_TOOL_ROUNDS):
                if not response.function_calls:
                    break
                function_responses = []
                for fc in response.function_calls:
                    args = dict(fc.args or {})
                    detailed_calls.append({"name": fc.name, "args": args})
                    function_responses.append(
                        types.Part.from_function_response(name=fc.name, response=run_tool(fc.name, args))
                    )
                response = chat.send_message(function_responses)

            text = (response.text or "").strip()
            if not text:
                raise EmptyResponseError(f"{model} returned an empty response")
            return text, detailed_calls

        return self._with_fallback(call)


llm_service = LLMService()
