"""CRUD queries for notes attached to papers."""
from __future__ import annotations

from app.db import execute, fetch_all, fetch_one
from app.models import NoteOut

_NOTE_COLS = (
    "n.note_id, n.paper_id, n.content, n.created_at, n.updated_at, p.title AS paper_title"
)


def list_notes(user_id: int) -> list[NoteOut]:
    rows = fetch_all(
        f"""SELECT {_NOTE_COLS}
            FROM notes n LEFT JOIN papers p ON p.paper_id = n.paper_id
            WHERE n.user_id = %s ORDER BY n.updated_at DESC""",
        (user_id,),
    )
    return [NoteOut(**r) for r in rows]


def notes_for_paper(paper_id: str, user_id: int) -> list[NoteOut]:
    rows = fetch_all(
        f"""SELECT {_NOTE_COLS}
            FROM notes n LEFT JOIN papers p ON p.paper_id = n.paper_id
            WHERE n.user_id = %s AND n.paper_id = %s ORDER BY n.updated_at DESC""",
        (user_id, paper_id),
    )
    return [NoteOut(**r) for r in rows]


def get_note(note_id: int, user_id: int) -> NoteOut | None:
    row = fetch_one(
        f"""SELECT {_NOTE_COLS}
            FROM notes n LEFT JOIN papers p ON p.paper_id = n.paper_id
            WHERE n.note_id = %s AND n.user_id = %s""",
        (note_id, user_id),
    )
    return NoteOut(**row) if row else None


def create_note(user_id: int, paper_id: str, content: str) -> int:
    return execute(
        "INSERT INTO notes (user_id, paper_id, content) VALUES (%s, %s, %s)",
        (user_id, paper_id, content),
    )


def update_note(note_id: int, user_id: int, content: str) -> int:
    return execute(
        "UPDATE notes SET content = %s WHERE note_id = %s AND user_id = %s",
        (content, note_id, user_id),
    )


def delete_note(note_id: int, user_id: int) -> int:
    return execute(
        "DELETE FROM notes WHERE note_id = %s AND user_id = %s", (note_id, user_id)
    )
