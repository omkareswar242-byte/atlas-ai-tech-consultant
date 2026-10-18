import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Check, CheckCheck, ChevronRight, FilePenLine, Inbox as InboxIcon, LockKeyhole, Mail, Plus, RefreshCw, Search, Send, ShieldCheck, Sparkles, X } from 'lucide-react';
import { api } from '../api';
import { ConfirmDialog, EmptyState, Loading, SourceCitation } from '../components/Common';
import './inbox.css';
const filters = ['All', 'Needs Review', 'Approved', 'Rejected', 'Sent'];
const samples = [
    { label: 'How-to · account setup', input: { from_address: 'alex@customer.example', subject: 'How do I get started?', body: 'Hello! How do I create an account and get started with the platform? Could you share the setup instructions?' } },
    { label: 'Troubleshooting · failed login', input: { from_address: 'sam@customer.example', subject: 'Login is not working', body: 'My login has failed several times today. I see an error when signing in. What should I try to restore access?' } },
    { label: 'High risk · refund request', input: { from_address: 'jordan@customer.example', subject: 'Refund and cancellation request', body: 'I would like to cancel my subscription and request a refund for the latest charge. Please confirm the applicable policy before proceeding.' } },
];
const blankInput = { from_address: '', subject: '', body: '' };
// Keep only uncertain record IDs across page navigation; email contents are never persisted.
const uncertainReviewIds = new Set();
const label = (value) => value.replaceAll('_', ' ');
const messageOf = (error) => error instanceof Error ? error.message : 'The request could not be completed.';
const outcome = (record) => !record.review ? 'Needs review' : record.review.decision === 'edited' ? 'Edited & reviewed' : label(record.review.decision);
const initials = (email) => email.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || 'EM';
export default function Inbox({ notify, log, onRefresh }) {
    const reducedMotion = useReducedMotion();
    const [records, setRecords] = useState([]);
    const [autonomy, setAutonomy] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [filter, setFilter] = useState('All');
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [autonomyError, setAutonomyError] = useState('');
    const [reply, setReply] = useState('');
    const [reason, setReason] = useState('');
    const [showGenerated, setShowGenerated] = useState(false);
    const [compose, setCompose] = useState(false);
    const [input, setInput] = useState(blankInput);
    const [sample, setSample] = useState('');
    const [drafting, setDrafting] = useState(false);
    const [draftError, setDraftError] = useState('');
    const [draftUncertain, setDraftUncertain] = useState(false);
    const [reviewing, setReviewing] = useState(false);
    const [uncertainIds, setUncertainIds] = useState(() => new Set(uncertainReviewIds));
    const [confirmation, setConfirmation] = useState(null);
    const requestLock = useRef(false);
    const composeCloseRef = useRef(null);
    const composeTriggerRef = useRef(null);
    const selected = records.find(record => record.draft.email_id === selectedId);
    async function loadRecords() {
        const next = await api.emails();
        setRecords(next);
        setSelectedId(current => next.some(record => record.draft.email_id === current) ? current : next[0]?.draft.email_id ?? null);
        return next;
    }
    async function loadAutonomy() {
        try {
            setAutonomy(await api.autonomy());
            setAutonomyError('');
        }
        catch (err) {
            setAutonomyError(messageOf(err));
        }
    }
    async function refresh(announce = true) {
        setLoading(true);
        setError('');
        try {
            await Promise.all([loadRecords(), loadAutonomy()]);
            if (announce) {
                notify('Inbox records refreshed.', 'info');
                log('Inbox refreshed', 'Fetched email records and approval progress from the backend.', 'inbox');
            }
        }
        catch (err) {
            setError(messageOf(err));
            if (announce)
                notify('Could not refresh inbox records.', 'error');
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => { void refresh(false); }, []);
    useEffect(() => {
        setReply(selected?.review?.final_reply ?? selected?.draft.draft_reply ?? '');
        setReason(selected?.review?.correction_reason ?? '');
        setShowGenerated(false);
    }, [selectedId, selected?.review?.decision, selected?.review?.final_reply]);
    useEffect(() => {
        if (!compose)
            return;
        const previousFocus = document.activeElement;
        composeCloseRef.current?.focus();
        return () => { previousFocus?.focus(); };
    }, [compose]);
    const counts = useMemo(() => ({
        All: records.length,
        'Needs Review': records.filter(record => !record.review).length,
        Approved: records.filter(record => record.review?.decision === 'approved' || record.review?.decision === 'edited').length,
        Rejected: records.filter(record => record.review?.decision === 'rejected').length,
        Sent: 0,
    }), [records]);
    const visible = useMemo(() => records.filter(record => {
        if (filter === 'Sent')
            return false;
        if (filter === 'Needs Review' && record.review)
            return false;
        if (filter === 'Approved' && record.review?.decision !== 'approved' && record.review?.decision !== 'edited')
            return false;
        if (filter === 'Rejected' && record.review?.decision !== 'rejected')
            return false;
        return `${record.input.from_address} ${record.input.subject} ${record.input.body} ${record.draft.category}`.toLowerCase().includes(query.toLowerCase());
    }), [records, filter, query]);
    const active = visible.find(record => record.draft.email_id === selectedId);
    const locked = !active || !!active.review || uncertainIds.has(active.draft.email_id) || reviewing || loading;
    const changed = !!active && reply.trim() !== active.draft.draft_reply.trim();
    const progress = autonomy.find(item => item.category === active?.draft.category);
    const pendingCount = counts['Needs Review'];
    function requestReview(decision) {
        if (!active || locked)
            return;
        setConfirmation({ id: active.draft.email_id, review: { decision, final_reply: reply.trim(), correction_reason: reason.trim() || null } });
    }
    async function confirmReview() {
        if (!confirmation || requestLock.current || uncertainIds.has(confirmation.id))
            return;
        const pending = confirmation;
        if (records.find(record => record.draft.email_id === pending.id)?.review) {
            setConfirmation(null);
            return;
        }
        requestLock.current = true;
        setReviewing(true);
        try {
            const result = await api.review(pending.id, pending.review);
            setRecords(previous => previous.map(record => record.draft.email_id === result.email_id ? { ...record, review: result.review } : record));
            notify(`Review recorded: ${label(result.review.decision)}. No email was sent.`, 'success');
            log('Email review recorded', `${pending.id} · ${label(result.review.decision)} · no email sent`, 'inbox');
            await loadAutonomy();
            onRefresh?.();
        }
        catch (err) {
            uncertainReviewIds.add(pending.id);
            setUncertainIds(previous => new Set(previous).add(pending.id));
            setError(`Review outcome needs verification. ${messageOf(err)} This email is locked to prevent a duplicate review.`);
            notify('Review outcome uncertain. Checking backend records; this action will not be retried.', 'error');
            log('Email review needs verification', `${pending.id} · request failed; automatic retry disabled.`, 'error');
            try {
                const next = await loadRecords();
                const saved = next.find(record => record.draft.email_id === pending.id)?.review;
                if (saved) {
                    setError('The backend confirms this email has a recorded review. No email was sent.');
                    notify('Recorded review verified from backend records.', 'info');
                }
                await loadAutonomy();
            }
            catch {
                setError('The review request and verification failed. This email remains locked. Refresh to check backend records; do not repeat the review.');
            }
        }
        finally {
            requestLock.current = false;
            setReviewing(false);
            setConfirmation(null);
        }
    }
    async function createDraft(event) {
        event.preventDefault();
        if (requestLock.current || draftUncertain)
            return;
        requestLock.current = true;
        setDrafting(true);
        setDraftError('');
        try {
            const submitted = { from_address: input.from_address.trim(), subject: input.subject.trim(), body: input.body.trim() };
            const draft = await api.draft(submitted);
            setRecords(previous => [{ input: submitted, draft, review: null }, ...previous.filter(record => record.draft.email_id !== draft.email_id)]);
            setSelectedId(draft.email_id);
            setFilter('All');
            setQuery('');
            setCompose(false);
            setInput(blankInput);
            setSample('');
            notify('Draft created by the backend. Human review required.', 'success');
            log('Email draft created', `${draft.email_id} · ${label(draft.category)} · awaiting human review`, 'inbox');
            onRefresh?.();
            composeTriggerRef.current?.focus();
        }
        catch (err) {
            setDraftUncertain(true);
            setDraftError(`Draft creation could not be confirmed. ${messageOf(err)} Check refreshed inbox records before starting another draft.`);
            notify('Draft request uncertain. No automatic retry was made.', 'error');
            log('Draft request needs verification', 'Draft request failed; fetching records without repeating the request.', 'error');
            try {
                await loadRecords();
            }
            catch {
                setError('Could not verify draft records. Refresh the inbox when the backend is available.');
            }
        }
        finally {
            requestLock.current = false;
            setDrafting(false);
        }
    }
    return <div className="inbox-page">
    <header className="page-header inbox-page-header">
      <div><div className="eyebrow">COMMUNICATIONS / HUMAN-IN-THE-LOOP</div><h1>Inbox <span className="inbox-heading-dot"/></h1><p className="muted">Thoughtful replies. Your final say.</p></div>
      <div className="row inbox-header-actions"><button className="button secondary" onClick={() => void refresh()} disabled={loading || drafting || reviewing}><RefreshCw size={15} className={loading ? 'inbox-spinning' : ''}/> Refresh</button><button ref={composeTriggerRef} className="button primary" onClick={() => { setCompose(true); setDraftError(''); setDraftUncertain(false); }} disabled={reviewing}><Plus size={16}/> New email</button></div>
    </header>
    <div className="inbox-context-strip"><span><span className="inbox-live-dot"/> Backend records</span><span><ShieldCheck size={14}/> Human approval required</span><span><LockKeyhole size={13}/> Email transport not connected</span></div>
    {error && <div className="notice inbox-error" role="alert">{error}</div>}
    <section className="inbox-workspace panel" aria-label="Email review workspace">
      <aside className="inbox-rail">
        <div className="inbox-rail-heading"><span className="inbox-icon-box"><InboxIcon size={19}/></span><div><strong>Your workspace</strong><span className="muted">Email review</span></div></div>
        <nav className="inbox-filters" aria-label="Filter emails">{filters.map(item => <button key={item} className={`inbox-filter ${filter === item ? 'is-active' : ''}`} onClick={() => setFilter(item)} aria-pressed={filter === item}><span>{item === 'All' ? <Mail size={16}/> : item === 'Needs Review' ? <FilePenLine size={16}/> : item === 'Approved' ? <CheckCheck size={16}/> : item === 'Rejected' ? <X size={16}/> : <Send size={16}/>}{item}</span><span className="inbox-count">{counts[item]}</span></button>)}</nav>
        <div className="inbox-rail-bottom"><div className="inbox-mini-label">REVIEW QUEUE</div><strong>{pendingCount} <span>awaiting your review</span></strong><div className="inbox-queue-track"><span style={{ width: `${records.length ? (records.length - pendingCount) / records.length * 100 : 0}%` }}/></div><p className="muted">{records.length - pendingCount} of {records.length} records reviewed</p><div className="inbox-rail-note"><ShieldCheck size={17}/><p>You stay in control.<br /><span className="muted">Reviews never send emails.</span></p></div></div>
      </aside>

      <section className="inbox-message-list" aria-label="Email list">
        <div className="inbox-list-heading"><h2>{filter}</h2><span className="badge">{visible.length}</span></div>
        <label className="inbox-search"><Search size={16}/><input type="search" aria-label="Search emails" placeholder="Search your inbox…" value={query} onChange={event => setQuery(event.target.value)}/></label>
        <div className="inbox-list-caption"><span>{filter === 'Sent' ? 'NO DELIVERY TRANSPORT' : 'BACKEND EMAIL RECORDS'}</span><ArrowDownLeft size={13}/></div>
        <div className="inbox-list-scroll">
          {loading && !records.length ? <Loading label="Loading inbox records…"/> : !visible.length ? <EmptyState title={filter === 'Sent' ? 'No emails sent' : query ? 'No matching emails' : 'A little breathing room'} description={filter === 'Sent' ? 'Email transport is not connected. Approving a draft records a review only.' : query ? 'Try a different sender, subject, or keyword.' : error ? 'The inbox could not be loaded. Use Refresh to try reading records again.' : 'Create an email draft or load an example input to begin a real backend review.'}/> : visible.map(record => <button key={record.draft.email_id} className={`inbox-message ${active?.draft.email_id === record.draft.email_id ? 'is-selected' : ''}`} onClick={() => setSelectedId(record.draft.email_id)} aria-pressed={active?.draft.email_id === record.draft.email_id}>
            <span className="inbox-message-top"><span className="inbox-avatar">{initials(record.input.from_address)}</span><span className="inbox-sender">{record.input.from_address}</span>{!record.review && <span className="inbox-unread-dot"/>}</span>
            <strong className="inbox-subject">{record.input.subject}</strong><span className="inbox-preview">{record.input.body}</span><span className="inbox-message-meta"><span className={`inbox-risk ${record.draft.risk}`}>{record.draft.risk} risk</span><span>{outcome(record)}</span></span>
          </button>)}
        </div>
        <div className="inbox-list-footer"><LockKeyhole size={12}/> Review workspace · no outbound delivery</div>
      </section>

      <main className="inbox-detail" aria-label="Selected email">
        <AnimatePresence mode="wait">{active ? <motion.div key={active.draft.email_id} className="inbox-detail-content" initial={reducedMotion ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.16 }}>
          <div className="inbox-detail-toolbar"><span className="inbox-detail-breadcrumb">Inbox <ChevronRight size={13}/> {label(active.draft.category)}</span><span className={`badge inbox-outcome ${active.review ? 'reviewed' : ''}`}>{active.review ? <Check size={12}/> : <span className="inbox-unread-dot"/>}{outcome(active)}</span></div>
          <div className="inbox-email-heading"><h2>{active.input.subject}</h2><div className="inbox-sender-block"><span className="inbox-avatar large">{initials(active.input.from_address)}</span><div><strong>{active.input.from_address}</strong><div className="muted">Incoming email {active.input.from_address.toLowerCase().endsWith('.example') && <span className="inbox-fixture-label">Example input</span>}</div></div></div></div>
          <div className="inbox-original-body">{active.input.body}</div>
          <div className="inbox-draft-card">
            <div className="inbox-draft-header"><div><span className="inbox-spark"><Sparkles size={16}/></span><strong>{active.review ? 'Reviewed reply' : 'Suggested reply'}</strong><span className="inbox-ai-label">BACKEND DRAFT</span></div><span className={`inbox-risk ${active.draft.risk}`}>{active.draft.risk} risk</span></div>
            <div className="inbox-draft-context"><span>{label(active.draft.category)}</span><span>Human review always required</span></div>
            {active.review && <div className="inbox-version-tabs" role="group" aria-label="Reply version"><button className={!showGenerated ? 'is-active' : ''} onClick={() => setShowGenerated(false)}>Recorded {active.review.decision === 'edited' ? 'edit' : 'review'}</button><button className={showGenerated ? 'is-active' : ''} onClick={() => setShowGenerated(true)}>Original generated draft</button></div>}
            <label className="inbox-reply-label" htmlFor="inbox-reply">{showGenerated ? 'Original generated draft' : active.review ? 'Recorded final reply' : changed ? 'Your edited reply · unsaved' : 'Generated reply · editable'}</label>
            <textarea id="inbox-reply" className="textarea inbox-reply" value={showGenerated ? active.draft.draft_reply : reply} onChange={event => setReply(event.target.value)} readOnly={locked || showGenerated} rows={8} spellCheck/>
            {!active.review && <label className="field inbox-reason"><span>Review note <span className="muted">(optional)</span></span><textarea className="textarea" rows={2} placeholder="Why did you change or reject this reply?" value={reason} disabled={locked} onChange={event => setReason(event.target.value)}/></label>}
            {!!active.review?.correction_reason && <div className="inbox-recorded-note"><strong>Review note</strong><p>{active.review.correction_reason}</p></div>}
            {uncertainIds.has(active.draft.email_id) && !active.review && <div className="notice" role="status">This review has an uncertain outcome and is locked. Refresh to inspect backend records. No automatic retry will occur.</div>}
            {active.review ? <div className="inbox-recorded"><ShieldCheck size={16}/><span>Decision recorded: <strong>{label(active.review.decision)}</strong>. No email was sent.</span></div> : <div className="inbox-review-actions"><button className="button ghost inbox-reject" disabled={locked} onClick={() => requestReview('rejected')}><X size={15}/> Reject</button><div className="row"><button className="button secondary" disabled={locked || !changed || !reply.trim()} onClick={() => requestReview('edited')}><FilePenLine size={15}/> Save edit</button><button className="button primary" disabled={locked || changed || !reply.trim()} onClick={() => requestReview('approved')}><Check size={16}/> Approve review</button></div></div>}
            {!active.review && changed && <p className="inbox-action-hint muted">Your reply differs from the generated draft. Use “Save edit” to record your reviewed version.</p>}
          </div>

          <section className="inbox-sources" aria-label="Draft evidence"><div className="inbox-section-heading"><h3>Grounded in your knowledge</h3><span className="muted">{active.draft.sources.length} source{active.draft.sources.length === 1 ? '' : 's'}</span></div>{active.draft.sources.length ? active.draft.sources.map((source, index) => <div key={`${source.article_id}-${index}`} className="inbox-source"><SourceCitation source={source}/>{(() => { try {
            return new URL(source.url).hostname.endsWith('.example');
        }
        catch {
            return false;
        } })() && <span className="inbox-fixture-label">Fixture source · .example</span>}</div>) : <p className="muted inbox-no-sources">No supporting sources returned. Verify this reply with a human specialist.</p>}</section>
          <div className="inbox-bottom-grid"><section className="inbox-autonomy"><div className="inbox-section-heading"><h3><ShieldCheck size={15}/> Approval progress</h3><span className="inbox-backend-label">BACKEND STATE</span></div>{autonomyError ? <p className="muted" role="status">Approval progress unavailable: {autonomyError}</p> : progress ? <><div className="inbox-progress-value"><strong>{progress.consecutive_unchanged}<span> / {progress.eligible_after}</span></strong><span className="muted">consecutive unchanged approvals</span></div><div className="inbox-queue-track"><span style={{ width: `${Math.min(100, progress.eligible_after > 0 ? progress.consecutive_unchanged / progress.eligible_after * 100 : 0)}%` }}/></div><p className="muted">Backend eligibility: {progress.autonomous_send_enabled ? 'eligible' : 'not eligible'}. This is approval history, not sent emails. Eligibility never enables sending here.</p></> : <p className="muted">No approval history returned for this category. Counts appear after a backend review.</p>}</section><section className="inbox-transport"><span className="inbox-transport-icon"><Send size={18}/></span><h3>Ready for your next move.</h3><p className="muted">Approvals are recorded only. Delivery requires an email transport.</p><button className="button secondary" disabled title="Email transport is not connected"><LockKeyhole size={13}/> Send unavailable <ArrowUpRight size={13}/></button></section></div>
        </motion.div> : <div className="inbox-detail-empty"><span className="inbox-empty-icon"><Mail size={32} strokeWidth={1.2}/></span><EmptyState title={filter === 'Sent' ? 'Reviews are not deliveries.' : 'Make room for a better reply.'} description={filter === 'Sent' ? 'No email transport is connected, so no messages have been sent.' : 'Select an email to see its context, check the evidence, and give the final word.'}/>{filter !== 'Sent' && !records.length && <button className="button primary" onClick={() => setCompose(true)}><Plus size={15}/> Create your first draft</button>}<span className="inbox-empty-footnote"><ShieldCheck size={13}/> Human judgement, backed by knowledge</span></div>}</AnimatePresence>
      </main>
    </section>
    <ConfirmDialog open={!!confirmation} title={confirmation?.review.decision === 'rejected' ? 'Record a rejection?' : confirmation?.review.decision === 'edited' ? 'Save your edited review?' : 'Approve this draft?'} description={confirmation?.review.decision === 'rejected' ? 'This records a rejected decision on the backend. The email cannot be reviewed again in this workspace. Nothing will be sent.' : confirmation?.review.decision === 'edited' ? 'This saves your edited reply and records the decision as edited. It resets consecutive unchanged approvals for this category. Nothing will be sent.' : 'This records an unchanged approval on the backend. This is a final review decision for this email in the workspace. Nothing will be sent.'} confirmLabel={confirmation?.review.decision === 'rejected' ? 'Record rejection' : confirmation?.review.decision === 'edited' ? 'Save edited review' : 'Record approval'} busy={reviewing} onConfirm={() => void confirmReview()} onClose={() => { if (!reviewing)
        setConfirmation(null); }}/>

    <AnimatePresence>{compose && <motion.div className="inbox-compose-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.15 }} onKeyDown={event => {
                if (event.key === 'Escape' && !drafting)
                    setCompose(false);
                if (event.key === 'Tab') {
                    const controls = Array.from(event.currentTarget.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)'));
                    const first = controls[0];
                    const last = controls[controls.length - 1];
                    if (event.shiftKey && document.activeElement === first) {
                        event.preventDefault();
                        last?.focus();
                    }
                    else if (!event.shiftKey && document.activeElement === last) {
                        event.preventDefault();
                        first?.focus();
                    }
                }
            }}><section className="inbox-compose panel" role="dialog" aria-modal="true" aria-labelledby="compose-title"><div className="inbox-compose-heading"><div><span className="eyebrow">NEW INCOMING EMAIL</span><h2 id="compose-title">Start with the conversation.</h2></div><button ref={composeCloseRef} className="button ghost" aria-label="Close new email" onClick={() => setCompose(false)} disabled={drafting}><X size={19}/></button></div><p className="muted">Enter an incoming email. The backend will generate a draft for your review.</p><form onSubmit={event => void createDraft(event)}><fieldset disabled={drafting || draftUncertain} className="inbox-compose-fields"><label className="field"><span>Try an example input <span className="muted">(optional)</span></span><select className="select" value={sample} onChange={event => { setSample(event.target.value); if (event.target.value !== '')
            setInput({ ...samples[Number(event.target.value)].input }); }}><option value="">Choose a local example…</option>{samples.map((item, index) => <option key={item.label} value={index}>{item.label}</option>)}</select></label>{sample !== '' && <p className="inbox-sample-note"><Sparkles size={13}/> Example text only · submitting makes a real backend draft request.</p>}<label className="field"><span>From</span><input className="input" type="email" required placeholder="name@company.com" value={input.from_address} onChange={event => setInput(current => ({ ...current, from_address: event.target.value }))}/></label><label className="field"><span>Subject</span><input className="input" required maxLength={500} placeholder="What is this about?" value={input.subject} onChange={event => setInput(current => ({ ...current, subject: event.target.value }))}/></label><label className="field"><span>Email body</span><textarea className="textarea" required rows={6} placeholder="Paste the incoming message…" value={input.body} onChange={event => setInput(current => ({ ...current, body: event.target.value }))}/></label></fieldset>{draftError && <div className="notice inbox-error" role="alert">{draftError}</div>}<div className="inbox-compose-footer"><span className="muted"><LockKeyhole size={13}/> Draft only. Never sent.</span><button className="button primary" type="submit" disabled={drafting || draftUncertain || !input.from_address.trim() || !input.subject.trim() || !input.body.trim()}>{drafting ? <RefreshCw size={15} className="inbox-spinning"/> : <Sparkles size={15}/>}{drafting ? 'Generating draft…' : 'Generate draft'}</button></div></form></section></motion.div>}</AnimatePresence>
  </div>;
}
