"""The Bridge Finder endpoint."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.models import BridgeOut
from app.services.bridge import find_bridge

router = APIRouter(prefix="/bridge", tags=["bridge"])


@router.get("", response_model=BridgeOut)
def bridge(
    source: str = Query(..., description="OpenAlex id of the first paper"),
    target: str = Query(..., description="OpenAlex id of the second paper"),
    max_edges: int = Query(5, ge=1, le=7, description="maximum citation path length"),
):
    if source == target:
        raise HTTPException(status_code=400, detail="source and target must differ")
    result = find_bridge(source, target, max_edges=max_edges)
    if result is None:
        raise HTTPException(status_code=404, detail="One or both papers were not found")
    return result
