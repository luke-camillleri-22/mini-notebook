// React and UI dependencies
import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { v4 as uuidv4 } from "uuid";

// Local modules for session management and API communication
import { getTabSessionId } from "./session";
import { runCode, resetSession } from "./api";
import type { Cell } from "./types";

/**
 * Main App component - A Jupyter-like notebook interface with support for:
 * - Code cells (Python execution)
 * - Markdown cells (with preview/edit modes)
 * - Session-based execution state per browser tab
 */
export default function App() {
  // Generate a unique session ID for this tab/window (memoized to persist across re-renders)
  const sessionId = useMemo(getTabSessionId, []);
  
  // Main state: array of cells (code or markdown) that make up the notebook
  const [cells, setCells] = useState<Cell[]>([
    { id: uuidv4(), type: "code", source: "" }, // Initialize with one empty code cell
  ]);

  // Track which markdown cells are currently in preview mode (vs edit mode)
  const [mdPreview, setMdPreview] = useState<Record<string, boolean>>({});
  
  // Helper functions for markdown preview state management
  const isPreview = (id: string) => !!mdPreview[id]; // Check if cell is in preview mode
  const togglePreview = (id: string) =>
    setMdPreview(prev => ({ ...prev, [id]: !prev[id] })); // Toggle between edit/preview


  /**
   * Add a new cell of the specified type (code or markdown) to the end of the notebook
   */
  function addCell(type: Cell["type"]) {
    setCells(prev => [...prev, { id: uuidv4(), type, source: "" }]);
  }

  /**
   * Update the source content of a specific cell
   */
  function updateSource(id: string, source: string) {
    setCells(prev => prev.map(c => (c.id === id ? { ...c, source } : c)));
  }

  /**
   * Remove a cell from the notebook by its ID
   */
  function deleteCell(id: string) {
    setCells(prev => prev.filter(c => c.id !== id));
  }

  /**
   * Execute a code cell by sending it to the Python backend
   * Handles both successful execution and error cases
   */
  async function execute(id: string) {
    const cell = cells.find(c => c.id === id);
    if (!cell) return; // Guard: cell not found
    
    try {
      // send code to backend for execution
      const resp = await runCode(sessionId, cell.source);
      
      // combine stdout and result into a single output 
      const parts: string[] = [];
      if (resp.stdout) parts.push(resp.stdout.trimEnd());
      if (resp.result !== null && resp.result !== undefined) parts.push(String(resp.result));
      const output = parts.join("\n");
      
      // update cell with execution results
      setCells(prev => prev.map(c => (c.id === id ? { ...c, output, error: resp.error ?? undefined } : c)));
    } catch (err: any) {
      // handle network/api errors
      setCells(prev => prev.map(c => (c.id === id ? { ...c, error: String(err) } : c)));
    }
  }

  return (
    <div className="cell" style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <h1>Jupyter Notebook Mini</h1>
      
      {/* Control buttons for adding new cells and resetting kernel */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button className="btn" onClick={() => addCell("markdown")}>+ Markdown</button>
        <button className="btn" onClick={() => addCell("code")}>+ Code</button>
        <button className="btn"
          onClick={async () => {
            try {
              await resetSession(sessionId);
              alert("Variables cleared for this tab.");
            } catch (e) {
              alert(String(e));
            }
          }}
        >
          Restart Kernel
        </button>
      </div>

      {/* Render all cells in order */}
      {cells.map(cell => (
        <div key={cell.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          {/* Cell header with type label and delete button */}
          <div style={{ marginBottom: 8, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{cell.type.toUpperCase()}</span>
            <button className="btn" onClick={() => deleteCell(cell.id)} style={{ color: "red" }}>
              Delete Cell ✕
            </button>
          </div>

          {/* Text area for editing cell content */}
          <textarea
            value={cell.source}
            onChange={e => updateSource(cell.id, e.target.value)}
            rows={cell.type === "code" ? 8 : 5}
            style={{
              width: "100%",
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              display: cell.type === "markdown" && isPreview(cell.id) ? "none" : "block", // Hide textarea when previewing markdown
            }}
            placeholder={cell.type === "code" ? "Write Python here…" : "Write Markdown here…"}
          />

          {/* Markdown-specific controls and preview */}
          <div style={{ marginTop: 8 }}>
            {cell.type === "markdown" && (
            <>
              {isPreview(cell.id) ? (
                // preview mode -> show rendered markdown with edit button
                <>
                  <div
                    style={{
                      padding: 8,
                      background: "#242424",
                      color: "#eee",
                      borderRadius: 6,
                      minHeight: 40,
                    }}
                  >
                    <ReactMarkdown>{cell.source || "*Nothing to display*"}</ReactMarkdown>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <button className="btn" onClick={() => togglePreview(cell.id)}>Edit Markdown</button>
                  </div>
                </>
              ) : (
                // Edit mode: show render button
                <div style={{ marginTop: 8 }}>
                  <button className="btn" onClick={() => togglePreview(cell.id)}>Render Markdown ▶</button>
                </div>
              )}
            </>
          )}
        </div>

          {/* Code cell controls and output */}
          {cell.type === "code" && (
            <>
              <button className="btn" onClick={() => execute(cell.id)}>Run ▶</button>
              {/* Display execution output or errors */}
              {cell.output || cell.error ? (
                <pre>{cell.error ? `Error: ${cell.error}` : cell.output}</pre>
              ) : null}
            </>
          )}
        </div>
      ))}

      {/* Footer with session info */}
      <p style={{ color: "#666", fontSize: 12 }}>Each tab/window has its own Python state. Refresh to clear variables.</p>
    </div>
  );
}
