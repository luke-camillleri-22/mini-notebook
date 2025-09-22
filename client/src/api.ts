import type { ExecResponse } from "./types";

export async function runCode(sessionId: string, code: string): Promise<ExecResponse> {
  const res = await fetch("http://127.0.0.1:8000/api/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, code }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
