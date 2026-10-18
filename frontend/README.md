# ATLAS — AI Tech Consultant

From customer conversations to intelligent action.

React + plain JavaScript/JSX + Vite, Tailwind CSS, Framer Motion and Lucide React. The
Python services remain the source of truth. The earlier Streamlit dashboard
is retained as a fallback; this is the primary product frontend.

Application components and tests use `.jsx`; the API client and Vite configuration
use `.js`. No TypeScript compiler, application types, or TypeScript configuration
is required. Some maintained dependencies ship their own declaration files in
`node_modules`; those vendor files are retained rather than modifying packages.

## Development

Requires Node.js 22+ (on PATH), npm, and the existing Python virtual environment.

Terminal 1, from the Python project folder:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Terminal 2:

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Do not use port 8501 for the new React interface.

After installation, both servers can also be started from the project folder:

```powershell
.\.venv\Scripts\python.exe -m scripts.run_atlas
```

If Node is portable, add `--node-dir "path/to/node-folder"`.

## API configuration

The default `/api` development proxy forwards to `http://127.0.0.1:8000`.
For another origin, copy `.env.example` to `.env.local` and set
`VITE_API_BASE_URL=https://your-api-origin` (no `/api/v1` suffix). Restart Vite.
Settings can change this value temporarily for the browser session.
The backend must permit CORS for your frontend origin; the supplied API allows
the local port 5173 origins. For Render, set backend `CORS_ORIGINS` to the exact
deployed frontend origin, for example `https://atlas-demo.vercel.app`; do not
include `/api/v1` or a route. Never put Anthropic keys in any `VITE_` variable.

## Checks and production build

```powershell
npm test
npm run build
npm run preview
```

Migration verification: 16 frontend tests pass, including all seven page routes,
knowledge questions/escalations, inbox search and approval confirmation, scope
generation/approval, command navigation, and a repository-wide authored-source
check that prevents TypeScript from being reintroduced. The Python regression
suite also passes (10 tests). CSS and animation definitions were not changed
by the language conversion.

On the current Windows workspace, Node is available as a portable installation.
If `npm` is not recognized, set it for the current PowerShell session only:

```powershell
$env:Path = "C:\Users\omkar\AppData\Local\Temp\omnirush\node-v22.14.0-win-x64;$env:Path"
```

The build creates `dist/`. Vite's development API proxy is **not** a production
API server. For preview/deployment, configure `VITE_API_BASE_URL` before building
and allow that frontend origin in backend CORS, or use a same-origin reverse
proxy for `/api`. `npm run preview` serves the static build only.

## Screens and real integration boundaries

| Screen | Available behavior | Unavailable backend features |
|---|---|---|
| Overview | Health, article count, email counts, observed session scopes | Sync timestamps and measured model metrics |
| Knowledge Brain | Query API, returned sources, escalation reference, article fixtures | Live BD crawler, new expert-task management API |
| Inbox Agent | List/search/filter, draft, edit/review/reject, approval counters | Sending, live inbox sync, durable feedback learning |
| Meeting-to-Scope | Generate, capability flags, placeholder effort, compare, approve | Persistent document editing, durable approved-baseline history, delivery |
| Evaluations | Real repository case definitions and expected checks | Live run/result/cost API |
| Activity Log | Confirmed actions/errors observed in this browser session | Durable server audit log |
| Settings | Connection URL/check, actual runtime mode | User authentication or credential management |

DEMO MODE is shown when the API reports a test backend. Sample email/transcript
selectors populate inputs, not fabricated successful responses. Clicking an
action sends the real API request. Sample knowledge URLs use `.example` and are
explicitly labeled. No automatic fallback impersonates Claude.

Reviews record a decision, not a sent email. The autonomy display shows backend
approval counts only; it cannot verify the assignment's 20 actual sends. Scope
review notes are local, excluded from approval, and never represented as saved
backend edits. Original scope snapshots persist through screen navigation but
not a browser reload. Backend data is in memory and disappears on restart.

## Manual acceptance walkthrough

1. Overview: connected badge and actual article count; no fake KPIs.
2. Ctrl/Cmd+K: filter screens, use arrows/Enter, Escape to dismiss.
3. Knowledge: ask about the logo; inspect returned evidence. Ask an unknown
   question and inspect the escalation reference.
4. Inbox: load an example input, generate, edit, confirm review. Reviewed drafts
   lock; no sending success is displayed. Check empty Sent filter.
5. Scope: create a uniquely named project, inspect requirements/document,
   approve it, then submit a follow-up. Compare the captured prior version and
   returned changes. Switch pages and return to confirm snapshots remain.
6. Evaluations: inspect all three case lists; states explicitly say not run.
7. Activity: filter the actions you just performed. Reload clears the session.
8. Settings: invalid URL is rejected; unavailable API shows actionable errors.
9. Resize at 1440, 900 and 390px. Verify collapsed/mobile navigation, stacked
   workspaces, readable tables and modal keyboard focus. Enable reduced motion.
