from typing import Literal

from pydantic import BaseModel, Field


class Source(BaseModel):
    article_id: str
    title: str
    url: str
    relevance: float
    excerpt: str


class KnowledgeQuery(BaseModel):
    question: str = Field(min_length=3)
    max_sources: int = Field(default=3, ge=1, le=10)


class KnowledgeAnswer(BaseModel):
    answer: str
    status: Literal["answered", "insufficient_evidence"]
    confidence: float
    sources: list[Source] = []
    needs_human: bool
    escalation_id: str | None = None


class EscalationResolve(BaseModel):
    approved_answer: str = Field(min_length=3)


class EmailInput(BaseModel):
    from_address: str
    subject: str
    body: str = Field(min_length=3)


class EmailDraft(BaseModel):
    email_id: str
    category: str
    summary: str
    draft_reply: str
    risk: Literal["low", "medium", "high"]
    sources: list[Source] = []
    requires_human_approval: bool = True


class EmailReview(BaseModel):
    final_reply: str = Field(min_length=3)
    decision: Literal["approved", "edited", "rejected", "escalated"]
    correction_reason: str | None = None


class MeetingInput(BaseModel):
    project_id: str
    meeting_id: str
    transcript: str = Field(min_length=10)
    parent_meeting_id: str | None = None


class Requirement(BaseModel):
    id: str
    description: str
    source_excerpt: str
    status: Literal["confirmed", "unclear"]
    priority: Literal["must_have", "should_have", "optional"]
    feasibility: str
    acceptance_criteria: list[str]


class EstimateTask(BaseModel):
    description: str
    low_hours: float
    likely_hours: float
    high_hours: float


class ScopePackage(BaseModel):
    project_id: str
    version: int
    objective: str
    requirements: list[Requirement]
    estimate_tasks: list[EstimateTask]
    proposal_text: str
    approval_status: Literal["draft", "approved"] = "draft"


class ScopeChange(BaseModel):
    change_type: Literal["added", "removed", "modified", "unchanged", "out_of_scope"]
    description: str


class FollowUpResult(BaseModel):
    package: ScopePackage
    changes: list[ScopeChange]
    requires_human_approval: bool = True


class ScopeApproval(BaseModel):
    version: int = Field(ge=1)
    reviewer: str = Field(min_length=2)
