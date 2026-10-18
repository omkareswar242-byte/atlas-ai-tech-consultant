import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, CheckCircle2, FileCheck2, FileText, GitCompareArrows, Layers, Loader2, LockKeyhole, Upload } from 'lucide-react';
import { api } from '../api';
import { ConfirmDialog, EmptyState } from '../components/Common';
import './workflows.css';
const examples = {
    initial: 'We need to improve product search, add product filters, and improve the mobile experience. Search is our priority. Please confirm technical limitations before implementation.',
    followup: 'Keep product search. Change the filters to brand filters. We no longer need mobile improvements. We would also like an analytics dashboard; please treat it as a separate request.',
};
const message = (error) => error instanceof Error ? error.message : 'The scope request failed. Please try again.';
const readable = (value) => value.replaceAll('_', ' ');
export default function Scope({ notify, log, onScope }) {
    const [mode, setMode] = useState('initial');
    const [project, setProject] = useState('');
    const [meeting, setMeeting] = useState('');
    const [parent, setParent] = useState('');
    const [transcript, setTranscript] = useState('');
    const [fileName, setFileName] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [scope, setScope] = useState(null);
    const [originals, setOriginals] = useState({});
    const [previous, setPrevious] = useState(null);
    const [changes, setChanges] = useState([]);
    const [tab, setTab] = useState('requirements');
    const [notes, setNotes] = useState('');
    const [reviewer, setReviewer] = useState('');
    const [confirm, setConfirm] = useState(false);
    const [approving, setApproving] = useState(false);
    const reduced = useReducedMotion();
    async function readFile(file) {
        if (!file)
            return;
        if (!file.name.toLowerCase().endsWith('.txt')) {
            notify('Choose a plain-text .txt file.', 'error');
            return;
        }
        if (file.size > 1024 * 1024) {
            notify('The transcript must be 1 MB or smaller.', 'error');
            return;
        }
        try {
            const text = await file.text();
            if (text.includes('\u0000'))
                throw new Error('This file does not appear to contain plain text.');
            setTranscript(text);
            setFileName(file.name);
        }
        catch (err) {
            notify(message(err), 'error');
        }
    }
    async function generate() {
        if (busy || !project.trim() || !meeting.trim() || !transcript.trim())
            return;
        setBusy(true);
        setError('');
        const input = { project_id: project.trim(), meeting_id: meeting.trim(), transcript: transcript.trim(), ...(parent.trim() && mode === 'followup' ? { parent_meeting_id: parent.trim() } : {}) };
        try {
            let next;
            let baseline = null;
            let diff = [];
            if (mode === 'followup') {
                baseline = await api.scope(input.project_id);
                setOriginals(old => old[input.project_id] ? old : { ...old, [input.project_id]: structuredClone(baseline) });
                const result = await api.followUp(input);
                next = result.package;
                diff = result.changes;
            }
            else {
                // Check for an existing project before the create endpoint can replace it.
                try {
                    await api.scope(input.project_id);
                    throw new Error('This project already exists. Select Follow-up to preserve and compare its current scope.');
                }
                catch (err) {
                    if (!(err instanceof Error) || !/404|not found/i.test(err.message))
                        throw err;
                }
                next = await api.createScope(input);
                setOriginals(old => ({ ...old, [input.project_id]: structuredClone(next) }));
            }
            setPrevious(baseline);
            setScope(next);
            setChanges(diff);
            setNotes('');
            setReviewer('');
            setTab(mode === 'followup' ? 'comparison' : 'requirements');
            onScope?.(next);
            log(mode === 'followup' ? 'Follow-up scope generated' : 'Scope draft generated', `${next.project_id} · version ${next.version} · ${next.requirements.length} requirements`, 'scope');
            notify(`Version ${next.version} is ready for review.`, 'success');
        }
        catch (err) {
            const text = message(err);
            setError(text);
            notify(text, 'error');
        }
        finally {
            setBusy(false);
        }
    }
    async function approve() {
        if (!scope || !reviewer.trim() || approving)
            return;
        setApproving(true);
        try {
            const approved = await api.approveScope(scope.project_id, scope.version, reviewer.trim());
            setScope(approved);
            onScope?.(approved);
            setConfirm(false);
            log('Scope approved', `${approved.project_id} · version ${approved.version} · reviewed by ${reviewer.trim()}`, 'scope');
            notify('Backend scope approved. No document was sent.', 'success');
        }
        catch (err) {
            notify(message(err), 'error');
        }
        finally {
            setApproving(false);
        }
    }
    const original = scope ? originals[scope.project_id] : undefined;
    return <div className="workflow-page scope-page"><header className="workflow-heading"><div><div className="workflow-eyebrow">DELIVERY WORKSPACE</div><h1>Scope studio <span className="workflow-beta">HUMAN APPROVED</span></h1><p>Turn a client conversation into a clear, reviewable plan.</p></div><span className="workflow-pill"><LockKeyhole size={14}/> Approval before delivery</span></header>
    <div className="scope-steps atlas-six-steps" aria-label="Workflow stages">{[{ icon: FileText, title: 'Transcript', detail: 'Capture context' }, { icon: Layers, title: 'Requirements', detail: 'Extract needs' }, { icon: Layers, title: 'Capabilities', detail: 'Check product fit' }, { icon: Layers, title: 'Estimates', detail: 'Review uncertainty' }, { icon: FileText, title: 'Proposal', detail: 'Inspect the draft' }, { icon: FileCheck2, title: 'Approval', detail: scope?.approval_status === 'approved' ? 'Recorded' : 'Human decision' }].map((step, index) => <div key={step.title} className={`scope-step ${index === 0 || (scope && index < 5) || scope?.approval_status === 'approved' ? 'active' : ''}`}><span>{scope && (index < 5 || scope.approval_status === 'approved') ? <Check size={16}/> : <step.icon size={16}/>}</span><div><strong>{step.title}</strong><small>{step.detail}</small></div></div>)}</div>
    <div className="scope-layout"><aside className="panel scope-input"><div className="workflow-section-heading"><h2>Meeting input</h2><span className="workflow-badge">01</span></div><div className="workflow-segmented"><button className={mode === 'initial' ? 'active' : ''} onClick={() => setMode('initial')} disabled={busy}>Initial meeting</button><button className={mode === 'followup' ? 'active' : ''} onClick={() => setMode('followup')} disabled={busy}>Follow-up</button></div><form onSubmit={event => { event.preventDefault(); void generate(); }}><label className="workflow-field">Project ID<input required value={project} onChange={event => setProject(event.target.value)} placeholder={mode === 'initial' ? 'e.g. northstar-store' : 'Existing project ID'} disabled={busy}/></label><label className="workflow-field">Meeting ID<input required value={meeting} onChange={event => setMeeting(event.target.value)} placeholder="e.g. discovery-001" disabled={busy}/></label>{mode === 'followup' && <label className="workflow-field">Parent meeting ID <span className="workflow-muted">optional</span><input value={parent} onChange={event => setParent(event.target.value)} placeholder="e.g. discovery-001" disabled={busy}/></label>}<label className="workflow-field">Demonstration samples<select disabled={busy} defaultValue="" onChange={event => { if (event.target.value) {
        setTranscript(examples[event.target.value]);
        setFileName('');
    } event.target.value = ''; }}><option value="">Choose a sample transcript…</option><option value="initial">Demo · initial discovery</option><option value="followup">Demo · follow-up changes</option></select></label><label className="workflow-field">Transcript<textarea required rows={11} value={transcript} onChange={event => { setTranscript(event.target.value); setFileName(''); }} placeholder="Paste the meeting transcript here…" disabled={busy}/></label><label className={`scope-upload ${busy ? 'disabled' : ''}`}><Upload size={16}/><span>{fileName || 'Upload a .txt transcript'}<small>Plain text only · max 1 MB</small></span><input type="file" accept=".txt,text/plain" disabled={busy} onChange={event => { void readFile(event.target.files?.[0]); event.target.value = ''; }}/></label>{mode === 'followup' && <p className="workflow-warning compact">The backend replaces the full requirement set. Include every requirement you want to retain. The current scope is fetched and kept in this session before the follow-up is submitted.</p>}{error && <p className="workflow-error" role="alert">{error}</p>}<button className="button primary scope-generate" type="submit" disabled={busy || !project.trim() || !meeting.trim() || !transcript.trim()}>{busy ? <Loader2 size={16} className="workflow-spin"/> : <Layers size={16}/>}{busy ? 'Generating scope…' : mode === 'followup' ? 'Generate follow-up' : 'Generate scope'}{!busy && <ArrowRight size={16}/>}</button><p className="workflow-muted scope-input-note">One backend generation request. No simulated progress. Rule-based extraction and placeholder estimates require review.</p></form></aside>
      <section className="scope-output">{!scope ? <div className="panel scope-start"><motion.div initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><div className="scope-document-icon"><FileText size={34}/><span><Check size={13}/></span></div><div className="workflow-eyebrow">FROM CONVERSATION TO CLARITY</div><h2>Your next project starts here.</h2><p>Add a meeting transcript to build a structured scope,<br />surface unknowns, and prepare a draft for review.</p><div className="scope-promises"><span><CheckCircle2 size={15}/> Traceable requirements</span><span><CheckCircle2 size={15}/> Visible scope changes</span><span><CheckCircle2 size={15}/> Explicit human approval</span></div><div className="scope-demo-notice">Demonstration workflow · no client delivery or sending</div></motion.div></div> : <><div className="panel scope-result"><div className="workflow-section-heading"><div><span className="workflow-eyebrow">{scope.project_id}</span><h2>Project scope <span className="workflow-muted">/ v{scope.version}</span></h2></div><span className={`workflow-badge ${scope.approval_status === 'approved' ? 'success' : 'warning'}`}>{scope.approval_status === 'approved' ? 'Approved' : 'Draft · review required'}</span></div><div className="workflow-tabs" role="tablist" aria-label="Scope views">{['requirements', 'document', 'comparison'].map(item => <button role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} key={item} onClick={() => setTab(item)}>{item === 'requirements' ? 'Requirements' : item === 'document' ? 'Document preview' : 'Version comparison'}</button>)}</div>
        {tab === 'requirements' && <div className="scope-result-content"><div className="scope-objective"><span className="workflow-eyebrow">PROJECT OBJECTIVE</span><h3>{scope.objective}</h3></div><div className="workflow-section-heading"><h3>Requirements</h3><span className="workflow-count">{scope.requirements.length}</span></div>{scope.requirements.length ? scope.requirements.map(req => <article key={req.id} className="scope-requirement"><div className="workflow-inline"><span className="workflow-muted">{req.id}</span><span className="workflow-badge">{readable(req.priority)}</span></div><h3>{req.description}</h3><div className="scope-requirement-meta"><span>{readable(req.status)}</span><span>{readable(req.feasibility)}</span></div><blockquote>Source excerpt: “{req.source_excerpt}”</blockquote><ul>{req.acceptance_criteria.map((criterion, i) => <li key={i}>{criterion}</li>)}</ul></article>) : <EmptyState title="No requirements extracted" description="The rule-based backend did not recognize supported requirement keywords. Review and clarify the transcript."/>}<div className="workflow-warning compact"><strong>Capability check, not guaranteed savings</strong><p>“Existing feature with limitation” is a conditional evidence classification. Technical fit, configuration effort, licensing, and implementation cost are unverified.</p></div><h3 className="scope-subheading">Placeholder effort estimates</h3><div className="scope-estimate-table"><table><thead><tr><th>Workstream</th><th>Low</th><th>Likely</th><th>High</th></tr></thead><tbody>{scope.estimate_tasks.map((task, index) => <tr key={index}><td>{task.description}</td><td>{task.low_hours}h</td><td>{task.likely_hours}h</td><td>{task.high_hours}h</td></tr>)}</tbody></table></div><p className="workflow-muted">Static backend placeholders, not a validated quote. Dependencies, architecture, rates, and delivery dates remain unknown.</p></div>}
        {tab === 'document' && <div className="scope-result-content"><article className="scope-document"><div className="scope-document-header"><span>ATLAS / PROJECT SERVICES</span><span>{scope.approval_status.toUpperCase()}</span></div><span className="workflow-eyebrow">STATEMENT OF WORK · VERSION {scope.version}</span><h2>{scope.objective}</h2><p className="workflow-muted">Project {scope.project_id}</p><hr /><h3>01 / Proposal</h3><p className="workflow-prewrap">{scope.proposal_text}</p><h3>02 / Scope of work</h3>{scope.requirements.length ? <ol>{scope.requirements.map(req => <li key={req.id}><strong>{req.description}</strong><p>{req.acceptance_criteria.join(' ')}</p></li>)}</ol> : <p>No requirements extracted. Clarification required.</p>}<h3>03 / Assumptions & open questions</h3><p>Technical feasibility, dependencies, pricing, timing, and final acceptance criteria need human validation. Effort values are demonstration placeholders.</p><div className="scope-document-footer">Prepared from backend scope content · No document has been sent</div></article><label className="workflow-field scope-notes">Local review notes<textarea rows={5} placeholder="Add questions or proposed edits for your own review…" value={notes} onChange={event => setNotes(event.target.value)}/><small>Session-only notes. They do not edit or persist the backend scope and are excluded from approval.</small></label></div>}
        {tab === 'comparison' && <div className="scope-result-content">{previous ? <><div className="workflow-inline scope-comparison-heading"><GitCompareArrows size={18}/><h3>Before & after</h3></div><p className="workflow-muted">The actual backend snapshot fetched immediately before this follow-up, compared with the returned package.</p><div className="scope-compare-grid">{[{ label: 'Before follow-up', value: previous }, { label: 'Current scope', value: scope }].map(({ label, value }) => <article key={label}><span className="workflow-eyebrow">{label}</span><h3>Version {value.version} <span className="workflow-badge">{value.approval_status}</span></h3>{value.requirements.length ? value.requirements.map(req => <div className="scope-compare-req" key={req.id}><small>{req.id}</small><p>{req.description}</p><span>{readable(req.feasibility)}</span></div>) : <p>No requirements</p>}</article>)}</div><h3 className="scope-subheading">Backend change report</h3>{changes.map((change, index) => <div key={index} className={`scope-change ${change.change_type}`}><span className="workflow-badge">{readable(change.change_type)}</span><p>{change.description}</p></div>)}</> : <EmptyState title="No follow-up comparison yet" description="Generate a follow-up for an existing project to capture the current scope and compare the returned version."/>}{original && <details className="scope-original"><summary>Original snapshot in this session · v{original.version} · {original.approval_status}</summary><p>{original.objective}</p><ul>{original.requirements.map(req => <li key={req.id}>{req.description}</li>)}</ul><p className="workflow-muted">Snapshot captured when this project was first observed here. It is not a durable or necessarily approved baseline.</p></details>}<div className="workflow-warning compact"><strong>Version storage limitation</strong><p>The backend does not retain durable approved baselines or version history. Snapshots shown here exist only while this workspace remains mounted; reloading loses them.</p></div></div>}
      </div><div className="panel scope-approval"><div className="workflow-inline"><div className="scope-approval-icon"><FileCheck2 size={22}/></div><div><h3>{scope.approval_status === 'approved' ? 'Human approval recorded' : 'Ready for a human decision'}</h3><p>Approval applies to backend version {scope.version}. Local notes are excluded. Nothing is sent.</p></div></div>{scope.approval_status !== 'approved' && <div className="scope-approval-actions"><label className="workflow-field">Reviewer name<input value={reviewer} onChange={event => setReviewer(event.target.value)} placeholder="Enter your name" disabled={approving || busy}/></label><button className="button primary" disabled={!reviewer.trim() || approving || busy} onClick={() => setConfirm(true)}><Check size={16}/> Approve v{scope.version}</button></div>}</div></>}
      </section></div>
    <ConfirmDialog open={confirm} title={`Approve scope version ${scope?.version ?? ''}?`} description={`${reviewer.trim()} is approving the backend content for ${scope?.project_id ?? ''}, version ${scope?.version ?? ''}. Review the requirements and placeholder estimates first. Local notes are not included. This records approval only; it does not send anything.`} confirmLabel="Confirm approval" onConfirm={() => void approve()} onClose={() => { if (!approving)
        setConfirm(false); }} busy={approving}/>
  </div>;
}
