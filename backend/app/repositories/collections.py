"""CRUD queries for collections and their papers."""
from __future__ import annotations

from app.db import execute, fetch_all, fetch_one
from app.models import CollectionDetail, CollectionOut
from app.repositories.papers import summaries_for_rows


def list_collections(user_id: int) -> list[CollectionOut]:
    rows = fetch_all(
        """SELECT c.collection_id, c.name, c.description, c.created_at,
                  COUNT(cp.paper_id) AS paper_count
           FROM collections c
           LEFT JOIN collection_papers cp ON cp.collection_id = c.collection_id
           WHERE c.user_id = %s
           GROUP BY c.collection_id, c.name, c.description, c.created_at
           ORDER BY c.created_at DESC""",
        (user_id,),
    )
    return [CollectionOut(**r) for r in rows]


def get_collection(collection_id: int, user_id: int) -> CollectionDetail | None:
    row = fetch_one(
        """SELECT collection_id, name, description, created_at
           FROM collections WHERE collection_id = %s AND user_id = %s""",
        (collection_id, user_id),
    )
    if not row:
        return None
    papers = fetch_all(
        """SELECT p.paper_id, p.title, p.publication_year, p.cited_by_count, p.is_stub
           FROM collection_papers cp JOIN papers p ON p.paper_id = cp.paper_id
           WHERE cp.collection_id = %s ORDER BY cp.added_at DESC""",
        (collection_id,),
    )
    summaries = summaries_for_rows(papers)
    return CollectionDetail(**row, paper_count=len(summaries), papers=summaries)


def collection_exists(collection_id: int, user_id: int) -> bool:
    return (
        fetch_one(
            "SELECT 1 AS x FROM collections WHERE collection_id = %s AND user_id = %s",
            (collection_id, user_id),
        )
        is not None
    )


def create_collection(user_id: int, name: str, description: str | None) -> int:
    return execute(
        "INSERT INTO collections (user_id, name, description) VALUES (%s, %s, %s)",
        (user_id, name, description),
    )


def update_collection(
    collection_id: int, user_id: int, name: str | None, description: str | None
) -> int:
    sets: list[str] = []
    params: list = []
    if name is not None:
        sets.append("name = %s")
        params.append(name)
    if description is not None:
        sets.append("description = %s")
        params.append(description)
    if not sets:
        return 0
    params += [collection_id, user_id]
    return execute(
        f"UPDATE collections SET {', '.join(sets)} WHERE collection_id = %s AND user_id = %s",
        tuple(params),
    )


def delete_collection(collection_id: int, user_id: int) -> int:
    return execute(
        "DELETE FROM collections WHERE collection_id = %s AND user_id = %s",
        (collection_id, user_id),
    )


def add_paper(collection_id: int, paper_id: str) -> int:
    return execute(
        "INSERT IGNORE INTO collection_papers (collection_id, paper_id) VALUES (%s, %s)",
        (collection_id, paper_id),
    )


def remove_paper(collection_id: int, paper_id: str) -> int:
    return execute(
        "DELETE FROM collection_papers WHERE collection_id = %s AND paper_id = %s",
        (collection_id, paper_id),
    )
