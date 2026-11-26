"""Aggregate analytics queries used by the insights dashboard."""
from __future__ import annotations

from app.db import fetch_all, fetch_one
from app.models import (
    CrossFieldBridge,
    DatasetStats,
    FieldCount,
    InfluentialPaper,
    YearCount,
)


def dataset_stats() -> DatasetStats:
    def count(sql: str) -> int:
        return fetch_one(sql)["n"]

    return DatasetStats(
        papers=count("SELECT COUNT(*) AS n FROM papers"),
        papers_full=count("SELECT COUNT(*) AS n FROM papers WHERE is_stub = 0"),
        citations=count("SELECT COUNT(*) AS n FROM citations"),
        authors=count("SELECT COUNT(*) AS n FROM authors"),
        topics=count("SELECT COUNT(*) AS n FROM topics"),
        collections=count("SELECT COUNT(*) AS n FROM collections"),
        notes=count("SELECT COUNT(*) AS n FROM notes"),
    )


def field_distribution(limit: int = 12) -> list[FieldCount]:
    rows = fetch_all(
        """SELECT t.field_name, COUNT(DISTINCT pt.paper_id) AS paper_count
           FROM paper_topics pt
           JOIN topics t ON t.topic_id = pt.topic_id
           JOIN papers p ON p.paper_id = pt.paper_id
           WHERE p.is_stub = 0 AND t.field_name IS NOT NULL
           GROUP BY t.field_name ORDER BY paper_count DESC LIMIT %s""",
        (limit,),
    )
    return [FieldCount(**r) for r in rows]


def year_trends() -> list[YearCount]:
    rows = fetch_all(
        """SELECT publication_year AS year, COUNT(*) AS paper_count
           FROM papers
           WHERE is_stub = 0 AND publication_year IS NOT NULL
           GROUP BY publication_year ORDER BY publication_year"""
    )
    return [YearCount(**r) for r in rows]


def influential(limit: int = 15) -> list[InfluentialPaper]:
    rows = fetch_all(
        """SELECT p.paper_id, p.title, p.publication_year, p.cited_by_count,
                  COUNT(c.citing_paper_id) AS local_citation_count
           FROM papers p JOIN citations c ON c.cited_paper_id = p.paper_id
           WHERE p.is_stub = 0
           GROUP BY p.paper_id, p.title, p.publication_year, p.cited_by_count
           ORDER BY local_citation_count DESC LIMIT %s""",
        (limit,),
    )
    return [InfluentialPaper(**r) for r in rows]


def cross_field_bridges(limit: int = 15) -> list[CrossFieldBridge]:
    rows = fetch_all(
        """SELECT p.paper_id, p.title,
                  COUNT(DISTINCT t.field_name) AS field_count,
                  GROUP_CONCAT(DISTINCT t.field_name ORDER BY t.field_name SEPARATOR '|') AS fields,
                  (SELECT COUNT(*) FROM citations c WHERE c.cited_paper_id = p.paper_id)
                      AS local_citation_count
           FROM papers p
           JOIN paper_topics pt ON pt.paper_id = p.paper_id
           JOIN topics t ON t.topic_id = pt.topic_id
           WHERE p.is_stub = 0 AND t.field_name IS NOT NULL
           GROUP BY p.paper_id, p.title
           HAVING field_count >= 2
           ORDER BY field_count DESC, local_citation_count DESC LIMIT %s""",
        (limit,),
    )
    return [
        CrossFieldBridge(
            paper_id=r["paper_id"],
            title=r["title"],
            fields=r["fields"].split("|") if r["fields"] else [],
            field_count=r["field_count"],
            local_citation_count=r["local_citation_count"],
        )
        for r in rows
    ]
