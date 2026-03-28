"""
Gemini Vision and Text analysis service.
Uses the modern google-genai SDK. Runs sync calls in thread pool for uvicorn compatibility.
"""

import asyncio
import json
import re
from pathlib import Path

from google import genai
from google.genai import types

from config import settings


class GeminiService:
    """Service for interacting with Gemini AI for vision and text tasks."""

    def __init__(self) -> None:
        self._client = genai.Client(api_key=settings.GOOGLE_API_KEY)

    def _sync_analyze_diagram(self, image_path: str, prompt: str) -> dict:
        """Synchronous diagram analysis (runs in thread pool)."""
        image_file = Path(image_path)
        if not image_file.exists():
            return {"error": f"Image file not found: {image_path}", "nodes": []}

        image_bytes = image_file.read_bytes()
        mime_map = {
            ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".tiff": "image/tiff", ".tif": "image/tiff", ".bmp": "image/bmp",
            ".webp": "image/webp", ".pdf": "application/pdf",
        }
        mime_type = mime_map.get(image_file.suffix.lower(), "image/png")

        try:
            response = self._client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=types.Content(
                    parts=[
                        types.Part(inline_data=types.Blob(data=image_bytes, mime_type=mime_type)),
                        types.Part(text=prompt),
                    ]
                ),
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=32768,
                    response_mime_type="application/json",
                ),
            )
            return self._parse_json_response(response.text)
        except Exception as e:
            return {"error": f"Gemini vision API error: {str(e)}", "nodes": []}

    def _sync_analyze_text(self, text: str, prompt: str) -> dict:
        """Synchronous text analysis (runs in thread pool)."""
        try:
            response = self._client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=32768,
                    response_mime_type="application/json",
                ),
            )
            return self._parse_json_response(response.text)
        except Exception as e:
            return {"error": f"Gemini text API error: {str(e)}"}

    async def analyze_diagram(self, image_path: str, prompt: str) -> dict:
        """Async wrapper — runs sync Gemini call in thread pool."""
        return await asyncio.to_thread(self._sync_analyze_diagram, image_path, prompt)

    async def analyze_text(self, text: str, prompt: str) -> dict:
        """Async wrapper — runs sync Gemini call in thread pool."""
        return await asyncio.to_thread(self._sync_analyze_text, text, prompt)

    @staticmethod
    def _parse_json_response(response_text: str) -> dict:
        """Parse a JSON response from Gemini, handling various formats."""
        if not response_text:
            return {"error": "Empty response from Gemini", "nodes": []}

        cleaned = response_text.strip()

        # Strip markdown code block wrappers
        json_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", cleaned, re.DOTALL)
        if json_match:
            cleaned = json_match.group(1).strip()

        # Try direct parse
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Try to find the outermost balanced { ... } with "nodes"
        start = cleaned.find('{"nodes"')
        if start == -1:
            start = cleaned.find('"nodes"')
            if start > 0:
                start = cleaned.rfind('{', 0, start)

        if start >= 0:
            # Find matching closing brace
            depth = 0
            for i in range(start, len(cleaned)):
                if cleaned[i] == '{':
                    depth += 1
                elif cleaned[i] == '}':
                    depth -= 1
                    if depth == 0:
                        try:
                            return json.loads(cleaned[start:i+1])
                        except json.JSONDecodeError:
                            break

        # Last resort: find any JSON array
        arr_match = re.search(r'\[.*\]', cleaned, re.DOTALL)
        if arr_match:
            try:
                arr = json.loads(arr_match.group(0))
                if isinstance(arr, list):
                    return {"nodes": arr}
            except json.JSONDecodeError:
                pass

        # Try to recover truncated JSON (Gemini hit token limit)
        if '"nodes"' in cleaned:
            try:
                # Find all complete node objects
                import re as re2
                node_pattern = re2.compile(r'\{[^{}]*"node_id"[^{}]*\}', re2.DOTALL)
                node_matches = node_pattern.findall(cleaned)
                if node_matches:
                    recovered_nodes = []
                    for nm in node_matches:
                        try:
                            recovered_nodes.append(json.loads(nm))
                        except json.JSONDecodeError:
                            continue
                    if recovered_nodes:
                        print(f"[GEMINI] Recovered {len(recovered_nodes)} nodes from truncated JSON")
                        return {"nodes": recovered_nodes}
            except Exception:
                pass

        print(f"[GEMINI] Failed to parse JSON. Length: {len(response_text)}")
        return {"error": "Failed to parse JSON from Gemini response", "nodes": [], "raw_response": response_text[:300]}


# Module-level singleton
gemini_service = GeminiService()
