"""Notes CRUD."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.deps import current_user_id
from app.models import NoteCreate, NoteOut, NoteUpdate
from app.repositories import notes as repo
from app.repositories.papers import paper_exists

router = APIRouter(tags=["notes"])


@router.get("/notes", response_model=list[NoteOut])
def list_notes(user_id: int = Depends(current_user_id)):
    return repo.list_notes(user_id)


@router.post("/notes", response_model=NoteOut, status_code=201)
def create_note(body: NoteCreate, user_id: int = Depends(current_user_id)):
    if not paper_exists(body.paper_id):
        raise HTTPException(status_code=404, detail="Paper not found")
    note_id = repo.create_note(user_id, body.paper_id, body.content)
    return repo.get_note(note_id, user_id)


@router.put("/notes/{note_id}", response_model=NoteOut)
def update_note(note_id: int, body: NoteUpdate, user_id: int = Depends(current_user_id)):
    if not repo.get_note(note_id, user_id):
        raise HTTPException(status_code=404, detail="Note not found")
    repo.update_note(note_id, user_id, body.content)
    return repo.get_note(note_id, user_id)


@router.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: int, user_id: int = Depends(current_user_id)):
    if not repo.get_note(note_id, user_id):
        raise HTTPException(status_code=404, detail="Note not found")
    repo.delete_note(note_id, user_id)


@router.get("/papers/{paper_id}/notes", response_model=list[NoteOut])
def notes_for_paper(paper_id: str, user_id: int = Depends(current_user_id)):
    return repo.notes_for_paper(paper_id, user_id)
