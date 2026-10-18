# Submission Checklist

## Code and setup

- [x] One Python project folder
- [x] Python used for all three tasks
- [x] Claude adapter included
- [x] No-credit test backend included
- [x] `.env` ignored
- [x] Safe `.env.example` included
- [x] One documented project run command
- [x] Automated tests run successfully

## Task 1 — Knowledge Brain

- [x] Searchable article fixtures
- [x] Grounded answers
- [x] Citations
- [x] Insufficient-evidence response
- [x] Human escalation ID
- [ ] Live sitemap crawler
- [ ] Image understanding with a vision model

## Task 2 — Inbox Agent

- [x] 50 sample emails
- [x] Email classification
- [x] Knowledge Brain API call
- [x] Draft reply
- [x] Risk level
- [x] Human approval and edit tracking
- [x] Consecutive unchanged tracking

## Task 3 — Meeting-to-Scope

- [x] Three meeting transcripts
- [x] Requirement extraction
- [x] Feasibility check
- [x] Estimates
- [x] Proposal draft
- [x] Follow-up comparison
- [x] Human approval

## Evaluation and documentation

- [x] 20 Knowledge cases
- [x] 20 Inbox cases
- [x] 20 Scope cases
- [x] Evaluation runner
- [x] README.md
- [x] DESIGN.md
- [x] EVALS.md
- [x] AI_LOG.md placeholder
- [x] DEMO_SCRIPT.md

## Honest limitations to explain

- Live Claude evaluation requires Anthropic credits.
- Current local measurements use the deterministic test backend.
- The live sitemap crawler and production image processing are deferred.
- Data is held in memory for the MVP rather than a production database.
