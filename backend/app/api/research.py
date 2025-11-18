"""
Research assistant API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, Optional

from app.models.schemas import (
    ResearchRequest,
    ResearchResponse,
    ExplainTopicRequest,
    ExplainTopicResponse,
    OrganizeNotesRequest,
    OrganizeNotesResponse,
)
from app.services import arxiv_service
from app.services.ai_service_factory import get_ai_provider, AIServiceFactory
from app.core.security import get_current_user

router = APIRouter(prefix="/research", tags=["research"])


@router.get("/available-models")
async def get_available_models(current_user: Dict = Depends(get_current_user)):
    """
    Get list of available AI models based on configured API keys.

    Returns list of models with availability status.
    """
    try:
        models = AIServiceFactory.get_available_models()
        return {"models": models}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get available models: {str(e)}"
        )


@router.post("/fetch-research", response_model=ResearchResponse)
async def fetch_research(
    request: ResearchRequest,
    model: Optional[str] = Query(None, description="AI model to use (claude, together, deepseek, mistral)"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Fetch and synthesize research on a given topic.

    Uses AI to analyze and synthesize research, optionally including
    papers from arXiv for academic topics.
    """
    try:
        # Get AI provider
        ai_provider = get_ai_provider(model)

        # Fetch research from arXiv if enabled
        arxiv_papers = []
        if request.include_arxiv:
            arxiv_papers = await arxiv_service.search_papers(
                query=request.topic,
                max_results=request.max_papers
            )

        # Add arXiv papers to context
        if arxiv_papers:
            arxiv_context = "\n\nRecent papers from arXiv:\n"
            for paper in arxiv_papers[:3]:  # Include top 3 in context
                arxiv_context += f"- {paper['title']} by {', '.join(paper['authors'][:2])}\n"
                arxiv_context += f"  Summary: {paper['summary'][:200]}...\n"

            if request.context:
                request.context += arxiv_context
            else:
                request.context = arxiv_context

        # Synthesize research using AI
        response = await ai_provider.synthesize_research(request)

        # Add arXiv papers to further reading
        for paper in arxiv_papers:
            response.further_reading.append({
                "title": paper['title'],
                "author": ', '.join(paper['authors'][:3]) + (' et al.' if len(paper['authors']) > 3 else ''),
                "url": paper['url']
            })

        return response

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to synthesize research: {str(e)}"
        )


@router.post("/explain-topic", response_model=ExplainTopicResponse)
async def explain_topic(
    request: ExplainTopicRequest,
    model: Optional[str] = Query(None, description="AI model to use (claude, together, deepseek, mistral)"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get a detailed, step-by-step explanation of an advanced topic.

    Includes LaTeX equations, analogies, and references suitable for
    the specified complexity level.
    """
    try:
        # Get AI provider
        ai_provider = get_ai_provider(model)
        response = await ai_provider.explain_topic(request)
        return response

    except Exception as e:
        import traceback
        error_detail = str(e)
        if settings.debug:
            error_detail += f"\n\nTraceback:\n{traceback.format_exc()}"
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to explain topic: {error_detail}"
        )


@router.post("/organize-notes", response_model=OrganizeNotesResponse)
async def organize_notes(
    request: OrganizeNotesRequest,
    model: Optional[str] = Query(None, description="AI model to use (claude, together, deepseek, mistral)"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Organize notes into a Memory Palace structure.

    Uses AI to intelligently categorize and structure notes
    into themed rooms with spatial layout and connections.
    """
    try:
        # Get AI provider
        ai_provider = get_ai_provider(model)

        # Organize notes using AI
        structure = await ai_provider.organize_notes(
            notes=request.notes,
            existing_structure=request.existing_structure
        )

        # Count new rooms and organized notes
        existing_room_ids = set()
        if request.existing_structure and 'rooms' in request.existing_structure:
            existing_room_ids = {
                room.get('id') for room in request.existing_structure['rooms']
            }

        new_rooms_created = sum(
            1 for room in structure.rooms
            if room.id not in existing_room_ids
        )

        notes_organized = len(request.notes)

        return OrganizeNotesResponse(
            structure=structure,
            new_rooms_created=new_rooms_created,
            notes_organized=notes_organized,
            suggestions=structure.metadata.get('suggestions', [])
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to organize notes: {str(e)}"
        )
