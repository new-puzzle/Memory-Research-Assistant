"""
Base AI Provider abstraction for multiple AI models.
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from app.models.schemas import (
    ResearchRequest,
    ResearchResponse,
    ExplainTopicRequest,
    ExplainTopicResponse,
    Note,
    MemoryPalaceStructure,
)


class BaseAIProvider(ABC):
    """Abstract base class for AI providers."""

    def __init__(self, api_key: str, model_name: str, max_tokens: int = 4096, temperature: float = 0.7):
        self.api_key = api_key
        self.model_name = model_name
        self.max_tokens = max_tokens
        self.temperature = temperature

    @abstractmethod
    async def synthesize_research(self, request: ResearchRequest) -> ResearchResponse:
        """Fetch and synthesize research on a topic."""
        pass

    @abstractmethod
    async def explain_topic(self, request: ExplainTopicRequest) -> ExplainTopicResponse:
        """Provide step-by-step explanation of an advanced topic."""
        pass

    @abstractmethod
    async def organize_notes(
        self,
        notes: List[Note],
        existing_structure: Optional[Dict[str, Any]] = None
    ) -> MemoryPalaceStructure:
        """Organize notes into a Memory Palace structure."""
        pass

    @abstractmethod
    async def generate_completion(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Generate a completion for a given prompt."""
        pass

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
        existing_structure: Optional[Dict[str, Any]]
    ) -> str:
        """Build prompt for note organization."""
        notes_summary = "\n".join([
            f"- [{note.id}] {note.title}: {note.content[:100]}... (tags: {', '.join(note.tags)})"
            for note in notes
        ])

        existing_part = ""
        if existing_structure:
            import json
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
