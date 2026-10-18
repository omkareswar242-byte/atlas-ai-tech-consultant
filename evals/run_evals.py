import json
import time
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app


ROOT = Path(__file__).parent
CASES = json.loads((ROOT / "cases.json").read_text(encoding="utf-8"))
client = TestClient(app)


def run_knowledge() -> tuple[int, int, float]:
    passed = 0
    total_ms = 0.0
    for case in CASES["knowledge"]:
        started = time.perf_counter()
        response = client.post("/api/v1/knowledge/query", json={"question": case["question"]})
        total_ms += (time.perf_counter() - started) * 1000
        passed += response.status_code == 200 and response.json()["status"] == case["expected"]
    return passed, len(CASES["knowledge"]), total_ms


def run_inbox() -> tuple[int, int, float]:
    passed = 0
    total_ms = 0.0
    for case in CASES["inbox"]:
        started = time.perf_counter()
        response = client.post("/api/v1/inbox/drafts", json={"from_address": "eval@example.com", "subject": case["subject"], "body": case["body"]})
        total_ms += (time.perf_counter() - started) * 1000
        passed += response.status_code == 200 and response.json()["category"] == case["expected"]
    return passed, len(CASES["inbox"]), total_ms


def run_scope() -> tuple[int, int, float]:
    passed = 0
    total_ms = 0.0
    for case in CASES["scope"]:
        started = time.perf_counter()
        project_id = f"eval-{case['id']}"
        response = client.post(f"/api/v1/scope/projects/{project_id}/meetings", json={"project_id": project_id, "meeting_id": case["id"], "transcript": case["transcript"]})
        total_ms += (time.perf_counter() - started) * 1000
        ids = {item["id"] for item in response.json().get("requirements", [])} if response.status_code == 200 else set()
        passed += response.status_code == 200 and case["expected"] in ids
    return passed, len(CASES["scope"]), total_ms


if __name__ == "__main__":
    for name, runner in (("knowledge", run_knowledge), ("inbox", run_inbox), ("scope", run_scope)):
        passed, total, total_ms = runner()
        print(f"{name}: {passed}/{total} passed; total_ms={total_ms:.2f}; average_ms={total_ms / total:.2f}")
