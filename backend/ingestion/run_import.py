"""Command-line entry point for importing OpenAlex data.

Run from the backend/ directory, for example:

    python -m ingestion.run_import --per-term 25
    python -m ingestion.run_import --terms "graph neural networks" "slam" --per-term 40
"""
from __future__ import annotations

import argparse

from ingestion.importer import run_seed_import

DEFAULT_TERMS = [
    "deep learning",
    "reinforcement learning",
    "large language models",
    "computational neuroscience",
    "robot navigation",
    "computer vision",
]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Import OpenAlex works into the ResearchBridge database.",
    )
    parser.add_argument(
        "--terms", nargs="*", default=DEFAULT_TERMS,
        help="search terms to seed the import from",
    )
    parser.add_argument(
        "--per-term", type=int, default=20,
        help="number of top-cited works to import per term",
    )
    parser.add_argument(
        "--no-resolve", action="store_true",
        help="do not fetch full metadata for referenced papers",
    )
    parser.add_argument(
        "--mailto", default=None,
        help="contact email for OpenAlex's faster polite pool",
    )
    args = parser.parse_args()

    stats = run_seed_import(
        args.terms,
        per_term=args.per_term,
        resolve_stubs=not args.no_resolve,
        mailto=args.mailto,
    )
    print("Import complete:", stats)


if __name__ == "__main__":
    main()
