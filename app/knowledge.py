from dataclasses import dataclass
import re
from uuid import uuid4

from .ai.backend import AIBackendError, get_backend
from .models import EscalationResolve, KnowledgeAnswer, KnowledgeQuery, Source


@dataclass(frozen=True)
class Article:
    id: str
    title: str
    url: str
    body: str


ARTICLES = [
    Article("kb-001", "Changing the website logo", "https://support.example/logo", "Open Design Settings, choose Logo, upload the new image, and save your changes."),
    Article("kb-002", "Website search settings", "https://support.example/search", "Search filters can be configured from Website Settings and assigned to product attributes."),
    Article("kb-003", "Payment troubleshooting", "https://support.example/payments", "Check the payment provider credentials, webhook status, and provider logs before retrying a failed payment."),
    Article("kb-004", "Account cancellation", "https://support.example/cancel", "Account cancellation requests require human review. The knowledge base does not authorize refunds."),
    Article("kb-005", "Mobile layout settings", "https://support.example/mobile", "The responsive layout can be adjusted from Design Settings. Custom mobile behavior may require development."),
]

ESCALATIONS: dict[str, dict] = {}


def _score(question: str, article: Article) -> float:
    stop_words = {"how", "what", "where", "when", "does", "can", "the", "for", "with", "from", "should", "this", "that", "policy", "process", "system", "platform"}
    words = {word.strip("?,.!'").lower() for word in question.split() if len(word) > 2 and word.strip("?,.!'").lower() not in stop_words}
    haystack = f"{article.title} {article.body}".lower()
    haystack_words = set(re.findall(r"[a-z0-9]+", haystack))
    title_words = set(re.findall(r"[a-z0-9]+", article.title.lower()))
    matches = sum(word in haystack_words for word in words)
    title_bonus = sum(word in title_words for word in words) * 0.5
    return round((matches + title_bonus) / max(len(words), 1), 2)


def search(question: str, limit: int = 3) -> list[Source]:
    ranked = sorted(((article, _score(question, article)) for article in ARTICLES), key=lambda item: item[1], reverse=True)
    return [Source(article_id=a.id, title=a.title, url=a.url, relevance=score, excerpt=a.body) for a, score in ranked[:limit] if score >= 0.2]


def query(request: KnowledgeQuery) -> KnowledgeAnswer:
    sources = search(request.question, request.max_sources)
    if not sources:
        escalation_id = f"esc-{uuid4().hex[:8]}"
        ESCALATIONS[escalation_id] = {"question": request.question, "status": "open"}
        return KnowledgeAnswer(
            answer="I could not find enough evidence in the knowledge base to answer safely.",
            status="insufficient_evidence",
            confidence=0.05,
            needs_human=True,
            escalation_id=escalation_id,
        )
    try:
        answer = get_backend().answer(request.question, [source.excerpt for source in sources])
    except AIBackendError:
        # Do not fabricate a response when the real Claude provider is unavailable.
        escalation_id = f"esc-{uuid4().hex[:8]}"
        ESCALATIONS[escalation_id] = {"question": request.question, "status": "open", "reason": "ai_provider_unavailable"}
        return KnowledgeAnswer(
            answer="The AI provider is unavailable. A human must review this question.",
            status="insufficient_evidence",
            confidence=0.0,
            sources=sources,
            needs_human=True,
            escalation_id=escalation_id,
        )
    best = sources[0]
    return KnowledgeAnswer(
        answer=answer,
        status="answered",
        confidence=min(0.95, round(0.55 + best.relevance * 0.4, 2)),
        sources=sources,
        needs_human=False,
    )


def resolve(escalation_id: str, request: EscalationResolve) -> dict:
    escalation = ESCALATIONS.get(escalation_id)
    if not escalation:
        raise KeyError(escalation_id)
    escalation.update(status="resolved", approved_answer=request.approved_answer)
    return {"id": escalation_id, **escalation}
