"""Gemini LLM client for extraction, chat, and agent reasoning."""
from __future__ import annotations

import json
import logging
import re
from typing import Any

from ..core.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self) -> None:
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.GEMINI_MODEL
        self._client = None

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    def _get_client(self):
        if self._client is None:
            if not self.api_key:
                raise RuntimeError("GEMINI_API_KEY is not configured")
            from google import genai

            self._client = genai.Client(api_key=self.api_key)
        return self._client

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

        response = client.models.generate_content(
            model=self.model,
            contents=user,
            config=config,
        )
        return (response.text or "").strip()

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
    ) -> tuple[str, list[str]]:
        if not self.available:
            raise RuntimeError("GEMINI_API_KEY is not configured")

        from google.genai import types

        client = self._get_client()
        config = types.GenerateContentConfig(
            system_instruction=system,
            temperature=temperature,
            max_output_tokens=max_tokens,
            tools=tools,
        )
        
        chat = client.chats.create(model=self.model, config=config)
        response = chat.send_message(user)
        
        agents_used = []
        detailed_calls = []
        
        # Manually loop over function calls if present
        while response.function_calls:
            function_responses = []
            for call in response.function_calls:
                fn_name = call.name
                args = call.args or {}
                
                detailed_calls.append({"name": fn_name, "args": args})
                
                # Find the matching tool function
                target_fn = next((t for t in tools if t.__name__ == fn_name), None)
                if not target_fn:
                    res_dict = {"error": f"Unknown tool: {fn_name}"}
                else:
                    if fn_name not in agents_used:
                        agents_used.append(fn_name)
                    try:
                        # Call the python function
                        fn_result = target_fn(**args)
                        res_dict = {"result": fn_result}
                    except Exception as e:
                        res_dict = {"error": str(e)}
                
                function_responses.append(
                    types.Part.from_function_response(
                        name=fn_name,
                        response=res_dict
                    )
                )
                
            # Send the function responses back to the model
            response = chat.send_message(function_responses)
            
        return (response.text or "").strip(), detailed_calls


llm_service = LLMService()
