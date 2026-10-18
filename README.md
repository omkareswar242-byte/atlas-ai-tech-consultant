# ATLAS — AI Tech Consultant

A Python backend with a React/JavaScript (JSX) product interface for the Business Labs capstone.
**From customer conversations to intelligent action.** Three connected workflows:

1. **Knowledge Brain** — searchable product knowledge, citations, and human escalation.
2. **Inbox Agent** — email classification, grounded drafts, and human review.
3. **Meeting to Scope** — requirements, feasibility checks, estimates, proposals, and follow-up changes.

## Important limitation

The project includes a real Claude adapter, but live calls require Anthropic API credits. When credits are unavailable, local tests use a deterministic test double. Results from the test double must not be described as Claude evaluation results.

## Setup

```bash
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[test]"
```

For local, no-credit development, use this in `.env`:

```env
AI_BACKEND=test
ANTHROPIC_API_KEY=
```

When the company supplies a funded key, use:

```env
AI_BACKEND=claude
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-haiku-4-5
```

## Run

```bash
python -m uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000/docs.

## ATLAS frontend (primary interface)

Start the API with the command above. In a second terminal (Node.js 22+ required):

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. After installation, `python -m scripts.run_atlas`
starts both servers when Node is on PATH. For portable Node, pass `--node-dir`.
All seven screens, configuration, deployment details, and integration gaps are
documented in [`frontend/README.md`](frontend/README.md).

Build/check the frontend: `npm test` and `npm run build` from `frontend/`.

## Earlier Streamlit dashboard (optional fallback)

Keep the API running in the first terminal. Open a second terminal in this project and run:

```powershell
.\.venv\Scripts\python.exe -m streamlit run ui/app.py
```

Open http://localhost:8501. The dashboard includes Knowledge Brain, Inbox Review,
and Scope Builder screens. It calls the API at http://127.0.0.1:8000; the sidebar
allows a different backend URL. Start the API first to avoid connection errors.

Review and approval record decisions only: no email or proposal is sent.
Demo article links are fixtures, scope estimates are placeholders, and backend
data is in memory and disappears on restart. Test mode is not live Claude.

## Test

```bash
pytest
```

The test command uses the local test double and does not make paid API calls.

## Run the end-to-end demo

```bash
python -m scripts.run_demo
```

The demo shows a Knowledge Brain answer and escalation, an Inbox draft and approval, and a Meeting-to-Scope follow-up comparison and approval.

## Architecture rule

Inbox and Scope call the Knowledge Brain through its HTTP endpoint. They do not import the Knowledge Brain search implementation. This keeps Task 1 reusable.
