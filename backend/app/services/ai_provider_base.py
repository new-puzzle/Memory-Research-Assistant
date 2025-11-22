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

    async def explain_subtopic(
        self,
        parent_topic: str,
        subtopic_focus: str,
        context_from_parent: str,
        complexity_level: str = "intermediate"
    ) -> Dict[str, Any]:
        """
        Generate a focused explanation for a subtopic/drill-down.

        Args:
            parent_topic: The original main topic being explained
            subtopic_focus: The specific concept to drill into
            context_from_parent: The text/context from the parent explanation
            complexity_level: beginner/intermediate/advanced

        Returns:
            Dict with explanation, examples, and optional analogies
        """
        prompt = self._build_subtopic_prompt(parent_topic, subtopic_focus, context_from_parent, complexity_level)
        content = await self.generate_completion(prompt)
        return self._parse_subtopic_response(content)

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
        """Build prompt for topic explanation with enhanced interactive features."""
        prereq_part = f"\n\nAssumed prerequisite knowledge: {request.prerequisite}" if request.prerequisite else ""
        field_part = f"\n\nProvide analogies from: {request.related_field}" if request.related_field else ""

        complexity_guidance = {
            "beginner": """Use very simple language and avoid technical jargon entirely.
Rely heavily on analogies and everyday examples. Explain as if to a motivated high school student.
Focus on intuition over precision. Use short sentences and simple vocabulary.""",
            "intermediate": """Assume foundational knowledge (basic calculus, linear algebra concepts).
Use technical terms but define them clearly when first introduced.
Balance intuition with technical precision. Suitable for undergraduates.""",
            "advanced": """Use full mathematical rigor and technical density.
Assume graduate-level knowledge. Include proofs, derivations, and edge cases.
Focus on precision and completeness over accessibility."""
        }

        # Detect if topic is likely non-technical (no math needed)
        non_technical_keywords = ['history', 'literature', 'philosophy', 'art', 'music', 'politics',
                                   'psychology', 'sociology', 'economics', 'law', 'ethics', 'culture']
        is_technical = not any(keyword in request.topic.lower() for keyword in non_technical_keywords)

        latex_instruction = """   - LaTeX equations where appropriate (wrapped in $...$ for inline, $$...$$ for display)""" if is_technical else ""
        latex_field = '"latex_equations": ["equation1", "equation2", ...]' if is_technical else ''

        return f"""You are an expert educator. Create a structured, interactive explanation.

Topic: {request.topic}{prereq_part}{field_part}

Complexity Level: {request.complexity_level}
{complexity_guidance.get(request.complexity_level, complexity_guidance["intermediate"])}

Provide:
1. Introduction: 2-3 sentences
2. Steps: 3-4 steps, each with title, explanation (80 words max){latex_instruction}, and 2 follow_up_prompts
3. Key Takeaways: 3 points
4. Common Misconceptions: 2 items
5. Analogies: 2 comparisons
6. References: 2 resources

CRITICAL: Return ONLY raw JSON. No markdown. Keep each step under 80 words.

{{
    "introduction": "...",
    "steps": [
        {{
            "title": "Step Title",
            "content": "Concise explanation (80 words max)...",
            "follow_up_prompts": [
                {{"prompt_text": "Question", "focus": "concept"}},
                {{"prompt_text": "Question", "focus": "concept"}}
            ]
        }}
    ],
    "key_takeaways": ["Point 1", "Point 2", "Point 3"],
    "common_misconceptions": [
        {{"misconception": "Wrong belief", "clarification": "Correct understanding"}}
    ],
    "analogies": ["analogy 1", "analogy 2"],
    "references": [{{"title": "...", "url": "..."}}]{', ' + latex_field if latex_field else ''}
}}"""

    def _build_subtopic_prompt(
        self,
        parent_topic: str,
        subtopic_focus: str,
        context_from_parent: str,
        complexity_level: str
    ) -> str:
        """Build prompt for drilling down into a subtopic with different exploration types."""

        # Define exploration type prompts
        exploration_prompts = {
            "simpler": f"""Explain this concept in the SIMPLEST possible terms, like explaining to a curious 10-year-old.

Context: {context_from_parent}

- Use everyday language, no jargon
- Use familiar objects and situations
- Short sentences
- Make it feel obvious and intuitive

Format as JSON:
{{
    "explanation": "Super simple explanation...",
    "examples": ["Simple real-world example"],
    "analogy": "Everyday analogy that makes it click",
    "connection_to_main": "How this fits into {parent_topic}..."
}}""",

            "analogy": f"""Create 2-3 vivid, memorable analogies for this concept.

Context: {context_from_parent}

Each analogy should:
- Use familiar, concrete situations
- Capture the key mechanism or relationship
- Be memorable and intuitive

Format as JSON:
{{
    "explanation": "Brief intro to the analogies...",
    "examples": ["Analogy 1: Like...", "Analogy 2: Similar to...", "Analogy 3: Think of it as..."],
    "analogy": "The single best analogy that captures the essence",
    "connection_to_main": "How these analogies illuminate {parent_topic}..."
}}""",

            "example": f"""Provide 3 concrete, detailed examples that demonstrate this concept in action.

Context: {context_from_parent}

Each example should:
- Be specific and realistic
- Show the concept applied step-by-step
- Vary in context (different domains or scales)

Format as JSON:
{{
    "explanation": "These examples show the concept in practice...",
    "examples": ["Detailed example 1 with steps...", "Detailed example 2...", "Detailed example 3..."],
    "analogy": null,
    "connection_to_main": "How these examples relate to {parent_topic}..."
}}""",

            "deeper": f"""Provide a more technical, rigorous explanation with mathematical formalism if applicable.

Context: {context_from_parent}

Include:
- Precise definitions and terminology
- Mathematical formulations (LaTeX: $...$ inline, $$...$$ display)
- Edge cases and limitations
- Connections to related advanced concepts

Format as JSON:
{{
    "explanation": "Technical deep-dive with formulas and precision...",
    "examples": ["Technical example with equations", "Edge case example"],
    "analogy": null,
    "connection_to_main": "Advanced connections to {parent_topic}..."
}}""",

            "significance": f"""Explain WHY this concept matters - its importance, applications, and real-world impact.

Context: {context_from_parent}

Cover:
- Why should someone care about this?
- Real-world applications and use cases
- Historical importance or breakthroughs
- What problems does it solve?

Format as JSON:
{{
    "explanation": "Why this matters and its impact...",
    "examples": ["Real application 1", "Important use case 2"],
    "analogy": null,
    "connection_to_main": "The significance within {parent_topic}..."
}}"""
        }

        # Default prompt for custom focus or concept-specific drill-down
        default_prompt = f"""Provide a focused explanation of: {subtopic_focus}

Context from parent explanation:
{context_from_parent}

Complexity Level: {complexity_level}

Provide:
1. Clear explanation (2-3 paragraphs)
2. 1-2 concrete examples
3. A simple analogy if helpful
4. Connection back to {parent_topic}

Format as JSON:
{{
    "explanation": "Direct explanation...",
    "examples": ["Example 1", "Example 2"],
    "analogy": "Analogy or null",
    "connection_to_main": "Connection to {parent_topic}..."
}}"""

        # Get the appropriate prompt
        prompt = exploration_prompts.get(subtopic_focus, default_prompt)

        return f"""You are providing a focused exploration of a concept.

Parent Topic: {parent_topic}

{prompt}

Return ONLY valid JSON, no markdown."""

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
