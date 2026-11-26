"""Pydantic models for API requests and responses."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


# --- papers ---------------------------------------------------------------

class AuthorOut(BaseModel):
    author_id: str
    name: str
    position: int | None = None


class TopicOut(BaseModel):
    topic_id: str
    name: str
    field_name: str | None = None
    subfield_name: str | None = None
    score: float | None = None


class PaperSummary(BaseModel):
    paper_id: str
    title: str | None = None
    publication_year: int | None = None
    cited_by_count: int = 0
    is_stub: bool = False
    authors: list[str] = []
    fields: list[str] = []


class PaperDetail(PaperSummary):
    doi: str | None = None
    abstract: str | None = None
    authors_detail: list[AuthorOut] = []
    topics: list[TopicOut] = []
    reference_count: int = 0
    local_citation_count: int = 0


class SearchResult(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[PaperSummary]


# --- graph ----------------------------------------------------------------

class GraphNode(BaseModel):
    id: str
    label: str | None = None
    year: int | None = None
    cited_by_count: int = 0
    is_stub: bool = False
    role: str | None = None  # center | reference | citing | source | target | path | bridge


class GraphEdge(BaseModel):
    source: str  # citing paper
    target: str  # cited paper
    relation: str = "cites"


class GraphOut(BaseModel):
    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []


# --- bridge finder --------------------------------------------------------

class BridgeOut(BaseModel):
    source: str
    target: str
    found: bool
    path_length: int | None = None
    path: list[PaperSummary] = []
    shared_references: list[PaperSummary] = []
    co_citations: list[PaperSummary] = []
    graph: GraphOut = GraphOut()
    message: str | None = None


# --- collections ----------------------------------------------------------

class CollectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None


class CollectionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None


class CollectionOut(BaseModel):
    collection_id: int
    name: str
    description: str | None = None
    paper_count: int = 0
    created_at: datetime | None = None


class CollectionDetail(CollectionOut):
    papers: list[PaperSummary] = []


# --- notes ----------------------------------------------------------------

class NoteCreate(BaseModel):
    paper_id: str
    content: str = Field(min_length=1)


class NoteUpdate(BaseModel):
    content: str = Field(min_length=1)


class NoteOut(BaseModel):
    note_id: int
    paper_id: str
    content: str
    paper_title: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


# --- insights -------------------------------------------------------------

class DatasetStats(BaseModel):
    papers: int
    papers_full: int
    citations: int
    authors: int
    topics: int
    collections: int
    notes: int


class FieldCount(BaseModel):
    field_name: str
    paper_count: int


class YearCount(BaseModel):
    year: int
    paper_count: int


class InfluentialPaper(BaseModel):
    paper_id: str
    title: str | None
    publication_year: int | None
    local_citation_count: int
    cited_by_count: int


class CrossFieldBridge(BaseModel):
    paper_id: str
    title: str | None
    fields: list[str]
    field_count: int
    local_citation_count: int
