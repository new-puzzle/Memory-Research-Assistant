"""
Claude AI service for research synthesis and explanations.
"""
import json
from typing import List, Dict, Any
from anthropic import Anthropic
from app.core.config import settings
from app.models.schemas import (
    ResearchRequest,
    ResearchResponse,
    ExplainTopicRequest,
    ExplainTopicResponse,
    Note,
    MemoryPalaceStructure,
    MemoryPalaceRoom,
)


class ClaudeService:
    """Service for interacting with Claude API."""

    def __init__(self):
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.model = settings.claude_model
        self.max_tokens = settings.max_tokens
        self.temperature = settings.temperature

    async def synthesize_research(self, request: ResearchRequest) -> ResearchResponse:
        """
        Fetch and synthesize research on a topic using Claude.
        """
        # Build the prompt for Claude
        prompt = self._build_research_prompt(request)

        # Call Claude API
        response = self.client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            temperature=self.temperature,
            messages=[{"role": "user", "content": prompt}]
        )

        # Parse the response
        content = response.content[0].text
        return self._parse_research_response(content, request.topic)

    async def explain_topic(self, request: ExplainTopicRequest) -> ExplainTopicResponse:
        """
        Provide step-by-step explanation of an advanced topic.
        """
        # Build the prompt for Claude
        prompt = self._build_explanation_prompt(request)

        # Call Claude API
        response = self.client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            temperature=0.5,  # Lower temperature for more precise explanations
            messages=[{"role": "user", "content": prompt}]
        )

        # Parse the response
        content = response.content[0].text
        return self._parse_explanation_response(content, request.topic)

    async def organize_notes(
        self,
        notes: List[Note],
        existing_structure: Dict[str, Any] = None
    ) -> MemoryPalaceStructure:
        """
        Organize notes into a Memory Palace structure using Claude.
        """
        # Build the prompt for Claude
        prompt = self._build_organization_prompt(notes, existing_structure)

        # Call Claude API
        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )

        # Parse the response
        content = response.content[0].text
        return self._parse_organization_response(content, notes)

    def _build_research_prompt(self, request: ResearchRequest) -> str:
        """Build prompt for research synthesis."""
        context_part = f"\n\nContext: {request.context}" if request.context else ""

        return f"""You are a research assistant helping to synthesize academic knowledge.

Topic: {request.topic}{context_part}

Please provide a comprehensive research synthesis with the following structure:

1. **Overview**: A brief 2-3 sentence summary of the topic
2. **Key Findings**: 3-5 bullet points of the most important concepts or discoveries
3. **Connections**: How this topic relates to {request.context if request.context else 'other fields'}
4. **Further Reading**: 3-5 recommended resources (papers, books, or articles)

Format your response as JSON with the following structure:
{{
    "overview": "...",
    "key_findings": ["finding 1", "finding 2", ...],
    "connections": "...",
    "further_reading": [
        {{"title": "...", "author": "...", "url": "..."}},
        ...
    ]
}}

Focus on accuracy, clarity, and providing intuitive explanations suitable for someone with a technical background."""

    def _build_explanation_prompt(self, request: ExplainTopicRequest) -> str:
        """Build prompt for topic explanation."""
        prereq_part = f"\n\nAssumed prerequisite knowledge: {request.prerequisite}" if request.prerequisite else ""
        field_part = f"\n\nProvide analogies from: {request.related_field}" if request.related_field else ""

        complexity_guidance = {
            "beginner": "Explain as if to a motivated high school student with basic math knowledge.",
            "intermediate": "Explain as if to an undergraduate with calculus and linear algebra background.",
            "advanced": "Explain with full mathematical rigor, suitable for graduate students."
        }

        return f"""You are an expert educator explaining advanced topics with clarity and precision.

Topic: {request.topic}{prereq_part}{field_part}

Complexity Level: {request.complexity_level}
{complexity_guidance.get(request.complexity_level, complexity_guidance["intermediate"])}

Please provide a step-by-step explanation with the following structure:

1. **Introduction**: Brief overview of what will be covered (2-3 sentences)
2. **Steps**: Break down the topic into 4-6 logical steps, each with:
   - A clear title
   - Detailed explanation
   - LaTeX equations where appropriate (wrapped in $...$ for inline, $$...$$ for display)
3. **Analogies**: 2-3 intuitive analogies to make concepts concrete
4. **References**: 2-3 recommended resources for deeper study

Format your response as JSON with the following structure:
{{
    "introduction": "...",
    "steps": [
        {{"title": "Step 1 Title", "content": "Explanation with LaTeX equations..."}},
        ...
    ],
    "analogies": ["analogy 1", "analogy 2", ...],
    "references": [
        {{"title": "...", "url": "..."}},
        ...
    ],
    "latex_equations": ["equation1", "equation2", ...]
}}

Use clear language, build concepts progressively, and include concrete examples."""

    def _build_organization_prompt(
        self,
        notes: List[Note],
        existing_structure: Dict[str, Any]
    ) -> str:
        """Build prompt for note organization."""
        notes_summary = "\n".join([
            f"- [{note.id}] {note.title}: {note.content[:100]}... (tags: {', '.join(note.tags)})"
            for note in notes
        ])

        existing_part = ""
        if existing_structure:
            existing_part = f"\n\nExisting structure to integrate with:\n{json.dumps(existing_structure, indent=2)}"

        return f"""You are organizing knowledge into a 3D Memory Palace structure.

Notes to organize:
{notes_summary}{existing_part}

Please organize these notes into themed "rooms" that represent different topics or categories. Create a logical 3D layout where related rooms are connected.

For each room:
1. Give it a descriptive name and brief description
2. Assign relevant notes (by ID)
3. Suggest a 3D position (x, y, z coordinates between -10 and 10)
4. Choose a color (hex code) that represents the theme
5. List connections to other related rooms

Also suggest potential connections between different topics that the user might not have considered.

Format your response as JSON with the following structure:
{{
    "rooms": [
        {{
            "id": "room_1",
            "name": "Room Name",
            "description": "Brief description",
            "notes": ["note_id_1", "note_id_2"],
            "position": {{"x": 0, "y": 0, "z": 0}},
            "color": "#3B82F6",
            "connections": ["room_2", "room_3"]
        }},
        ...
    ],
    "suggestions": [
        "Consider connecting concept X with concept Y because...",
        ...
    ]
}}

Create a visually balanced layout that makes sense spatially - put related topics near each other."""

    def _parse_research_response(self, content: str, topic: str) -> ResearchResponse:
        """Parse Claude's research response."""
        try:
            # Try to extract JSON from the response
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                json_str = content[json_start:json_end]
                data = json.loads(json_str)
            else:
                # Fallback: parse as plain text
                data = self._parse_research_text(content)

            return ResearchResponse(
                topic=topic,
                overview=data.get("overview", ""),
                key_findings=data.get("key_findings", []),
                connections=data.get("connections"),
                further_reading=data.get("further_reading", [])
            )
        except Exception as e:
            # Fallback response if parsing fails
            return ResearchResponse(
                topic=topic,
                overview=content[:500],
                key_findings=["Response parsing failed. See overview for raw content."],
                connections=None,
                further_reading=[]
            )

    def _parse_explanation_response(
        self,
        content: str,
        topic: str
    ) -> ExplainTopicResponse:
        """Parse Claude's explanation response."""
        try:
            # Try to extract JSON from the response
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                json_str = content[json_start:json_end]
                data = json.loads(json_str)
            else:
                # Fallback: parse as plain text
                data = self._parse_explanation_text(content)

            return ExplainTopicResponse(
                topic=topic,
                introduction=data.get("introduction", ""),
                steps=data.get("steps", []),
                analogies=data.get("analogies", []),
                references=data.get("references", []),
                latex_equations=data.get("latex_equations", [])
            )
        except Exception as e:
            # Fallback response if parsing fails
            return ExplainTopicResponse(
                topic=topic,
                introduction=content[:500],
                steps=[{"title": "Raw Response", "content": content}],
                analogies=[],
                references=[]
            )

    def _parse_organization_response(
        self,
        content: str,
        notes: List[Note]
    ) -> MemoryPalaceStructure:
        """Parse Claude's organization response."""
        try:
            # Try to extract JSON from the response
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                json_str = content[json_start:json_end]
                data = json.loads(json_str)
            else:
                # Fallback: create simple structure
                return self._create_default_structure(notes)

            # Convert to MemoryPalaceRoom objects
            rooms = [
                MemoryPalaceRoom(**room_data)
                for room_data in data.get("rooms", [])
            ]

            # Create notes index
            notes_index = {note.id: note for note in notes}

            return MemoryPalaceStructure(
                rooms=rooms,
                notes_index=notes_index,
                metadata={"suggestions": data.get("suggestions", [])}
            )
        except Exception as e:
            # Fallback: create simple structure
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


# Global service instance
claude_service = ClaudeService()
