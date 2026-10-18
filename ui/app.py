"""Run with: streamlit run ui/app.py."""

import sys
from pathlib import Path
from urllib.parse import quote, urlsplit

import streamlit as st

# Streamlit's script runner may only add ui/ to the import path.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ui.client import APIClient, APIError  # noqa: E402
from ui.theme import apply_theme, render_hero


st.set_page_config(page_title="AI Tech Consultant", page_icon="◈", layout="wide")
apply_theme()


def request(client, method, path, *, result_key, payload=None):
    """Clear old output before a request, including ambiguous network failures."""
    st.session_state[result_key] = None
    try:
        with st.spinner("Working with the API…"):
            result = client.request(method, "/api/v1" + path, json=payload)
        st.session_state[result_key] = result
        return result
    except APIError as exc:
        st.error("The API request could not be completed.")
        st.write(str(exc))
        return None


def sources(items):
    st.subheader("Supporting evidence")
    if not items:
        st.info("No supporting sources were returned. Verify the answer with a specialist.")
    for index, item in enumerate(items or [], 1):
        title = str(item.get("title") or "Untitled source")
        with st.expander(f"{index:02d} · {title[:80]}"):
            st.write(item.get("excerpt", "No excerpt available."))
            url = str(item.get("url", ""))
            try:
                parsed = urlsplit(url)
                host = (parsed.hostname or "").lower().rstrip(".")
                safe = parsed.scheme.lower() in {"http", "https"} and bool(host)
                safe = safe and not parsed.username and not parsed.password
            except ValueError:
                host, safe = "", False
            if host == "example" or host.endswith(".example"):
                st.warning("Demo fixture (.example) — not real evidence.")
            if safe:
                st.link_button("Open source", url)
            elif url:
                st.caption("Source link omitted: only valid HTTP(S) URLs are supported.")


def knowledge(client):
    st.title("Knowledge Brain")
    intro, guidance = st.columns([3, 2])
    intro.write("A focused question. A traceable answer.")
    guidance.caption("Start with a product or workflow question, then inspect the evidence before using the answer.")
    with st.form("knowledge_question"):
        st.caption("01 / ASK THE KNOWLEDGE BASE")
        question = st.text_area("Your question", placeholder="How can a customer update their website logo, and what limitations apply?", height=130)
        limit = st.slider("Maximum sources", 1, 10, 3)
        submitted = st.form_submit_button("Find answer & evidence", type="primary")
    if submitted:
        st.session_state.knowledge_result = None
        if len(question.strip()) < 3:
            st.warning("Enter a question of at least three characters.")
        else:
            request(client, "POST", "/knowledge/query", result_key="knowledge_result",
                    payload={"question": question.strip(), "max_sources": limit})
    result = st.session_state.get("knowledge_result")
    if result is None:
        st.info("Your answer and evidence will appear here after a successful query.")
        return
    st.subheader("Answer")
    if result.get("needs_human") or result.get("status") == "insufficient_evidence":
        st.warning("Human verification needed: the available evidence is insufficient.")
    st.write(result.get("answer", "No answer returned."))
    if result.get("escalation_id"):
        st.caption("Escalation reference")
        st.write(result["escalation_id"])
    sources(result.get("sources", []))


