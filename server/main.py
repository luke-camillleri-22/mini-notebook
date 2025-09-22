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

class ExecResponse(BaseModel):
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


def execute_code(session_id: str, code: str) -> ExecResponse:

    """
    Run Python code in the given session

    - Captures stdout (print output)
    - Executes statements in order
    - If the last node is an expression, return its repr as `result`
    - Otherwise, no result
    - On error, return the exception message in `error`
    """

    ns = _get_namespace(session_id)
    stdout_buf = io.StringIO()
    result_str: str | None = None

    try:
        # parse code to be able to inspect last node
        parsed = ast.parse(code, mode="exec")
        body = parsed.body

        with contextlib.redirect_stdout(stdout_buf):
            if not body:
                # nothing to do
                pass
            else:
                # execute all code except last node
                if len(body) > 1:
                    exec(compile(ast.Module(body=body[:-1], type_ignores= []), filename="<cell>", mode="exec"), ns, ns)
                
                last = body[-1]

                if isinstance(last, ast.Expr):

                    # last node is an expression evaluate and return repr
                    expr_code = compile(ast.Expression(last.value), filename="<cell>", mode="eval")
                    value = eval(expr_code, ns, ns)
                    ns["_"] = value  # store in _ for convenience
                    result_str = repr(value)

                else:
                    # if last node is not an expression execute it normally
                    exec(compile(ast.Module(body=[last], type_ignores= []), filename="<cell>", mode="exec"), ns, ns)
        

        count = _bump_count(session_id)

        return ExecResponse(
            stdout=stdout_buf.getvalue(),
            result=result_str,
            error=None,
            exec_count=count
        )
    
    except Exception as e:
        #return partial output and error
        return ExecResponse(
            stdout=stdout_buf.getvalue(),
            result=None,
            error=f"{type(e).__name__}: {e}",
            exec_count=_exec_counts.get(session_id, 0) # no bump in exec count on error
        )
 

@app.get("/api/ping")
def ping():
    """simple health check"""
    return {"status": "ok"}


# allow requests from frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/execute", response_model=ExecResponse)
def api_execute(req: ExecRequest) -> ExecResponse:
    """HTTP endpoint to execute code for a given session_id"""
    return execute_code(session_id=req.session_id, code=req.code)
