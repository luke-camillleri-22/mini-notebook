from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from typing import Dict, Any
import io
import ast
import contextlib


app = FastAPI()

# session_id -> namespace (shared global/local dict for that tab)
_sessions: Dict[str, Dict[str, Any]] = {}

# session_id -> execution count
_exec_counts: Dict[str, int] = {}

class ExecRequest(BaseModel):
    """Execution requiest from frontend - one tab or window per session_id"""

    session_id: str
    code: str

class ExecResponsse(BaseModel):
    """Execition response to frontend - including captured stdout, final line ouptuts and errors (if present)"""

    stdout: str
    result: str | None
    error: str | None
    exec_count: int


def _get_namespace(session_id: str) -> Dict[str, Any]:
    """Return the namespace for a given session_id (global/local)"""
    ns = _sessions.get(session_id)
    if ns is None:
        # create new namespace for tab/window
        ns = {"__name__": f"session_{session_id}", "__package__": None}
        _sessions[session_id] = ns
        _exec_counts[session_id] = 0
    return ns

def _bump_count(session_id: str) -> int:
    """Increment and return the execution count for a given session_id"""
    _exec_counts[session_id] = _exec_counts.get(session_id, 0) + 1
    return _exec_counts[session_id]

@app.get("/api/ping")
def ping():
    return {"status": "ok"}