def inbox(client):
    st.title("Inbox Review")
    intro, guidance = st.columns([3, 2])
    intro.write("Move from incoming question to reviewed reply.")
    guidance.caption("Prepare a draft, inspect its sources, then record your decision. No email is sent here.")
    with st.form("email_input"):
        st.caption("01 / INCOMING EMAIL")
        sender = st.text_input("From address", placeholder="customer@company.com")
        subject = st.text_input("Subject", placeholder="Help updating our website logo")
        body = st.text_area("Email body", height=160, placeholder="Paste the customer's message, including the question and any relevant context…")
        submitted = st.form_submit_button("Prepare reply for review", type="primary")
    if submitted:
        st.session_state.inbox_result = None
        st.session_state.review_result = None
        if not sender.strip() or not subject.strip() or len(body.strip()) < 3:
            st.warning("Provide the sender, subject, and an email body of at least three characters.")
        else:
            request(client, "POST", "/inbox/drafts", result_key="inbox_result", payload={
                "from_address": sender.strip(), "subject": subject.strip(), "body": body.strip()})
    draft = st.session_state.get("inbox_result")
    if draft:
        email_id = str(draft["email_id"])
        attempted = st.session_state.setdefault("review_attempts", set())
        locked = email_id in attempted
        st.subheader("Review the proposed reply")
        left, right = st.columns(2)
        left.caption("Category")
        left.write(draft.get("category", "Unknown"))
        right.caption("Rule-based risk flag · not a calibrated probability")
        right.write(draft.get("risk", "Unknown"))
        sources(draft.get("sources", []))
        with st.form("review_" + email_id):
            st.caption("02 / HUMAN REVIEW")
            final = st.text_area("Final reply", value=draft.get("draft_reply", ""), height=200,
                                 disabled=locked)
            decision = st.selectbox("Decision", ["approved", "edited", "rejected", "escalated"],
                                    disabled=locked)
            reason = st.text_area("Correction or escalation reason", placeholder="Explain any correction, missing evidence, or reason for escalation…", disabled=locked)
            reviewed = st.form_submit_button("Record review", type="primary", disabled=locked)
        if reviewed and not locked:
            st.session_state.review_result = None
            if len(final.strip()) < 3:
                st.warning("The API requires a final reply of at least three characters for every decision.")
            elif decision == "approved" and final.strip() != draft.get("draft_reply", "").strip():
                st.warning("Choose 'edited' when changing the draft reply.")
            else:
                # Lock before sending: a lost response must not permit count-inflating retries.
                attempted.add(email_id)
                receipt = request(client, "POST", f"/inbox/emails/{quote(email_id, safe='')}/review",
                                  result_key="review_result", payload={"final_reply": final.strip(),
                                  "decision": decision, "correction_reason": reason.strip() or None})
                st.session_state.autonomy_result = None
                if receipt is None:
                    st.session_state.inbox_result = None
                    st.warning("Review outcome is unconfirmed. This draft is locked against resubmission; check backend records before taking further action.")
                else:
                    st.rerun()
        if locked:
            st.caption("Review submission is locked for this draft to prevent duplicate counting.")
    elif not st.session_state.get("review_result"):
        st.info("Paste an incoming email to prepare a draft for review.")
    if st.session_state.get("review_result"):
        st.success("Review recorded. No email was sent.")
    with st.expander("Autonomy policy status"):
        st.caption("Backend counters and eligibility flags only. This screen does not send email.")
        if st.button("Refresh policy status"):
            request(client, "GET", "/inbox/autonomy", result_key="autonomy_result")
        policy = st.session_state.get("autonomy_result")
        if policy:
            st.dataframe(policy, hide_index=True, width="stretch")
        else:
            st.caption("No policy data loaded, or no review categories recorded yet.")


def scope_package(package, changes):
    st.subheader("Scope workspace")
    st.write("Project:", package.get("project_id"), "· Version:", package.get("version"),
             "· Status:", package.get("approval_status", "draft"))
    st.write(package.get("objective", ""))
    requirements_tab, effort_tab, changes_tab = st.tabs([
        "Requirements", "Effort & proposal", "Change report"])
    with requirements_tab:
        st.caption("Review the extracted requirements against the meeting context before approval.")
        requirements = package.get("requirements", [])
        if requirements:
            st.dataframe(requirements, hide_index=True, width="stretch")
        else:
            st.warning("No requirements extracted. Clarify the transcript before approving.")
    with effort_tab:
        st.subheader("Indicative effort")
        st.warning("Placeholder estimates only. These are demonstration tasks, not validated delivery commitments or a quote.")
        tasks = package.get("estimate_tasks", [])
        if tasks:
            st.dataframe(tasks, hide_index=True, width="stretch")
        else:
            st.caption("No estimates available.")
        st.subheader("Proposal draft")
        st.write(package.get("proposal_text", "No proposal text returned."))
    with changes_tab:
        st.caption("Compare the current scope with the follow-up meeting's extracted requirements.")
        if changes:
            st.dataframe(changes, hide_index=True, width="stretch")
        else:
            st.info("No follow-up comparison loaded. Process a follow-up meeting to review changes here.")


