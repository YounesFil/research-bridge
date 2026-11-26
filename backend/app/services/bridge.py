"""The Bridge Finder.

Given two papers it looks for how they connect:
  * the shortest citation path between them (bidirectional breadth-first search
    over the citation graph, treated as undirected for discovery but drawn with
    its true direction), bounded by a maximum number of hops;
  * shared references (papers both of them cite - bibliographic coupling);
  * co-citations (papers that cite both of them).

Everything is returned as summaries plus a graph payload ready for the frontend.
"""
from __future__ import annotations

from app.db import fetch_all, fetch_one
from app.models import BridgeOut, GraphEdge, GraphNode, GraphOut, PaperSummary
from app.repositories.papers import summaries_for_rows

_SUMMARY_COLS = "p.paper_id, p.title, p.publication_year, p.cited_by_count, p.is_stub"


# --- graph traversal ------------------------------------------------------

def _undirected_neighbors(nodes: set[str]) -> dict[str, set[str]]:
    """Adjacency (ignoring direction) for every citation edge touching `nodes`."""
    if not nodes:
        return {}
    node_list = list(nodes)
    placeholders = ",".join(["%s"] * len(node_list))
    rows = fetch_all(
        f"""SELECT citing_paper_id AS a, cited_paper_id AS b FROM citations
            WHERE citing_paper_id IN ({placeholders})
               OR cited_paper_id IN ({placeholders})""",
        tuple(node_list + node_list),
    )
    adj: dict[str, set[str]] = {}
    for row in rows:
        adj.setdefault(row["a"], set()).add(row["b"])
        adj.setdefault(row["b"], set()).add(row["a"])
    return adj


def _expand(frontier: set[str], parent: dict, other_parent: dict):
    adj = _undirected_neighbors(frontier)
    nxt: set[str] = set()
    for node in frontier:
        for neighbor in adj.get(node, ()):
            if neighbor not in parent:
                parent[neighbor] = node
                if neighbor in other_parent:
                    return nxt, neighbor
                nxt.add(neighbor)
    return nxt, None


def _reconstruct(meet: str, parent_s: dict, parent_t: dict) -> list[str]:
    left: list[str] = []
    node = meet
    while node is not None:
        left.append(node)
        node = parent_s[node]
    left.reverse()
    right: list[str] = []
    node = parent_t[meet]
    while node is not None:
        right.append(node)
        node = parent_t[node]
    return left + right


def _shortest_path(source: str, target: str, max_edges: int) -> list[str] | None:
    if source == target:
        return [source]
    parent_s: dict = {source: None}
    parent_t: dict = {target: None}
    frontier_s: set[str] = {source}
    frontier_t: set[str] = {target}
    for _ in range(max_edges):
        if not frontier_s or not frontier_t:
            break
        if len(frontier_s) <= len(frontier_t):
            frontier_s, meet = _expand(frontier_s, parent_s, parent_t)
        else:
            frontier_t, meet = _expand(frontier_t, parent_t, parent_s)
        if meet:
            return _reconstruct(meet, parent_s, parent_t)
    return None


# --- coupling queries -----------------------------------------------------

def _shared_references(source: str, target: str, limit: int) -> list[PaperSummary]:
    rows = fetch_all(
        f"""SELECT {_SUMMARY_COLS}
            FROM citations a
            JOIN citations b ON a.cited_paper_id = b.cited_paper_id
            JOIN papers p ON p.paper_id = a.cited_paper_id
            WHERE a.citing_paper_id = %s AND b.citing_paper_id = %s
            ORDER BY p.cited_by_count DESC LIMIT %s""",
        (source, target, limit),
    )
    return summaries_for_rows(rows)


def _co_citations(source: str, target: str, limit: int) -> list[PaperSummary]:
    rows = fetch_all(
        f"""SELECT {_SUMMARY_COLS}
            FROM citations a
            JOIN citations b ON a.citing_paper_id = b.citing_paper_id
            JOIN papers p ON p.paper_id = a.citing_paper_id
            WHERE a.cited_paper_id = %s AND b.cited_paper_id = %s
            ORDER BY p.cited_by_count DESC LIMIT %s""",
        (source, target, limit),
    )
    return summaries_for_rows(rows)


