// React and UI dependencies
import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { v4 as uuidv4 } from "uuid";

import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-python"; // python syntax
import "prismjs/themes/prism-tomorrow.css";        // you can switch to prism-tomorrow.css for dark

// modules for session management and api communication
import { getTabSessionId } from "./session";
import { runCode, resetSession } from "./api";
import type { Cell } from "./types";

/**
 * Small wrapper to add a left line-number gutter to react-simple-code-editor.
 * (react-simple-code-editor doesn't ship line numbers out-of-the-box.)
 */
function CodeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const lineCount = Math.max(1, value.split("\n").length);

  return (
    <div style={{ display: "flex", width: "100%" }}>
      {/* Line numbers gutter */}
      <pre
        aria-hidden="true"
        style={{
          margin: 0,
          padding: "10px 8px",
          width: 36,
          textAlign: "right",
          userSelect: "none",
          background: "#161616",
          color: "#8a8a8a",
          border: "1px solid #3a3a3a",
          borderRight: "none",
          borderRadius: "6px 0 0 6px",
          lineHeight: 1.4,
          fontFamily:
            '"Fira Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
          fontSize: 14,
          whiteSpace: "pre",
        }}
      >
        {Array.from({ length: lineCount }, (_, i) => String(i + 1)).join("\n")}
      </pre>

      {/* The editor itself */}
      <Editor
        value={value}
        onValueChange={onChange}
        highlight={(code) => Prism.highlight(code, Prism.languages.python, "python")}
        padding={10}
        style={{
          border: "1px solid #3a3a3a",
          borderLeft: "none",
          borderRadius: "0 6px 6px 0",
          background: "#1e1e1e",
          color: "#eee",
          fontFamily:
            '"Fira Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
          fontSize: 14,
          lineHeight: 1.4,
          width: "100%",
          minHeight: 160, // roughly your previous 8 rows
        }}
      />
    </div>
  );
}

/**
 * Main App component - A Jupyter-like notebook interface with support for:
 * - Code cells (Python execution)
 * - Markdown cells (with preview/edit modes)
 * - Session-based execution state per browser tab
 */
