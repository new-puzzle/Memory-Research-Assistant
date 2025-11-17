"""
Pydantic models for request/response validation.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime


# Authentication Models
class GoogleAuthRequest(BaseModel):
    """Google OAuth token request."""
    token: str = Field(..., description="Google OAuth token")


class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserInfo(BaseModel):
    """User information."""
    email: EmailStr
    name: Optional[str] = None
    picture: Optional[str] = None


# Research Assistant Models
class ResearchRequest(BaseModel):
    """Request for research synthesis."""
    topic: str = Field(..., min_length=3, max_length=500, description="Research topic")
    context: Optional[str] = Field(None, description="Additional context or related field")
    max_papers: int = Field(default=5, ge=1, le=10, description="Maximum number of papers to fetch")
    include_arxiv: bool = Field(default=True, description="Include arXiv papers")


class ResearchResponse(BaseModel):
    """Research synthesis response."""
    topic: str
    overview: str
    key_findings: List[str]
    connections: Optional[str] = None
    further_reading: List[Dict[str, str]]
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class ExplainTopicRequest(BaseModel):
    """Request for topic explanation."""
    topic: str = Field(..., min_length=3, max_length=500, description="Topic to explain")
    prerequisite: Optional[str] = Field(None, description="Assumed prerequisite knowledge")
    related_field: Optional[str] = Field(None, description="Related field for analogies")
    complexity_level: str = Field(
        default="intermediate",
        description="Complexity level: beginner, intermediate, advanced"
    )


class ExplainTopicResponse(BaseModel):
    """Topic explanation response."""
    topic: str
    introduction: str
    steps: List[Dict[str, str]]  # Each step has title and content
    analogies: List[str]
    references: List[Dict[str, str]]
    latex_equations: List[str] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# Memory Palace Models
class Note(BaseModel):
    """Individual note or piece of content."""
    id: str
    title: str
    content: str
    content_type: str = Field(default="text", description="Type: text, pdf, link, etc.")
    tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class OrganizeNotesRequest(BaseModel):
    """Request to organize notes into Memory Palace structure."""
    notes: List[Note] = Field(..., min_items=1, description="Notes to organize")
    existing_structure: Optional[Dict[str, Any]] = Field(
        None,
        description="Existing palace structure to add to"
    )


class MemoryPalaceRoom(BaseModel):
    """A room in the Memory Palace."""
    id: str
    name: str
    description: str
    notes: List[str] = Field(default_factory=list, description="Note IDs in this room")
    position: Dict[str, float] = Field(
        default_factory=lambda: {"x": 0, "y": 0, "z": 0},
        description="3D position"
    )
    color: str = Field(default="#3B82F6", description="Room color hex code")
    connections: List[str] = Field(
        default_factory=list,
        description="Connected room IDs"
    )


class MemoryPalaceStructure(BaseModel):
    """Complete Memory Palace 3D structure."""
    rooms: List[MemoryPalaceRoom]
    notes_index: Dict[str, Note] = Field(
        default_factory=dict,
        description="Map of note IDs to notes"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class OrganizeNotesResponse(BaseModel):
    """Response from note organization."""
    structure: MemoryPalaceStructure
    new_rooms_created: int
    notes_organized: int
    suggestions: List[str] = Field(
        default_factory=list,
        description="AI suggestions for connections"
    )


# File Storage Models
class SaveFileRequest(BaseModel):
    """Request to save file to cloud storage."""
    filename: str
    content: str
    content_type: str = Field(default="text/plain")
    folder_path: Optional[str] = Field(default="/Memory-Palace", description="Folder in Drive")


class SaveFileResponse(BaseModel):
    """Response from file save operation."""
    file_id: str
    filename: str
    web_view_link: Optional[str] = None
    success: bool = True


class LoadFileRequest(BaseModel):
    """Request to load file from cloud storage."""
    file_id: Optional[str] = None
    filename: Optional[str] = None
    folder_path: Optional[str] = Field(default="/Memory-Palace")


class LoadFileResponse(BaseModel):
    """Response from file load operation."""
    filename: str
    content: str
    content_type: str
    last_modified: datetime
    success: bool = True


# Health Check
class HealthCheck(BaseModel):
    """Health check response."""
    status: str = "healthy"
    version: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    services: Dict[str, bool] = Field(
        default_factory=dict,
        description="Status of external services"
    )


# Error Response
class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