# --- helpers --------------------------------------------------------------

def _rows_for_ids(ids: list[str]) -> dict[str, dict]:
    if not ids:
        return {}
    placeholders = ",".join(["%s"] * len(ids))
    rows = fetch_all(
        f"SELECT {_SUMMARY_COLS} FROM papers p WHERE p.paper_id IN ({placeholders})",
        tuple(ids),
    )
    return {r["paper_id"]: r for r in rows}


def _edge_direction(u: str, v: str) -> tuple[str, str]:
    """Return (citing, cited) for the real edge between u and v."""
    if fetch_one(
        "SELECT 1 AS x FROM citations WHERE citing_paper_id = %s AND cited_paper_id = %s",
        (u, v),
    ):
        return u, v
    return v, u


def _dedupe_edges(edges: list[GraphEdge]) -> list[GraphEdge]:
    seen: set[tuple[str, str]] = set()
    out: list[GraphEdge] = []
    for edge in edges:
        key = (edge.source, edge.target)
        if key not in seen:
            seen.add(key)
            out.append(edge)
    return out


def _node_from_row(row: dict, role: str) -> GraphNode:
    return GraphNode(
        id=row["paper_id"],
        label=row.get("title"),
        year=row.get("publication_year"),
        cited_by_count=row.get("cited_by_count") or 0,
        is_stub=bool(row.get("is_stub")),
        role=role,
    )


# --- public entry point ---------------------------------------------------

def find_bridge(
    source: str, target: str, max_edges: int = 5, shared_limit: int = 15
) -> BridgeOut | None:
    src = fetch_one(f"SELECT {_SUMMARY_COLS} FROM papers p WHERE p.paper_id = %s", (source,))
    tgt = fetch_one(f"SELECT {_SUMMARY_COLS} FROM papers p WHERE p.paper_id = %s", (target,))
    if not src or not tgt:
        return None

    path_ids = _shortest_path(source, target, max_edges)
    shared = _shared_references(source, target, shared_limit)
    co_cited = _co_citations(source, target, shared_limit)

    nodes: dict[str, GraphNode] = {}
    edges: list[GraphEdge] = []

    path_summaries: list[PaperSummary] = []
    if path_ids:
        row_map = _rows_for_ids(path_ids)
        for pid in path_ids:
            if pid not in row_map:
                continue
            role = "source" if pid == source else "target" if pid == target else "path"
            nodes[pid] = _node_from_row(row_map[pid], role)
        path_summaries = summaries_for_rows([row_map[p] for p in path_ids if p in row_map])
        for u, v in zip(path_ids, path_ids[1:]):
            citing, cited = _edge_direction(u, v)
            edges.append(GraphEdge(source=citing, target=cited))

    for ref in shared:
        if ref.paper_id not in nodes:
            nodes[ref.paper_id] = GraphNode(
                id=ref.paper_id,
                label=ref.title,
                year=ref.publication_year,
                cited_by_count=ref.cited_by_count,
                is_stub=ref.is_stub,
                role="bridge",
            )
        edges.append(GraphEdge(source=source, target=ref.paper_id))
        edges.append(GraphEdge(source=target, target=ref.paper_id))

    if source not in nodes:
        nodes[source] = _node_from_row(src, "source")
    if target not in nodes:
        nodes[target] = _node_from_row(tgt, "target")

    message = None
    if not path_ids and not shared and not co_cited:
        message = (
            "No citation path or shared references were found within the imported "
            "data and the current search depth."
        )

    return BridgeOut(
        source=source,
        target=target,
        found=bool(path_ids) or bool(shared) or bool(co_cited),
        path_length=(len(path_ids) - 1) if path_ids else None,
        path=path_summaries,
        shared_references=shared,
        co_citations=co_cited,
        graph=GraphOut(nodes=list(nodes.values()), edges=_dedupe_edges(edges)),
        message=message,
    )