export default function App() {
  // unique session ID for this tab/window (useMemo to persist across re-renders)
  const sessionId = useMemo(getTabSessionId, []);

  // array of cells that make up the notebook
  const [cells, setCells] = useState<Cell[]>([
    { id: uuidv4(), type: "code", source: "" }, // Initialize with one empty code cell
  ]);

  // track which markdown cells are currently in preview mode
  const [mdPreview, setMdPreview] = useState<Record<string, boolean>>({});

  // helpers for markdown preview state management
  const isPreview = (id: string) => !!mdPreview[id]; // check if cell is in preview mode
  const togglePreview = (id: string) =>
    setMdPreview((prev) => ({ ...prev, [id]: !prev[id] })); // toggle between edit/preview

  /** Add a new cell of the specified type (code or markdown) to the end of the notebook */
  function addCell(type: Cell["type"]) {
    setCells((prev) => [...prev, { id: uuidv4(), type, source: "" }]);
  }

  function addCellBelow(id: string, type: Cell["type"]) {
    setCells((prev) => {
      const index = prev.findIndex((c) => c.id === id);
      if (index === -1) return prev; // cell not found
      const newCell = { id: uuidv4(), type, source: "" };
      const newCells = [...prev];
      newCells.splice(index + 1, 0, newCell); // insert new cell after the specified cell
      return newCells;
    });
  }

  /** Update the source content of a specific cell */
  function updateSource(id: string, source: string) {
    setCells((prev) => prev.map((c) => (c.id === id ? { ...c, source } : c)));
  }

  /** Remove a cell from the notebook by its ID */
  function deleteCell(id: string) {
    setCells((prev) => prev.filter((c) => c.id !== id));
  }

  /** Execute a code cell by sending it to the Python backend */
  async function execute(id: string) {
    const cell = cells.find((c) => c.id === id);
    if (!cell) return; // Guard: cell not found

    try {
      const resp = await runCode(sessionId, cell.source);

      // combine stdout and result into a single output
      const parts: string[] = [];
      if (resp.stdout) parts.push(resp.stdout.trimEnd());
      if (resp.result !== null && resp.result !== undefined) parts.push(String(resp.result));
      const output = parts.join("\n");

      // update cell with execution results
      setCells((prev) =>
        prev.map((c) => (c.id === id ? { ...c, output, error: resp.error ?? undefined } : c)),
      );
    } catch (err: any) {
      // handle network/api errors
      setCells((prev) => prev.map((c) => (c.id === id ? { ...c, error: String(err) } : c)));
    }
  }

  return (
    <div className="cell" style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <h1>Jupyter Notebook Mini</h1>

      {/* Control buttons for adding new cells and resetting kernel */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button className="btn" onClick={() => addCell("markdown")}>
          + Markdown
        </button>
        <button className="btn" onClick={() => addCell("code")}>
          + Code
        </button>
        <button
          className="btn"
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
      {cells.map((cell) => (
        <div
          key={cell.id}
          style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}
        >
          {/* Cell header with type label and delete button */}
          <div
            style={{
              marginBottom: 8,
              fontWeight: 600,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{cell.type.toUpperCase()}</span>
            <button className="btn" onClick={() => deleteCell(cell.id)} style={{ color: "red" }}>
              Delete Cell ✕
            </button>
          </div>

          {/* === EDITOR AREA ===
              Markdown cells keep the original <textarea> (hidden when previewing).
              Code cells render the new CodeEditor with line numbers + highlighting. */}
          {cell.type === "markdown" ? (
            <textarea
              value={cell.source}
              onChange={(e) => updateSource(cell.id, e.target.value)}
              rows={5}
              style={{
                width: "100%",
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                display: isPreview(cell.id) ? "none" : "block", // Hide textarea when previewing markdown
              }}
              placeholder="Write Markdown here…"
            />
          ) : (
            <CodeEditor value={cell.source} onChange={(code) => updateSource(cell.id, code)} />
          )}

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
                      <button className="btn" onClick={() => togglePreview(cell.id)}>
                        Edit Markdown
                      </button>
                      <button
                        className="btn"
                        style={{ marginLeft: 8 }}
                        onClick={() => addCellBelow(cell.id, "code")}
                      >
                        + Add Code Cell Below
                      </button>
                      <button
                        className="btn"
                        style={{ marginLeft: 8 }}
                        onClick={() => addCellBelow(cell.id, "markdown")}
                      >
                        + Add Markdown Cell Below
                      </button>
                    </div>
                  </>
                ) : (
                  // Edit mode: show render button
                  <div style={{ marginTop: 8 }}>
                    <button className="btn" onClick={() => togglePreview(cell.id)}>
                      Render Markdown ▶
                    </button>
                    <button
                      className="btn"
                      style={{ marginLeft: 8 }}
                      onClick={() => addCellBelow(cell.id, "code")}
                    >
                      + Add Code Cell Below
                    </button>
                    <button
                      className="btn"
                      style={{ marginLeft: 8 }}
                      onClick={() => addCellBelow(cell.id, "markdown")}
                    >
                      + Add Markdown Cell Below
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Code cell controls and output */}
          {cell.type === "code" && (
            <>
              <button className="btn" onClick={() => execute(cell.id)}>
                Run ▶
              </button>
              <button
                className="btn"
                style={{ marginLeft: 8 }}
                onClick={() => addCellBelow(cell.id, "code")}
              >
                + Add Code Cell Below
              </button>
              <button
                className="btn"
                style={{ marginLeft: 8 }}
                onClick={() => addCellBelow(cell.id, "markdown")}
              >
                + Add Markdown Cell Below
              </button>

              {/* Display execution output or errors */}
              {cell.output || cell.error ? (
                <pre
                  style={{
                    background: "#111",
                    color: "#f5f5f5",
                    padding: 10,
                    borderRadius: 6,
                    marginTop: 8,
                    overflowX: "auto",
                  }}
                >
                  {cell.error ? `Error: ${cell.error}` : cell.output}
                </pre>
              ) : null}
            </>
          )}
        </div>
      ))}

      {/* Footer with session info */}
      <p style={{ color: "#666", fontSize: 12 }}>
        Each tab/window has its own Python state. Refresh to clear variables.
      </p>
    </div>
  );
}