"""Read queries for papers: search, detail, references, citing, and ego-graphs."""
from __future__ import annotations

from app.db import fetch_all, fetch_one
from app.models import (
    AuthorOut,
    GraphEdge,
    GraphNode,
    GraphOut,
    PaperDetail,
    PaperSummary,
    TopicOut,
)

_SUMMARY_COLS = "p.paper_id, p.title, p.publication_year, p.cited_by_count, p.is_stub"


def _authors_for(paper_ids: list[str], limit_per: int = 6) -> dict[str, list[str]]:
    if not paper_ids:
        return {}
    placeholders = ",".join(["%s"] * len(paper_ids))
    rows = fetch_all(
        f"""SELECT pa.paper_id, a.name
            FROM paper_authors pa JOIN authors a ON a.author_id = pa.author_id
            WHERE pa.paper_id IN ({placeholders})
            ORDER BY pa.paper_id, pa.author_position""",
        tuple(paper_ids),
    )
    out: dict[str, list[str]] = {}
    for row in rows:
        names = out.setdefault(row["paper_id"], [])
        if len(names) < limit_per:
            names.append(row["name"])
    return out


def _fields_for(paper_ids: list[str]) -> dict[str, list[str]]:
    if not paper_ids:
        return {}
    placeholders = ",".join(["%s"] * len(paper_ids))
    rows = fetch_all(
        f"""SELECT DISTINCT pt.paper_id, t.field_name
            FROM paper_topics pt JOIN topics t ON t.topic_id = pt.topic_id
            WHERE pt.paper_id IN ({placeholders}) AND t.field_name IS NOT NULL""",
        tuple(paper_ids),
    )
    out: dict[str, list[str]] = {}
    for row in rows:
        fields = out.setdefault(row["paper_id"], [])
        if row["field_name"] not in fields:
            fields.append(row["field_name"])
    return out


def summaries_for_rows(rows: list[dict]) -> list[PaperSummary]:
    """Attach author names and fields to a list of paper rows."""
    ids = [r["paper_id"] for r in rows]
    authors = _authors_for(ids)
    fields = _fields_for(ids)
    return [
        PaperSummary(
            paper_id=r["paper_id"],
            title=r.get("title"),
            publication_year=r.get("publication_year"),
            cited_by_count=r.get("cited_by_count") or 0,
            is_stub=bool(r.get("is_stub")),
            authors=authors.get(r["paper_id"], []),
            fields=fields.get(r["paper_id"], []),
        )
        for r in rows
    ]


def search_papers(
    q: str | None = None,
    year_from: int | None = None,
    year_to: int | None = None,
    field: str | None = None,
    min_citations: int = 0,
    limit: int = 20,
    offset: int = 0,
) -> tuple[int, list[PaperSummary]]:
    where = ["p.is_stub = 0"]
    select_params: list = []
    where_params: list = []
    select_relevance = ""
    order = "p.cited_by_count DESC"

    if q:
        select_relevance = (
            ", MATCH(p.title, p.abstract) AGAINST (%s IN NATURAL LANGUAGE MODE) AS relevance"
        )
        select_params.append(q)
        where.append("MATCH(p.title, p.abstract) AGAINST (%s IN NATURAL LANGUAGE MODE)")
        where_params.append(q)
        order = "relevance DESC, p.cited_by_count DESC"
    if year_from is not None:
        where.append("p.publication_year >= %s")
        where_params.append(year_from)
    if year_to is not None:
        where.append("p.publication_year <= %s")
        where_params.append(year_to)
    if min_citations:
        where.append("p.cited_by_count >= %s")
        where_params.append(min_citations)
    if field:
        where.append(
            "EXISTS (SELECT 1 FROM paper_topics pt JOIN topics t ON t.topic_id = pt.topic_id "
            "WHERE pt.paper_id = p.paper_id AND t.field_name = %s)"
        )
        where_params.append(field)

    where_sql = " AND ".join(where)
    total = fetch_one(
        f"SELECT COUNT(*) AS n FROM papers p WHERE {where_sql}", tuple(where_params)
    )["n"]
    rows = fetch_all(
        f"SELECT {_SUMMARY_COLS}{select_relevance} FROM papers p "
        f"WHERE {where_sql} ORDER BY {order} LIMIT %s OFFSET %s",
        tuple(select_params + where_params + [limit, offset]),
    )
    return total, summaries_for_rows(rows)


