from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def show(title: str, payload: dict) -> None:
    print(f"\n=== {title} ===")
    print(payload)


def main() -> None:
    health = client.get("/api/v1/health")
    show("HEALTH", health.json())

    knowledge = client.post("/api/v1/knowledge/query", json={"question": "How do I change my website logo?"})
    show("TASK 1: KNOWLEDGE ANSWER", knowledge.json())

    unknown = client.post("/api/v1/knowledge/query", json={"question": "Can the system control quantum weather?"})
    show("TASK 1: HUMAN ESCALATION", unknown.json())

    email = client.post("/api/v1/inbox/drafts", json={"from_address": "client@example.com", "subject": "Logo help", "body": "How do I change my website logo?"})
    email_payload = email.json()
    show("TASK 2: INBOX DRAFT", email_payload)

    review = client.post(f"/api/v1/inbox/emails/{email_payload['email_id']}/review", json={"final_reply": email_payload["draft_reply"], "decision": "approved"})
    show("TASK 2: HUMAN APPROVAL", review.json())

    project_id = "demo-project"
    scope = client.post(f"/api/v1/scope/projects/{project_id}/meetings", json={"project_id": project_id, "meeting_id": "meeting-a", "transcript": "The client wants better search, product filters, and a better mobile experience."})
    show("TASK 3: INITIAL SCOPE", scope.json())

    follow_up = client.post(f"/api/v1/scope/projects/{project_id}/follow-up", json={"project_id": project_id, "meeting_id": "meeting-a-followup", "parent_meeting_id": "meeting-a", "transcript": "Remove mobile support, keep filters but add brand filters, and add an analytics dashboard."})
    show("TASK 3: FOLLOW-UP CHANGES", follow_up.json())

    approval = client.post(f"/api/v1/scope/projects/{project_id}/approve", json={"version": 2, "reviewer": "demo-reviewer"})
    show("TASK 3: SCOPE APPROVAL", approval.json())

    print("\nDemo completed. This run used the local test backend and did not call the paid Claude API.")


if __name__ == "__main__":
    main()
