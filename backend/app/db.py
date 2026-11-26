"""MySQL connection pooling for ResearchBridge."""
from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from mysql.connector.pooling import MySQLConnectionPool, PooledMySQLConnection

from app.config import settings

_pool: MySQLConnectionPool | None = None


def _get_pool() -> MySQLConnectionPool:
    global _pool
    if _pool is None:
        _pool = MySQLConnectionPool(
            pool_name="research_bridge",
            pool_size=5,
            host=settings.db_host,
            port=settings.db_port,
            user=settings.db_user,
            password=settings.db_password,
            database=settings.db_name,
            charset="utf8mb4",
            use_pure=True,
            autocommit=False,
        )
    return _pool


@contextmanager
def get_connection() -> Iterator[PooledMySQLConnection]:
    """Yield a pooled connection and return it to the pool afterwards."""
    conn = _get_pool().get_connection()
    try:
        yield conn
    finally:
        conn.close()


def fetch_all(sql: str, params: tuple | dict | None = None) -> list[dict]:
    """Run a query and return all rows as dicts."""
    with get_connection() as conn:
        cur = conn.cursor(dictionary=True, buffered=True)
        try:
            cur.execute(sql, params or ())
            return cur.fetchall()
        finally:
            cur.close()


def fetch_one(sql: str, params: tuple | dict | None = None) -> dict | None:
    """Run a query and return the first row as a dict, or None."""
    with get_connection() as conn:
        cur = conn.cursor(dictionary=True, buffered=True)
        try:
            cur.execute(sql, params or ())
            return cur.fetchone()
        finally:
            cur.close()


def execute(sql: str, params: tuple | dict | None = None) -> int:
    """Run a write and commit. Returns lastrowid when present, else affected rows."""
    with get_connection() as conn:
        cur = conn.cursor()
        try:
            cur.execute(sql, params or ())
            conn.commit()
            return cur.lastrowid or cur.rowcount
        finally:
            cur.close()
