from fastapi.testclient import TestClient
from app.ai.backend import LocalTestBackend

from app.main import app


client = TestClient(app)


def test_test_backend_is_deterministic() -> None:
    backend = LocalTestBackend()
    assert backend.answer("logo", ["Open Design Settings."]) == "Based on the knowledge articles: Open Design Settings."


def test_health() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["ai_backend"] == "test"


def test_knowledge_returns_citation() -> None:
    response = client.post("/api/v1/knowledge/query", json={"question": "How do I change the website logo?"})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "answered"
    assert body["sources"]


def test_unknown_question_escalates() -> None:
    response = client.post("/api/v1/knowledge/query", json={"question": "What is the quantum weather export policy?"})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "insufficient_evidence"
    assert body["needs_human"] is True
    assert body["escalation_id"]


def test_inbox_draft_and_review() -> None:
    response = client.post("/api/v1/inbox/drafts", json={"from_address": "customer@example.com", "subject": "Logo help", "body": "How do I change my website logo?"})
    assert response.status_code == 200
    draft = response.json()
    assert draft["category"] == "how_to"
    review = client.post(f"/api/v1/inbox/emails/{draft['email_id']}/review", json={"final_reply": draft["draft_reply"], "decision": "approved"})
    assert review.status_code == 200
    assert review.json()["unchanged"] is True


def test_inbox_edit_resets_unchanged_count() -> None:
    response = client.post("/api/v1/inbox/drafts", json={"from_address": "customer@example.com", "subject": "Logo help", "body": "How do I change my website logo?"})
    email_id = response.json()["email_id"]
    review = client.post(f"/api/v1/inbox/emails/{email_id}/review", json={"final_reply": "A corrected reply", "decision": "edited", "correction_reason": "Shorter response"})
    assert review.status_code == 200
    assert review.json()["unchanged"] is False
    autonomy = client.get("/api/v1/inbox/autonomy")
    how_to = next(item for item in autonomy.json() if item["category"] == "how_to")
    assert how_to["autonomous_send_enabled"] is False


def test_scope_follow_up_detects_added_requirement() -> None:
    first = client.post("/api/v1/scope/projects/demo/meetings", json={"project_id": "demo", "meeting_id": "a", "transcript": "We need better search and filters on mobile."})
    assert first.status_code == 200
    second = client.post("/api/v1/scope/projects/demo/follow-up", json={"project_id": "demo", "meeting_id": "b", "parent_meeting_id": "a", "transcript": "Remove mobile support, keep filters but add brand filters, and add an analytics dashboard."})
    assert second.status_code == 200
    change_types = {change["change_type"] for change in second.json()["changes"]}
    assert "removed" in change_types
    assert "modified" in change_types
    assert "out_of_scope" in change_types


def test_scope_requires_approval_and_can_be_approved() -> None:
    first = client.post("/api/v1/scope/projects/approval-demo/meetings", json={"project_id": "approval-demo", "meeting_id": "a", "transcript": "We need better search and filters."})
    assert first.status_code == 200
    assert first.json()["approval_status"] == "draft"
    approved = client.post("/api/v1/scope/projects/approval-demo/approve", json={"version": 1, "reviewer": "student-reviewer"})
    assert approved.status_code == 200
    assert approved.json()["approval_status"] == "approved"
