"""
Research assistant API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict

from app.models.schemas import (
    ResearchRequest,
    ResearchResponse,
    ExplainTopicRequest,
    ExplainTopicResponse,
    OrganizeNotesRequest,
    OrganizeNotesResponse,
)
from app.services import claude_service, arxiv_service
from app.core.security import get_current_user

router = APIRouter(prefix="/research", tags=["research"])


@router.post("/fetch-research", response_model=ResearchResponse)
async def fetch_research(
    request: ResearchRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Fetch and synthesize research on a given topic.

    Uses Claude AI to analyze and synthesize research, optionally including
    papers from arXiv for academic topics.
    """
    try:
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

        # Synthesize research using Claude
        response = await claude_service.synthesize_research(request)

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
    current_user: Dict = Depends(get_current_user)
):
    """
    Get a detailed, step-by-step explanation of an advanced topic.

    Includes LaTeX equations, analogies, and references suitable for
    the specified complexity level.
    """
    try:
        response = await claude_service.explain_topic(request)
        return response

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to explain topic: {str(e)}"
        )


@router.post("/organize-notes", response_model=OrganizeNotesResponse)
async def organize_notes(
    request: OrganizeNotesRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Organize notes into a Memory Palace structure.

    Uses Claude AI to intelligently categorize and structure notes
    into themed rooms with spatial layout and connections.
    """
    try:
        # Organize notes using Claude
        structure = await claude_service.organize_notes(
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
