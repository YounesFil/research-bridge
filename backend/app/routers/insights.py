"""Dataset analytics for the insights dashboard."""
from __future__ import annotations

from fastapi import APIRouter, Query

from app.models import (
    CrossFieldBridge,
    DatasetStats,
    FieldCount,
    InfluentialPaper,
    YearCount,
)
from app.repositories import insights as repo

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("/stats", response_model=DatasetStats)
def stats():
    return repo.dataset_stats()


@router.get("/fields", response_model=list[FieldCount])
def fields(limit: int = Query(12, ge=1, le=50)):
    return repo.field_distribution(limit)


@router.get("/trends", response_model=list[YearCount])
def trends():
    return repo.year_trends()


@router.get("/influential", response_model=list[InfluentialPaper])
def influential(limit: int = Query(15, ge=1, le=50)):
    return repo.influential(limit)


@router.get("/cross-field", response_model=list[CrossFieldBridge])
def cross_field(limit: int = Query(15, ge=1, le=50)):
    return repo.cross_field_bridges(limit)
