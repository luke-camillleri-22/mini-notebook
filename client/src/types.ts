export type CellType = "markdown" | "code";

export interface Cell {
  id: string;
  type: CellType;
  source: string;
  output?: string; // stdout + result joined for display
  error?: string;
}

export interface ExecResponse {
  stdout: string;
  result: string | null;
  error: string | null;
  exec_count: number;
}