a
# Mini Notebook
## Luke Camilleri

A lightweight, local “mini-Jupyter” notebook: write **Markdown** and **Python** code cells in the browser, execute them against a Python kernel per-tab, and see outputs inline.

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [API](#api)
- [Examples](#examples)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Contributors](#contributors)
- [License](#license)

## Features

- Per-tab Python state: each browser tab/window gets its own kernel namespace (variables persist across code cells in that tab).
- Markdown cells: render regular Markdown via `react-markdown` and mathematical expressions using `remarkMath` and `rehypeKatex`.
- Code cells (Python): execute Python; capture `stdout`, show final expression result, and report errors.
- Reset Kernel: clear the current tab’s Python state.
- Simple, responsive UI: add, edit, run, and delete cells.



## Project Structure

```
-technical-test/
├─ client/
│  ├─ src/
│  │  ├─ App.tsx
│  │  ├─ api.ts
│  │  ├─ session.ts
│  │  └─ types.ts
│  ├─ package.json
│  └─ vite.config.ts
└─ server/
   ├─ main.py
   └─ requirements.txt
```

## Tech Stack

**Frontend**
- React 19 + TypeScript
- Vite
- `react-markdown`
- `react-simple-code-editor`, `prismjs`
- `uuid`

**Backend**
- FastAPI + Uvicorn
- Pydantic
- Python 3.12+

## Quick Start
Open a Terminal window in the root folder of the project and enter the following commands:
### Backend (FastAPI)

```bash
cd server
python -m venv .venv
source .venv/bin/activate  # or .\.venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
Go to http://127.0.0.1:8000/docs to see API documentation

### Frontend (React + Vite)

```bash
cd client
npm install
npm run dev
```

## Configuration

Edit `client/src/api.ts` if backend runs on a different origin:

```ts
const API_BASE_URL = "http://127.0.0.1:8000/api";
```

## Usage

1. Go to https://localhost:5173 to access the page
2. Add Markdown or Code cells.
3. Run Python code: `stdout`, result, and errors show inline.
4. Use "Reset Kernel" to clear tab state.

> Each tab uses a unique session stored in `sessionStorage`.

## API

### POST /execute

```json
{
  "session_id": "abc",
  "code": "print('Hi'); 2+2"
}
```

Response:

```json
{
  "stdout": "Hi\n",
  "result": "4",
  "error": null,
  "exec_count": 1
}
```

### POST /reset

```json
{ "session_id": "abc" }
```

Response:

```json
{ "status": "reset kernel" }
```

## Examples

```python
x = 10
y = 5
x + y  # 15
```

```python
raise Exception("Oops")  # error shown inline
```

## Development

- Frontend: `npm run dev`, `npm run build`
- Backend: `uvicorn main:app --reload`

## Troubleshooting

- CORS errors? Update `API_BASE_URL` and CORS settings in `main.py`
- Backend not running? Ensure `uvicorn` is active.
- Session lost? Session ID is tab-scoped.
