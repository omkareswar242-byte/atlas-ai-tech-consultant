# Design Notes

## Goal

Help a small software business answer product questions, draft customer replies, and turn meetings into reviewed scopes of work.

## Time-boxed decisions

The assignment allows Python for Task 2, so all three tasks use Python. The project contains a Claude adapter and a deterministic local test double. The test double is used because the available API account has no credits. Search is explainable keyword retrieval rather than an unverified vector database. These choices make the MVP runnable and teachable in 2.5 days.

## What is implemented

The Knowledge Brain exposes a FastAPI contract. Inbox and Scope call that contract over HTTP. Unknown questions create an escalation instead of an invented answer. Scope output is always a draft until a human approval endpoint is added. In live mode, the Claude adapter supplies the grounded answer; in test mode, the same contract is exercised without a paid network call.

## Deferred work

Live sitemap crawling, multimodal image processing, real Claude calls, email delivery, authentication, a production vector database, and background workers are deferred. They must be described as future work, not claimed as complete.
