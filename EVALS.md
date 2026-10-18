# Evaluation Log

Evaluation is intentionally not fabricated. The current MVP uses `local-mock`, not Claude.

## Initial checks

Run:

```bash
pytest
```

The test suite checks health, cited answers, honest escalation, Inbox review, and follow-up scope changes.

## Evaluation runner

The repository contains 20 cases for each task in `evals/cases.json`. Run:

```bash
python evals/run_evals.py
```

This uses the local test backend, not a live Claude request. The output is measured from the current implementation and should be copied here only after the command is run.

## Measured local run

Command:

```bash
python evals/run_evals.py
```

Backend: `test-double` (no paid API call)

| Task | Passed | Total | Average latency |
|---|---:|---:|---:|
| Knowledge Brain | 20 | 20 | 19.65 ms |
| Inbox Agent | 20 | 20 | 15.50 ms |
| Meeting-to-Scope | 20 | 20 | 10.66 ms |

These are local deterministic application measurements. They are not Claude model-quality measurements. Live Claude evaluation remains pending because the Anthropic account has no available credits.

## Planned evaluation dataset

Before submission, add at least 20 cases for each task. Record actual results in a table with task, case ID, backend, pass/fail, latency, and failure reason. Compare two mock prompt/rule versions only if both are actually implemented and measured. Do not report expected scores as measured scores.
