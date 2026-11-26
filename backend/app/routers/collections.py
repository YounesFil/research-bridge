"""Collections CRUD and collection membership."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.deps import current_user_id
from app.models import (
    CollectionCreate,
    CollectionDetail,
    CollectionOut,
    CollectionUpdate,
)
from app.repositories import collections as repo
from app.repositories.papers import paper_exists

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("", response_model=list[CollectionOut])
def list_collections(user_id: int = Depends(current_user_id)):
    return repo.list_collections(user_id)


@router.post("", response_model=CollectionDetail, status_code=201)
def create_collection(body: CollectionCreate, user_id: int = Depends(current_user_id)):
    collection_id = repo.create_collection(user_id, body.name, body.description)
    return repo.get_collection(collection_id, user_id)


@router.get("/{collection_id}", response_model=CollectionDetail)
def get_collection(collection_id: int, user_id: int = Depends(current_user_id)):
    collection = repo.get_collection(collection_id, user_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    return collection


@router.put("/{collection_id}", response_model=CollectionDetail)
def update_collection(
    collection_id: int,
    body: CollectionUpdate,
    user_id: int = Depends(current_user_id),
):
    if not repo.collection_exists(collection_id, user_id):
        raise HTTPException(status_code=404, detail="Collection not found")
    repo.update_collection(collection_id, user_id, body.name, body.description)
    return repo.get_collection(collection_id, user_id)


@router.delete("/{collection_id}", status_code=204)
def delete_collection(collection_id: int, user_id: int = Depends(current_user_id)):
    if not repo.collection_exists(collection_id, user_id):
        raise HTTPException(status_code=404, detail="Collection not found")
    repo.delete_collection(collection_id, user_id)


@router.post("/{collection_id}/papers/{paper_id}", response_model=CollectionDetail)
def add_paper(
    collection_id: int, paper_id: str, user_id: int = Depends(current_user_id)
):
    if not repo.collection_exists(collection_id, user_id):
        raise HTTPException(status_code=404, detail="Collection not found")
    if not paper_exists(paper_id):
        raise HTTPException(status_code=404, detail="Paper not found")
    repo.add_paper(collection_id, paper_id)
    return repo.get_collection(collection_id, user_id)


@router.delete("/{collection_id}/papers/{paper_id}", response_model=CollectionDetail)
def remove_paper(
    collection_id: int, paper_id: str, user_id: int = Depends(current_user_id)
):
    if not repo.collection_exists(collection_id, user_id):
        raise HTTPException(status_code=404, detail="Collection not found")
    repo.remove_paper(collection_id, paper_id)
    return repo.get_collection(collection_id, user_id)
