"""Shared request dependencies.

Authentication is intentionally a placeholder: every request runs as the seeded
demo user. To add real auth, replace `current_user_id` with a dependency that
resolves the authenticated user - the routers only need the resolved user id.
"""
from __future__ import annotations

DEMO_USER_ID = 1


def current_user_id() -> int:
    return DEMO_USER_ID
