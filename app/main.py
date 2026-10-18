from uuid import uuid4

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os

from .knowledge import ARTICLES, ESCALATIONS, query as knowledge_query, resolve as resolve_escalation
from .models import EmailDraft, EmailInput, EmailReview, EscalationResolve, FollowUpResult, KnowledgeAnswer, KnowledgeQuery, MeetingInput, ScopeApproval, ScopeChange, ScopePackage

app = FastAPI(title="AI Tech Consultant", version="0.1.0")
configured_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", *configured_origins],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
EMAILS: dict[str, dict] = {}
PROJECTS: dict[str, ScopePackage] = {}
AUTONOMY_COUNTS: dict[str, int] = {}


@app.get("/api/v1/health")
def health() -> dict:
    return {"service": "ai-tech-consultant", "status": "ok", "ai_backend": os.getenv("AI_BACKEND", "test"), "article_count": len(ARTICLES)}


@app.post("/api/v1/knowledge/query", response_model=KnowledgeAnswer)
def ask_knowledge(request: KnowledgeQuery) -> KnowledgeAnswer:
    return knowledge_query(request)


@app.get("/api/v1/knowledge/articles")
def list_articles() -> list[dict]:
    return [article.__dict__ for article in ARTICLES]


@app.post("/api/v1/knowledge/escalations/{escalation_id}/resolve")
def resolve_knowledge(escalation_id: str, request: EscalationResolve) -> dict:
    try:
        return resolve_escalation(escalation_id, request)
    except KeyError as error:
        raise HTTPException(status_code=404, detail="Escalation not found") from error


async def call_knowledge(question: str) -> KnowledgeAnswer:
    # HTTP boundary is intentional: downstream tasks consume Task 1's API.
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://knowledge.local") as client:
        response = await client.post("/api/v1/knowledge/query", json={"question": question})
    response.raise_for_status()
    return KnowledgeAnswer.model_validate(response.json())


def classify_email(text: str) -> tuple[str, str]:
    lowered = text.lower()
    if any(word in lowered for word in ("refund", "cancel")):
        return "refund_or_cancellation", "high"
    if any(word in lowered for word in ("broken", "error", "failed", "not working")):
        return "troubleshooting", "medium"
    if any(word in lowered for word in ("price", "quote", "cost")):
        return "quote_request", "high"
    if any(word in lowered for word in ("complaint", "unhappy", "terrible")):
        return "complaint", "high"
    if any(word in lowered for word in ("add", "build", "feature", "custom")):
        return "project_request", "medium"
    if any(word in lowered for word in ("follow up", "following up", "status update")):
        return "follow_up", "medium"
    return "how_to", "low"


@app.post("/api/v1/inbox/drafts", response_model=EmailDraft)
async def create_email_draft(request: EmailInput) -> EmailDraft:
    email_id = f"email-{uuid4().hex[:8]}"
    category, risk = classify_email(f"{request.subject} {request.body}")
    knowledge = await call_knowledge(request.body)
    if knowledge.needs_human:
        reply = "Thanks for contacting us. We need a human specialist to verify this request before replying."
    else:
        reply = f"Hello,\n\n{knowledge.answer}\n\nPlease let us know if you need anything else."
    draft = EmailDraft(email_id=email_id, category=category, summary=request.subject, draft_reply=reply, risk=risk, sources=knowledge.sources)
    EMAILS[email_id] = {"input": request.model_dump(), "draft": draft.model_dump(), "review": None}
    return draft


@app.post("/api/v1/inbox/emails/{email_id}/review")
def review_email(email_id: str, request: EmailReview) -> dict:
    if email_id not in EMAILS:
        raise HTTPException(status_code=404, detail="Email not found")
    draft = EMAILS[email_id]["draft"]
    category = draft["category"]
    unchanged = request.final_reply.strip() == draft["draft_reply"].strip() and request.decision == "approved"
    AUTONOMY_COUNTS[category] = AUTONOMY_COUNTS.get(category, 0) + 1 if unchanged else 0
    EMAILS[email_id]["review"] = request.model_dump()
    return {"email_id": email_id, "status": "recorded", "unchanged": unchanged, "review": request.model_dump()}


@app.get("/api/v1/inbox/emails")
def list_emails() -> list[dict]:
    return list(EMAILS.values())


@app.get("/api/v1/inbox/autonomy")
def inbox_autonomy() -> list[dict]:
    result = []
    for category, count in sorted(AUTONOMY_COUNTS.items()):
        safe_category = category == "how_to"
        result.append({
            "category": category,
            "consecutive_unchanged": count,
            "eligible_after": 20,
            "autonomous_send_enabled": safe_category and count >= 20,
        })
    return result