def scope(client):
    st.title("Scope Builder")
    intro, guidance = st.columns([3, 2])
    intro.write("Shape meeting context into a reviewable scope.")
    guidance.caption("Create a first version, compare follow-up changes, or return to an existing project.")
    with st.form("meeting_input"):
        st.caption("01 / PROJECT & MEETING CONTEXT")
        project = st.text_input("Project ID", placeholder="website-refresh")
        action = st.selectbox("Action", ["Create initial scope", "Process follow-up", "Load current scope"])
        col1, col2 = st.columns(2)
        meeting = col1.text_input("Meeting ID", placeholder="meeting-01")
        parent = col2.text_input("Parent meeting ID (optional)", placeholder="meeting-01 for a linked follow-up")
        transcript = st.text_area("Paste transcript", height=180, placeholder="Paste meeting notes with the project objective, requested features, constraints, and full current scope context…")
        upload = st.file_uploader("Or upload a UTF-8 .txt transcript", type=["txt"])
        st.caption("An uploaded file takes precedence over pasted text. Follow-ups replace the extracted requirement set; include the full current scope context.")
        submitted = st.form_submit_button("Create, compare or load scope", type="primary")
    if submitted:
        st.session_state.scope_result = None
        st.session_state.scope_approval = None
        text = transcript.strip()
        valid = True
        if upload is not None and action != "Load current scope":
            try:
                text = upload.getvalue().decode("utf-8-sig").strip()
            except UnicodeDecodeError:
                st.error("This file is not UTF-8 text. Save it as UTF-8 and upload again.")
                valid = False
        if not project.strip():
            st.warning("Enter a project ID.")
        elif valid:
            path = f"/scope/projects/{quote(project.strip(), safe='')}"
            if action == "Load current scope":
                request(client, "GET", path, result_key="scope_result")
            elif not meeting.strip() or len(text) < 10:
                st.warning("Provide a meeting ID and a transcript of at least ten characters.")
            else:
                suffix = "/follow-up" if action == "Process follow-up" else "/meetings"
                request(client, "POST", path + suffix, result_key="scope_result", payload={
                    "project_id": project.strip(), "meeting_id": meeting.strip(),
                    "transcript": text, "parent_meeting_id": parent.strip() or None})
    result = st.session_state.get("scope_result")
    if result is None:
        st.info("Create a scope from meeting notes, or load an existing project by its ID.")
        return
    package = result.get("package", result)
    scope_package(package, result.get("changes", []))
    approved = package.get("approval_status") == "approved"
    st.subheader("Version approval")
    st.caption("Review all three tabs before recording approval for this version. No proposal is sent.")
    with st.form("scope_approval_form"):
        reviewer = st.text_input("Reviewer name", placeholder="Name of the person approving this scope", disabled=approved)
        confirm = st.checkbox("I have reviewed this version and its placeholder estimates.", disabled=approved)
        approve = st.form_submit_button("Approve this version", disabled=approved, type="primary")
    if approve:
        st.session_state.scope_approval = None
        if not confirm or len(reviewer.strip()) < 2:
            st.warning("Confirm your review and enter a reviewer name of at least two characters.")
        else:
            path = f"/scope/projects/{quote(str(package['project_id']), safe='')}/approve"
            st.session_state.scope_result = None
            result = request(client, "POST", path, result_key="scope_approval", payload={
                "version": package["version"], "reviewer": reviewer.strip()})
            if result is not None:
                st.session_state.scope_result = result
                st.rerun()
            else:
                st.warning("Approval is unconfirmed. Load the current scope to check its status.")
    if approved:
        st.success("This scope version is approved in the backend. No proposal was sent.")


def main():
    with st.sidebar:
        st.title("◈ Consultant")
        st.caption("RESEARCH · REVIEW · SCOPE")
        screen = st.radio("Workspace", ["Knowledge Brain", "Inbox Review", "Scope Builder"])
        st.divider()
        st.caption("API CONNECTION")
        base_url = st.text_input("API URL", value="http://127.0.0.1:8000").strip().rstrip("/")
        refresh = st.button("Check connection")
    try:
        parsed = urlsplit(base_url)
        valid = parsed.scheme in {"http", "https"} and bool(parsed.hostname)
    except ValueError:
        valid = False
    if not valid:
        st.error("Enter a valid HTTP(S) API URL in the sidebar.")
        st.stop()
    if st.session_state.get("connected_url") != base_url:
        for key in ("health_result", "knowledge_result", "inbox_result", "review_result",
                    "autonomy_result", "scope_result", "scope_approval", "review_attempts"):
            st.session_state.pop(key, None)
        st.session_state.connected_url = base_url
        refresh = True
    try:
        client = APIClient(base_url)
    except APIError as exc:
        st.error(str(exc))
        st.stop()
    with st.sidebar:
        if refresh:
            request(client, "GET", "/health", result_key="health_result")
        health = st.session_state.get("health_result")
        if health:
            st.caption("API status · " + str(health.get("status", "Unknown")))
        else:
            st.caption("API unavailable · check the URL and start the backend.")
        with st.expander("Backend details"):
            if health:
                st.caption("Knowledge backend · reported by API")
                st.write(health.get("ai_backend", "Not reported"))
            st.caption("Inbox classification and scope extraction currently use rule-based logic.")
    render_hero()
    st.caption("CONSULTANT WORKSPACE / " + screen.upper())
    try:
        {"Knowledge Brain": knowledge, "Inbox Review": inbox, "Scope Builder": scope}[screen](client)
    finally:
        client.close()


if __name__ == "__main__":
    main()
