# 10-Minute Demo Script

## 0:00–0:45 — Explain the problem

“Small software businesses lose time searching their help center, replying to repeated emails, and turning vague meetings into estimates. This project connects three workflows through one shared Knowledge Brain.”

## 0:45–2:30 — Task 1: Knowledge Brain

Run:

```bash
python -m scripts.run_demo
```

Explain:

- The system searches product articles.
- The answer includes source evidence.
- An unsupported question is escalated instead of invented.

## 2:30–4:30 — Task 2: Inbox Agent

Explain:

- The email is classified.
- The Knowledge Brain supplies evidence.
- A reply draft is created.
- A human approves or edits it.
- High-risk requests remain human-controlled.

## 4:30–7:30 — Task 3: Meeting-to-Scope

Explain:

- A transcript becomes structured requirements.
- Existing product capability is checked.
- The system creates estimates and a proposal.
- The proposal starts as a draft.

## 7:30–8:45 — Follow-up change

Explain:

- The follow-up is compared with the approved baseline.
- Removed, modified, and out-of-scope work is highlighted.
- The revised scope still needs human approval.

## 8:45–9:30 — Evidence

Run:

```bash
python -m pytest
python evals/run_evals.py
```

Say the actual results shown by the commands. Current local results are 8 automated tests passed and 20/20 cases for each task using the deterministic test backend.

## 9:30–10:00 — Limitation

“The project contains a Claude adapter, but live Claude requests were not run because the development Anthropic account had no credits. Local tests use a deterministic test backend. With a funded company key, `AI_BACKEND=claude` enables live Claude calls.”
