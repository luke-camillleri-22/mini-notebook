import type { ExecResponse } from "./types";

// base url for the backend 
const API_BASE_URL = "http://127.0.0.1:8000/api";

/**
 * Execute Python code in a specific session
 * 
 * Sends Python code to the backend for execution in an isolated session environment.
 * Each session maintains its own variable namespace and execution state.
 * 
 */
export async function runCode(sessionId: string, code: string): Promise<ExecResponse> {
  const res = await fetch(`${API_BASE_URL}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, code }),
  });
  
  // handle http errors 
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  
  // parse and return json response containing execution results
  return res.json();
}

/**
 * Reset a session's Python execution state
 * Clears all variables and execution history for the given session
 */
export async function resetSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  
  // handle http errors
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  
  // No return value needed - reset is fire-and-forget
}