def get_paper(paper_id: str) -> PaperDetail | None:
    row = fetch_one("SELECT * FROM papers WHERE paper_id = %s", (paper_id,))
    if not row:
        return None
    authors = fetch_all(
        """SELECT a.author_id, a.name, pa.author_position AS position
           FROM paper_authors pa JOIN authors a ON a.author_id = pa.author_id
           WHERE pa.paper_id = %s ORDER BY pa.author_position""",
        (paper_id,),
    )
    topics = fetch_all(
        """SELECT t.topic_id, t.name, t.field_name, t.subfield_name, pt.score
           FROM paper_topics pt JOIN topics t ON t.topic_id = pt.topic_id
           WHERE pt.paper_id = %s ORDER BY pt.score DESC""",
        (paper_id,),
    )
    ref_count = fetch_one(
        "SELECT COUNT(*) AS n FROM citations WHERE citing_paper_id = %s", (paper_id,)
    )["n"]
    cite_count = fetch_one(
        "SELECT COUNT(*) AS n FROM citations WHERE cited_paper_id = %s", (paper_id,)
    )["n"]

    fields: list[str] = []
    for t in topics:
        if t["field_name"] and t["field_name"] not in fields:
            fields.append(t["field_name"])

    return PaperDetail(
        paper_id=row["paper_id"],
        title=row["title"],
        publication_year=row["publication_year"],
        cited_by_count=row["cited_by_count"] or 0,
        is_stub=bool(row["is_stub"]),
        doi=row["doi"],
        abstract=row["abstract"],
        authors=[a["name"] for a in authors][:8],
        fields=fields,
        authors_detail=[AuthorOut(**a) for a in authors],
        topics=[TopicOut(**t) for t in topics],
        reference_count=ref_count,
        local_citation_count=cite_count,
    )


def get_references(paper_id: str, limit: int = 100) -> list[PaperSummary]:
    rows = fetch_all(
        f"""SELECT {_SUMMARY_COLS}
            FROM citations c JOIN papers p ON p.paper_id = c.cited_paper_id
            WHERE c.citing_paper_id = %s
            ORDER BY p.cited_by_count DESC LIMIT %s""",
        (paper_id, limit),
    )
    return summaries_for_rows(rows)


def get_citing(paper_id: str, limit: int = 100) -> list[PaperSummary]:
    rows = fetch_all(
        f"""SELECT {_SUMMARY_COLS}
            FROM citations c JOIN papers p ON p.paper_id = c.citing_paper_id
            WHERE c.cited_paper_id = %s
            ORDER BY p.cited_by_count DESC LIMIT %s""",
        (paper_id, limit),
    )
    return summaries_for_rows(rows)


def paper_exists(paper_id: str) -> bool:
    return fetch_one("SELECT 1 AS x FROM papers WHERE paper_id = %s", (paper_id,)) is not None


def neighbors_graph(paper_id: str, limit_each: int = 25) -> GraphOut | None:
    center = fetch_one(
        f"SELECT {_SUMMARY_COLS} FROM papers p WHERE p.paper_id = %s", (paper_id,)
    )
    if not center:
        return None
    refs = fetch_all(
        f"""SELECT {_SUMMARY_COLS}
            FROM citations c JOIN papers p ON p.paper_id = c.cited_paper_id
            WHERE c.citing_paper_id = %s
            ORDER BY p.cited_by_count DESC LIMIT %s""",
        (paper_id, limit_each),
    )
    citing = fetch_all(
        f"""SELECT {_SUMMARY_COLS}
            FROM citations c JOIN papers p ON p.paper_id = c.citing_paper_id
            WHERE c.cited_paper_id = %s
            ORDER BY p.cited_by_count DESC LIMIT %s""",
        (paper_id, limit_each),
    )

    nodes: dict[str, GraphNode] = {}

    def add(row: dict, role: str) -> None:
        if row["paper_id"] not in nodes:
            nodes[row["paper_id"]] = GraphNode(
                id=row["paper_id"],
                label=row.get("title"),
                year=row.get("publication_year"),
                cited_by_count=row.get("cited_by_count") or 0,
                is_stub=bool(row.get("is_stub")),
                role=role,
            )

    add(center, "center")
    for r in refs:
        add(r, "reference")
    for r in citing:
        add(r, "citing")

    edges = [GraphEdge(source=paper_id, target=r["paper_id"]) for r in refs]
    edges += [GraphEdge(source=r["paper_id"], target=paper_id) for r in citing]
    return GraphOut(nodes=list(nodes.values()), edges=edges)
