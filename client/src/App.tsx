// React and UI dependencies
import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { v4 as uuidv4 } from "uuid";

import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-python"; // python syntax
import "prismjs/themes/prism-tomorrow.css";        // you can switch to prism-tomorrow.css for dark

import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css"; // KaTeX CSS for math rendering

// modules for session management and api communication
import { getTabSessionId } from "./session";
import { runCode, resetSession } from "./api";
import type { Cell } from "./types";

/**
 * wrapper to add a left line-number to react-simple-code-editor.
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
          width: 24,
          textAlign: "right",
          userSelect: "none",
          background: "#100e16ff",
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

      {/* code editor */}
      <Editor
        value={value}
        onValueChange={onChange}
        highlight={(code) => Prism.highlight(code, Prism.languages.python, "python")}
        padding={10}
        style={{
          border: "1px solid #3a3a3a",
          borderLeft: "none",
          borderRadius: "0 6px 6px 0",
          background: "#181622",
          color: "#eee",
          fontFamily:
            '"Fira Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
          fontSize: 14,
          lineHeight: 1.4,
          width: "100%",
          minHeight: 200, // roughly your previous 8 rows
        }}
      />
    </div>
  );
}

/**
 * Main App - jupyter-like notebook interface with support for:
 * - code cells for python execution with simple output display
 * - markdown cells (with preview/edit modes)
 * - session-based execution state per browser tab or window
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

  // running-all flag to disable the button while executing
  const [isRunningAll, setIsRunningAll] = useState(false);

  /** add new cell of specified type (code or markdown) to the end of the notebook */
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

  /** update the source content of a specific cell */
  function updateSource(id: string, source: string) {
    setCells((prev) => prev.map((c) => (c.id === id ? { ...c, source } : c)));
  }

  /** remove a cell from the notebook by its ID */
  function deleteCell(id: string) {
    setCells((prev) => prev.filter((c) => c.id !== id));
  }

  /** execute code cell by sending it to python backend */
  async function execute(id: string) {
    const cell = cells.find((c) => c.id === id);
    if (!cell) return; // guard

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


  async function runAllCells() {
    if (isRunningAll) return;
    setIsRunningAll(true);
    try {
      // snapshot the current order so edits during run don’t change execution order
      const snapshot = [...cells];

      // auto-render all markdown cells:
      setMdPreview(prev => ({ ...prev, ...Object.fromEntries(snapshot.filter(c=>c.type==='markdown').map(c=>[c.id, true])) }));

      // run code cells sequentially to preserve state 
      for (const cell of snapshot) {
        if (cell.type !== "code") continue;

        await execute(cell.id);
      }
    } finally {
      setIsRunningAll(false);
    }
  }

  return (
    <div className="cells" style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <h1>Jupyter Notebook Mini</h1>

      {/* buttons for adding new cells and resetting kernel */}
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
        <button
          className="btn run"
          onClick={runAllCells}
          disabled={isRunningAll}
          title="Run all code cells from top to bottom"
        >
          {isRunningAll ? "Running…" : "Run All ▶▶"}
        </button>
      </div>

      {/* render all cells in order */}
      {cells.map((cell) => (
        <div
          key={cell.id}
          className="cell"
        >
          {/* cell header with type label and delete button */}
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
            <button className="btn delete" onClick={() => deleteCell(cell.id)} style={{ color: "white" }}>
              Delete Cell ✕
            </button>
          </div>

          {/* === EDITOR AREA ===
              markdown cells keep the original <textarea> (hidden when rendering).
              code cells render the new CodeEditor with line numbers + highlighting. */}
          {cell.type === "markdown" ? (
            <textarea
              value={cell.source}
              onChange={(e) => updateSource(cell.id, e.target.value)}
              rows={5}
              style={{
                width: "100%",
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                display: isPreview(cell.id) ? "none" : "block", // hide textarea when rendering markdown
              }}
              placeholder="Write Markdown here…"
            />
          ) : (
            <CodeEditor value={cell.source} onChange={(code) => updateSource(cell.id, code)} />
          )}

          {/* markdown-specific controls and preview */}
          <div style={{ marginTop: 8 }}>
            {cell.type === "markdown" && (
              <>
                {isPreview(cell.id) ? (
                  // preview mode -> show rendered markdown with edit button
                  <>
                    <div
                      style={{
                        padding: 8,
                        background: "#181622",
                        color: "#eee",
                        borderRadius: 6,
                        minHeight: 40,
                      }}
                    >
                      
                      <ReactMarkdown
                       remarkPlugins={[remarkMath]}
                       rehypePlugins={[rehypeKatex]}
                       >
                        {cell.source || "*Nothing to display*"}
                        </ReactMarkdown>

                    </div>
                    <div style={{ marginTop: 8 }}>
                      <button className="btn run" onClick={() => togglePreview(cell.id)}>
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
                  // edit mode -> show render button
                  <div style={{ marginTop: 8 }}>
                    <button className="btn run" onClick={() => togglePreview(cell.id)}>
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

          {/* code cell controls and output */}
          {cell.type === "code" && (
            <>
              <button className="btn run" onClick={() => execute(cell.id)}>
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

              {/* display execution output or errors */}
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

      {/* footer */}
      <p style={{ color: "#666", fontSize: 12 }}>
        Each tab/window has its own Python state. To clear variables, use the Reset Kernel button or open a fresh tab/window.
      </p>
    </div>
  );
}