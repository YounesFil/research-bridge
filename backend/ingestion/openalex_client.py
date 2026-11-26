"""Client for the OpenAlex works API and normalization into our schema shape."""
from __future__ import annotations

import time
from typing import Iterator

import httpx

from app.config import settings

# Fields requested from OpenAlex; keeping this tight makes responses much smaller.
WORK_FIELDS = (
    "id,title,doi,publication_year,cited_by_count,"
    "authorships,topics,referenced_works,abstract_inverted_index"
)


def short_id(url: str | None) -> str | None:
    """Reduce an OpenAlex (or ORCID) URL to its trailing identifier."""
    if not url:
        return None
    return url.rsplit("/", 1)[-1]


def reconstruct_abstract(inverted_index: dict | None) -> str | None:
    """Rebuild abstract text from OpenAlex's position-keyed inverted index."""
    if not inverted_index:
        return None
    positions: list[tuple[int, str]] = []
    for word, idxs in inverted_index.items():
        for i in idxs:
            positions.append((i, word))
    if not positions:
        return None
    positions.sort(key=lambda pair: pair[0])
    return " ".join(word for _, word in positions)[:60000]


class OpenAlexClient:
    """Minimal synchronous OpenAlex client with retry on rate limiting."""

    def __init__(
        self,
        base_url: str | None = None,
        mailto: str | None = None,
        timeout: float = 30.0,
    ) -> None:
        self.base_url = (base_url or settings.openalex_base_url).rstrip("/")
        self.mailto = mailto if mailto is not None else settings.openalex_mailto
        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers={"User-Agent": "ResearchBridge/0.1 (+research project)"},
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "OpenAlexClient":
        return self

    def __exit__(self, *_exc) -> None:
        self.close()

    def _params(self, extra: dict) -> dict:
        params = dict(extra)
        if self.mailto:
            params["mailto"] = self.mailto
        return params

    def _get(self, path: str, params: dict) -> dict:
        last_error: httpx.HTTPStatusError | None = None
        for attempt in range(4):
            resp = self._client.get(path, params=self._params(params))
            if resp.status_code == 429:
                time.sleep(2.0 * (attempt + 1))
                continue
            try:
                resp.raise_for_status()
            except httpx.HTTPStatusError as err:
                last_error = err
                break
            return resp.json()
        if last_error is not None:
            raise last_error
        raise RuntimeError("OpenAlex request failed after repeated rate limiting")

    def search_works(
        self, query: str, limit: int = 25, sort: str = "cited_by_count:desc"
    ) -> list[dict]:
        """Return up to `limit` works matching a full-text search query."""
        per_page = min(max(limit, 1), 200)
        data = self._get(
            "/works",
            {"search": query, "per_page": per_page, "sort": sort, "select": WORK_FIELDS},
        )
        return data.get("results", [])[:limit]

    def fetch_works_by_ids(self, ids: list[str], batch_size: int = 50) -> Iterator[dict]:
        """Yield full work records for the given OpenAlex ids, batched."""
        clean = [i for i in dict.fromkeys(ids) if i]  # de-duplicate, preserve order
        for start in range(0, len(clean), batch_size):
            batch = clean[start : start + batch_size]
            data = self._get(
                "/works",
                {
                    "filter": "openalex_id:" + "|".join(batch),
                    "per_page": len(batch),
                    "select": WORK_FIELDS,
                },
            )
            yield from data.get("results", [])
            time.sleep(0.1)


def normalize_work(work: dict) -> dict:
    """Flatten an OpenAlex work into {paper, authors, topics, references}."""
    pid = short_id(work.get("id"))

    doi = work.get("doi")
    if doi:
        doi = doi.replace("https://doi.org/", "") or None

    paper = {
        "paper_id": pid,
        "title": work.get("title"),
        "doi": doi,
        "publication_year": work.get("publication_year"),
        "abstract": reconstruct_abstract(work.get("abstract_inverted_index")),
        "cited_by_count": work.get("cited_by_count") or 0,
    }

    authors = []
    for position, authorship in enumerate(work.get("authorships", []), start=1):
        author = authorship.get("author") or {}
        author_id = short_id(author.get("id"))
        if not author_id:
            continue
        authors.append(
            {
                "author_id": author_id,
                "name": author.get("display_name") or "Unknown",
                "orcid": short_id(author.get("orcid")),
                "position": position,
            }
        )

    topics = []
    for topic in work.get("topics", []):
        topic_id = short_id(topic.get("id"))
        if not topic_id:
            continue
        topics.append(
            {
                "topic_id": topic_id,
                "name": topic.get("display_name") or "Unknown",
                "subfield_name": (topic.get("subfield") or {}).get("display_name"),
                "field_name": (topic.get("field") or {}).get("display_name"),
                "domain_name": (topic.get("domain") or {}).get("display_name"),
                "score": topic.get("score"),
            }
        )

    references = [short_id(ref) for ref in work.get("referenced_works", []) if ref]

    return {"paper": paper, "authors": authors, "topics": topics, "references": references}
