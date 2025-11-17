"""
Claude AI Provider implementation.
"""
import json
from typing import List, Dict, Any, Optional
from anthropic import Anthropic

from app.services.ai_provider_base import BaseAIProvider
from app.models.schemas import (
    ResearchRequest,
    ResearchResponse,
    ExplainTopicRequest,
    ExplainTopicResponse,
    Note,
    MemoryPalaceStructure,
    MemoryPalaceRoom,
)


class ClaudeProvider(BaseAIProvider):
    """Claude AI provider implementation."""

    def __init__(self, api_key: str, model_name: str, max_tokens: int = 4096, temperature: float = 0.7):
        super().__init__(api_key, model_name, max_tokens, temperature)
        self.client = Anthropic(api_key=api_key)

    async def generate_completion(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Generate a completion using Claude."""
        response = self.client.messages.create(
            model=self.model_name,
            max_tokens=self.max_tokens,
            temperature=self.temperature,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text

    async def synthesize_research(self, request: ResearchRequest) -> ResearchResponse:
        """Synthesize research using Claude."""
        prompt = self._build_research_prompt(request)
        content = await self.generate_completion(prompt)
        return self._parse_research_response(content, request.topic)

    async def explain_topic(self, request: ExplainTopicRequest) -> ExplainTopicResponse:
        """Explain topic using Claude."""
        prompt = self._build_explanation_prompt(request)
        content = await self.generate_completion(prompt)
        return self._parse_explanation_response(content, request.topic)

    async def organize_notes(
        self,
        notes: List[Note],
        existing_structure: Optional[Dict[str, Any]] = None
    ) -> MemoryPalaceStructure:
        """Organize notes using Claude."""
        prompt = self._build_organization_prompt(notes, existing_structure)
        content = await self.generate_completion(prompt)
        return self._parse_organization_response(content, notes)

    def _parse_research_response(self, content: str, topic: str) -> ResearchResponse:
        """Parse Claude's research response."""
        try:
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                json_str = content[json_start:json_end]
                data = json.loads(json_str)
            else:
                data = self._parse_research_text(content)

            return ResearchResponse(
                topic=topic,
                overview=data.get("overview", ""),
                key_findings=data.get("key_findings", []),
                connections=data.get("connections"),
                further_reading=data.get("further_reading", [])
            )
        except Exception:
            return ResearchResponse(
                topic=topic,
                overview=content[:500],
                key_findings=["Response parsing failed. See overview for raw content."],
                connections=None,
                further_reading=[]
            )

    def _parse_explanation_response(self, content: str, topic: str) -> ExplainTopicResponse:
        """Parse Claude's explanation response."""
        try:
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                json_str = content[json_start:json_end]
                data = json.loads(json_str)
            else:
                data = self._parse_explanation_text(content)

            return ExplainTopicResponse(
                topic=topic,
                introduction=data.get("introduction", ""),
                steps=data.get("steps", []),
                analogies=data.get("analogies", []),
                references=data.get("references", []),
                latex_equations=data.get("latex_equations", [])
            )
        except Exception:
            return ExplainTopicResponse(
                topic=topic,
                introduction=content[:500],
                steps=[{"title": "Raw Response", "content": content}],
                analogies=[],
                references=[]
            )

    def _parse_organization_response(self, content: str, notes: List[Note]) -> MemoryPalaceStructure:
        """Parse Claude's organization response."""
        try:
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                json_str = content[json_start:json_end]
                data = json.loads(json_str)
            else:
                return self._create_default_structure(notes)

            rooms = [MemoryPalaceRoom(**room_data) for room_data in data.get("rooms", [])]
            notes_index = {note.id: note for note in notes}

            return MemoryPalaceStructure(
                rooms=rooms,
                notes_index=notes_index,
                metadata={"suggestions": data.get("suggestions", [])}
            )
        except Exception:
            return self._create_default_structure(notes)

    def _parse_research_text(self, content: str) -> Dict[str, Any]:
        """Fallback parser for plain text research response."""
        return {
            "overview": content[:300],
            "key_findings": [line.strip() for line in content.split('\n') if line.strip()][:5],
            "connections": None,
            "further_reading": []
        }

    def _parse_explanation_text(self, content: str) -> Dict[str, Any]:
        """Fallback parser for plain text explanation response."""
        return {
            "introduction": content[:300],
            "steps": [{"title": "Content", "content": content}],
            "analogies": [],
            "references": []
        }

    def _create_default_structure(self, notes: List[Note]) -> MemoryPalaceStructure:
        """Create a simple default structure when parsing fails."""
        room = MemoryPalaceRoom(
            id="default_room",
            name="General Knowledge",
            description="Default organization of notes",
            notes=[note.id for note in notes],
            position={"x": 0, "y": 0, "z": 0},
            color="#3B82F6",
            connections=[]
        )

        notes_index = {note.id: note for note in notes}

        return MemoryPalaceStructure(
            rooms=[room],
            notes_index=notes_index,
            metadata={"suggestions": ["Consider organizing notes by topic for better structure."]}
        )
