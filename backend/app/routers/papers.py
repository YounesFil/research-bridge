"""Paper search, detail, references, citing papers, and ego-graph."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.models import GraphOut, PaperDetail, PaperSummary, SearchResult
from app.repositories import papers as repo

router = APIRouter(prefix="/papers", tags=["papers"])


@router.get("", response_model=SearchResult)
def search(
    q: str | None = Query(None, description="free-text query over title and abstract"),
    year_from: int | None = None,
    year_to: int | None = None,
    field: str | None = Query(None, description="restrict to a research field"),
    min_citations: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    total, items = repo.search_papers(
        q=q,
        year_from=year_from,
        year_to=year_to,
        field=field,
        min_citations=min_citations,
        limit=limit,
        offset=offset,
    )
    return SearchResult(total=total, limit=limit, offset=offset, items=items)


@router.get("/{paper_id}", response_model=PaperDetail)
def detail(paper_id: str):
    paper = repo.get_paper(paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper


@router.get("/{paper_id}/references", response_model=list[PaperSummary])
def references(paper_id: str, limit: int = Query(100, ge=1, le=500)):
    if not repo.paper_exists(paper_id):
        raise HTTPException(status_code=404, detail="Paper not found")
    return repo.get_references(paper_id, limit)


@router.get("/{paper_id}/citations", response_model=list[PaperSummary])
def citations(paper_id: str, limit: int = Query(100, ge=1, le=500)):
    if not repo.paper_exists(paper_id):
        raise HTTPException(status_code=404, detail="Paper not found")
    return repo.get_citing(paper_id, limit)


@router.get("/{paper_id}/graph", response_model=GraphOut)
def graph(paper_id: str, limit_each: int = Query(25, ge=1, le=100)):
    result = repo.neighbors_graph(paper_id, limit_each)
    if result is None:
        raise HTTPException(status_code=404, detail="Paper not found")
    return result
