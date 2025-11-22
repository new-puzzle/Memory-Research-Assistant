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

        return f"""You are an expert educator creating an interactive, in-depth learning experience.

Topic: {request.topic}{prereq_part}{field_part}

Complexity Level: {request.complexity_level}
{complexity_guidance.get(request.complexity_level, complexity_guidance["intermediate"])}

Create a comprehensive, structured explanation with these sections:

1. **Introduction**: Brief, engaging overview (2-3 sentences)

2. **Steps**: 4-6 logical steps, each with:
   - Clear, descriptive title
   - Detailed explanation with examples
{latex_instruction}
   - 2-3 follow-up prompts that a learner might ask about THIS specific step

3. **Key Takeaways**: 3-5 bullet points of the most crucial concepts to remember

4. **Common Misconceptions**: 2-3 points that proactively clarify potential confusion

5. **Analogies**: 2-3 intuitive comparisons to make complex ideas easier to grasp

6. **References**: 2-3 resources for deeper study

Format your response as JSON:
{{
    "introduction": "...",
    "steps": [
        {{
            "title": "Step 1 Title",
            "content": "Detailed explanation with examples...",
            "follow_up_prompts": [
                {{"prompt_text": "Explain [specific concept] in more detail", "focus": "concept_name"}},
                {{"prompt_text": "Show a simplified example of this", "focus": "example"}},
                {{"prompt_text": "Why is this important?", "focus": "significance"}}
            ]
        }},
        ...
    ],
    "key_takeaways": ["Key point 1", "Key point 2", ...],
    "common_misconceptions": [
        {{"misconception": "Common wrong belief", "clarification": "The correct understanding..."}},
        ...
    ],
    "analogies": ["analogy 1", "analogy 2", ...],
    "references": [
        {{"title": "...", "url": "..."}},
        ...
    ]{', ' + latex_field if latex_field else ''}
}}

Guidelines:
- Make follow_up_prompts natural and specific to each step's content
- Key takeaways should be memorable and actionable
- Misconceptions should address real points of confusion learners face
- Build concepts progressively from simple to complex"""

    def _build_subtopic_prompt(
        self,
        parent_topic: str,
        subtopic_focus: str,
        context_from_parent: str,
        complexity_level: str
    ) -> str:
        """Build prompt for drilling down into a subtopic."""

        complexity_guidance = {
            "beginner": "Explain in the simplest possible terms with concrete, everyday examples. Avoid jargon.",
            "intermediate": "Provide clear explanation with some technical detail. Define terms as needed.",
            "advanced": "Give comprehensive technical explanation with full rigor and precision."
        }

        return f"""You are providing a focused, detailed explanation of a specific concept within a larger topic.

Parent Topic: {parent_topic}
Specific Focus: {subtopic_focus}
Complexity Level: {complexity_level}

Context from parent explanation:
{context_from_parent}

Provide a focused drill-down explanation with:
1. A clear, direct explanation of this specific concept (2-3 paragraphs)
2. 1-2 concrete examples that illustrate the concept
3. A simple analogy if it helps understanding
4. How it connects back to the main topic

Keep it concise but thorough. This should feel like a helpful elaboration, not a full new lesson.

Format as JSON:
{{
    "explanation": "Direct, clear explanation of the concept...",
    "examples": ["Concrete example 1", "Concrete example 2"],
    "analogy": "Simple analogy if helpful (or null if not needed)",
    "connection_to_main": "How this relates back to {parent_topic}..."
}}

{complexity_guidance.get(complexity_level, complexity_guidance["intermediate"])}"""

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
