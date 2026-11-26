"""Idempotent import of OpenAlex works into the ResearchBridge database.

Strategy:
  1. Seed pass  - import the works matching each search term in full, and create
                  lightweight stub rows for every paper they reference so the
                  citation foreign keys stay valid.
  2. Resolve pass - fetch real metadata for those referenced stubs and upgrade
                  them to full papers, adding citation edges between papers that
                  are already in the database (without pulling in a new layer of
                  stubs). This densifies the graph without unbounded growth.

Every write is an upsert, so the importer can be re-run safely.
"""
from __future__ import annotations

from datetime import datetime

from app.db import get_connection

from .openalex_client import OpenAlexClient, normalize_work


class Importer:
    def __init__(self, conn) -> None:
        self.conn = conn
        self.stats = {
            "papers_full": 0,
            "papers_stub": 0,
            "citations": 0,
            "authors": 0,
            "topics": 0,
        }

    def load_known_ids(self) -> set[str]:
        cur = self.conn.cursor()
        cur.execute("SELECT paper_id FROM papers")
        ids = {row[0] for row in cur.fetchall()}
        cur.close()
        return ids

    def stub_ids(self) -> list[str]:
        cur = self.conn.cursor()
        cur.execute("SELECT paper_id FROM papers WHERE is_stub = 1")
        ids = [row[0] for row in cur.fetchall()]
        cur.close()
        return ids

    # --- single-row upserts -------------------------------------------------

    def _upsert_paper(self, cur, paper: dict, is_stub: bool) -> None:
        cur.execute(
            """
            INSERT INTO papers (paper_id, title, doi, publication_year, abstract,
                                cited_by_count, is_stub, ingested_at)
            VALUES (%(paper_id)s, %(title)s, %(doi)s, %(publication_year)s, %(abstract)s,
                    %(cited_by_count)s, %(is_stub)s, %(ingested_at)s)
            ON DUPLICATE KEY UPDATE
                title            = COALESCE(VALUES(title), title),
                doi              = COALESCE(VALUES(doi), doi),
                publication_year = COALESCE(VALUES(publication_year), publication_year),
                abstract         = COALESCE(VALUES(abstract), abstract),
                cited_by_count   = GREATEST(cited_by_count, VALUES(cited_by_count)),
                is_stub          = LEAST(is_stub, VALUES(is_stub)),
                ingested_at      = COALESCE(ingested_at, VALUES(ingested_at))
            """,
            {
                "paper_id": paper["paper_id"],
                "title": paper.get("title"),
                "doi": paper.get("doi"),
                "publication_year": paper.get("publication_year"),
                "abstract": paper.get("abstract"),
                "cited_by_count": paper.get("cited_by_count", 0),
                "is_stub": 1 if is_stub else 0,
                "ingested_at": None if is_stub else datetime.now(),
            },
        )

    def _upsert_author(self, cur, author: dict) -> None:
        cur.execute(
            """INSERT INTO authors (author_id, name, orcid)
               VALUES (%(author_id)s, %(name)s, %(orcid)s)
               ON DUPLICATE KEY UPDATE name = VALUES(name),
                                       orcid = COALESCE(VALUES(orcid), orcid)""",
            author,
        )

    def _link_author(self, cur, paper_id: str, author_id: str, position) -> None:
        cur.execute(
            """INSERT IGNORE INTO paper_authors (paper_id, author_id, author_position)
               VALUES (%s, %s, %s)""",
            (paper_id, author_id, position),
        )

    def _upsert_topic(self, cur, topic: dict) -> None:
        cur.execute(
            """INSERT INTO topics (topic_id, name, subfield_name, field_name, domain_name)
               VALUES (%(topic_id)s, %(name)s, %(subfield_name)s, %(field_name)s, %(domain_name)s)
               ON DUPLICATE KEY UPDATE name = VALUES(name),
                                       subfield_name = VALUES(subfield_name),
                                       field_name = VALUES(field_name),
                                       domain_name = VALUES(domain_name)""",
            topic,
        )

    def _link_topic(self, cur, paper_id: str, topic_id: str, score) -> None:
        cur.execute(
            """INSERT INTO paper_topics (paper_id, topic_id, score)
               VALUES (%s, %s, %s)
               ON DUPLICATE KEY UPDATE score = VALUES(score)""",
            (paper_id, topic_id, score),
        )

    def _insert_citation(self, cur, citing: str, cited: str) -> bool:
        if citing == cited:
            return False
        cur.execute(
            "INSERT IGNORE INTO citations (citing_paper_id, cited_paper_id) VALUES (%s, %s)",
            (citing, cited),
        )
        return cur.rowcount > 0

    # --- high-level import --------------------------------------------------

    def import_full(self, norm: dict, known: set[str], add_new_stubs: bool = True) -> None:
        """Import one work in full: paper, authors, topics, and citation edges.

        References to papers not already known become stub rows only when
        `add_new_stubs` is True; otherwise edges to unknown papers are skipped.
        """
        paper = norm["paper"]
        pid = paper["paper_id"]
        if not pid:
            return

        cur = self.conn.cursor()
        try:
            self._upsert_paper(cur, paper, is_stub=False)
            known.add(pid)
            self.stats["papers_full"] += 1

            for author in norm["authors"]:
                self._upsert_author(cur, author)
                self._link_author(cur, pid, author["author_id"], author["position"])
            self.stats["authors"] += len(norm["authors"])

            for topic in norm["topics"]:
                self._upsert_topic(cur, topic)
                self._link_topic(cur, pid, topic["topic_id"], topic.get("score"))
            self.stats["topics"] += len(norm["topics"])

            for ref in norm["references"]:
                if ref == pid:
                    continue
                if ref not in known:
                    if not add_new_stubs:
                        continue
                    self._upsert_paper(
                        cur,
                        {
                            "paper_id": ref,
                            "title": None,
                            "doi": None,
                            "publication_year": None,
                            "abstract": None,
                            "cited_by_count": 0,
                        },
                        is_stub=True,
                    )
                    known.add(ref)
                    self.stats["papers_stub"] += 1
                if self._insert_citation(cur, pid, ref):
                    self.stats["citations"] += 1

            self.conn.commit()
        except Exception:
            self.conn.rollback()
            raise
        finally:
            cur.close()


def run_seed_import(
    search_terms: list[str],
    per_term: int = 20,
    resolve_stubs: bool = True,
    mailto: str | None = None,
    verbose: bool = True,
) -> dict:
    """Run the full seed + resolve import and return process statistics."""
    client = OpenAlexClient(mailto=mailto)
    try:
        with get_connection() as conn:
            importer = Importer(conn)
            known = importer.load_known_ids()

            for term in search_terms:
                works = client.search_works(term, limit=per_term)
                if verbose:
                    print(f"[seed] {term!r}: {len(works)} works")
                for work in works:
                    importer.import_full(normalize_work(work), known, add_new_stubs=True)

            if resolve_stubs:
                pending = importer.stub_ids()
                if verbose:
                    print(f"[resolve] fetching metadata for {len(pending)} referenced papers")
                for work in client.fetch_works_by_ids(pending):
                    importer.import_full(normalize_work(work), known, add_new_stubs=False)

            return dict(importer.stats)
    finally:
        client.close()