def build_scope(project_id: str, transcript: str, version: int) -> ScopePackage:
    lowered = transcript.lower()
    requirements: list = []
    if "search" in lowered:
        requirements.append({"id": "REQ-001", "description": "Improve product search", "source_excerpt": "search", "status": "confirmed", "priority": "must_have", "feasibility": "needs_check", "acceptance_criteria": ["Customers can find products using agreed search behavior."]})
    if "filter" in lowered:
        filter_description = "Add brand filters" if "brand" in lowered else "Add product filters"
        requirements.append({"id": "REQ-002", "description": filter_description, "source_excerpt": "filter", "status": "confirmed", "priority": "should_have", "feasibility": "needs_check", "acceptance_criteria": ["Customers can filter results by agreed attributes."]})
    mobile_removed = "remove mobile" in lowered or "no longer need mobile" in lowered
    if "mobile" in lowered and not mobile_removed:
        requirements.append({"id": "REQ-003", "description": "Improve mobile experience", "source_excerpt": "mobile", "status": "confirmed", "priority": "should_have", "feasibility": "needs_check", "acceptance_criteria": ["The agreed flow works on a mobile viewport."]})
    tasks = [{"description": "Requirements and technical design", "low_hours": 2, "likely_hours": 4, "high_hours": 7}, {"description": "Implementation and testing", "low_hours": 6, "likely_hours": 12, "high_hours": 20}]
    return ScopePackage(project_id=project_id, version=version, objective="Improve the client's website experience", requirements=requirements, estimate_tasks=tasks, proposal_text="This proposal is a draft and requires human approval before it can be sent.")


@app.post("/api/v1/scope/projects/{project_id}/meetings", response_model=ScopePackage)
async def create_scope(project_id: str, request: MeetingInput) -> ScopePackage:
    package = build_scope(project_id, request.transcript, 1)
    for requirement in package.requirements:
        evidence = await call_knowledge(requirement.description)
        requirement.feasibility = "existing_feature_with_limitation" if evidence.sources else "needs_clarification"
    PROJECTS[project_id] = package
    return package


@app.get("/api/v1/scope/projects/{project_id}", response_model=ScopePackage)
def get_scope(project_id: str) -> ScopePackage:
    if project_id not in PROJECTS:
        raise HTTPException(status_code=404, detail="Project not found")
    return PROJECTS[project_id]


@app.post("/api/v1/scope/projects/{project_id}/follow-up", response_model=FollowUpResult)
async def follow_up(project_id: str, request: MeetingInput) -> FollowUpResult:
    if project_id not in PROJECTS:
        raise HTTPException(status_code=404, detail="Project not found")
    old = PROJECTS[project_id]
    new = build_scope(project_id, request.transcript, old.version + 1)
    old_ids = {item.id: item.description for item in old.requirements}
    new_ids = {item.id: item.description for item in new.requirements}
    changes: list[ScopeChange] = []
    for req_id in sorted(old_ids.keys() - new_ids.keys()):
        changes.append(ScopeChange(change_type="removed", description=old_ids[req_id]))
    for req_id in sorted(new_ids.keys() - old_ids.keys()):
        changes.append(ScopeChange(change_type="added", description=new_ids[req_id]))
    for req_id in sorted(old_ids.keys() & new_ids.keys()):
        if old_ids[req_id] != new_ids[req_id]:
            changes.append(ScopeChange(change_type="modified", description=f"{old_ids[req_id]} changed to {new_ids[req_id]}"))
    if "analytics" in request.transcript.lower():
        changes.append(ScopeChange(change_type="out_of_scope", description="Analytics dashboard was not in the approved baseline."))
    if not changes:
        changes.append(ScopeChange(change_type="unchanged", description="No baseline changes detected."))
    PROJECTS[project_id] = new
    return FollowUpResult(package=new, changes=changes)


@app.post("/api/v1/scope/projects/{project_id}/approve", response_model=ScopePackage)
def approve_scope(project_id: str, request: ScopeApproval) -> ScopePackage:
    if project_id not in PROJECTS:
        raise HTTPException(status_code=404, detail="Project not found")
    package = PROJECTS[project_id]
    if package.version != request.version:
        raise HTTPException(status_code=409, detail="Only the current scope version can be approved")
    approved = package.model_copy(update={"approval_status": "approved"})
    PROJECTS[project_id] = approved
    return approved
