import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Activity as ActivityIcon, ArrowUpRight, CheckCircle2, Clock3, FlaskConical, PlugZap, RefreshCw, ShieldCheck, Terminal, X } from 'lucide-react';
import Shell from './components/Shell';
import Overview from './pages/Overview';
import Knowledge from './pages/Knowledge';
import Inbox from './pages/Inbox';
import Scope from './pages/Scope';
import { EmptyState } from './components/Common';
import { api, getApiBase, setApiBase } from './api';
import cases from '../../evals/cases.json';
const pages = ['overview', 'knowledge', 'inbox', 'scope', 'evaluations', 'activity', 'settings'];
export default function App() {
    const [page, setPage] = useState(() => pages.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview');
    const [health, setHealth] = useState(null), [connected, setConnected] = useState(false);
    const [emails, setEmails] = useState([]), [scopes, setScopes] = useState([]);
    const [activities, setActivities] = useState([]), [toasts, setToasts] = useState([]);
    const notify = useCallback((message, tone = 'info') => { const id = crypto.randomUUID(); setToasts(old => [...old.slice(-3), { id, message, tone }]); window.setTimeout(() => setToasts(old => old.filter(t => t.id !== id)), 7000); }, []);
    const log = useCallback((title, detail, kind = 'system') => setActivities(old => [{ id: crypto.randomUUID(), title, detail, time: new Date().toISOString(), kind }, ...old].slice(0, 100)), []);
    const refresh = useCallback(async () => { try {
        const status = await api.health();
        setHealth(status);
        setConnected(status.status === 'ok');
    }
    catch {
        setConnected(false);
        setHealth(null);
    } try {
        setEmails(await api.emails());
    }
    catch {
        setEmails([]);
    } }, []);
    useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 30000); return () => clearInterval(timer); }, [refresh]);
    useEffect(() => { const change = () => setPage(pages.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview'); window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change); }, []);
    const navigate = (destination) => { setPage(destination); location.hash = destination; };
    const observeScope = (scope) => setScopes(old => [scope, ...old.filter(item => item.project_id !== scope.project_id)]);
    const shared = { notify, log, onScope: observeScope, onRefresh: () => void refresh() };
    return <MotionConfig reducedMotion="user"><Shell page={page} onNavigate={navigate} health={health} connected={connected} activities={activities}>
    {!connected && <div className="notice warning" role="status"><PlugZap size={16}/>Backend disconnected. Start FastAPI on port 8000 or configure the connection in Settings.</div>}
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}>
      {page === 'overview' && <Overview health={health} connected={connected} emails={emails} scopes={scopes} activities={activities} onNavigate={navigate}/>}
      <div hidden={page !== 'knowledge'}><Knowledge {...shared}/></div>
      <div hidden={page !== 'inbox'}><Inbox {...shared}/></div>
      <div hidden={page !== 'scope'}><Scope {...shared}/></div>
      {page === 'evaluations' && <Evaluations />}
      {page === 'activity' && <ActivityPage activities={activities}/>}
      {page === 'settings' && <Settings health={health} connected={connected} onConnect={async () => { await refresh(); log('Connection checked', 'Workspace API health was refreshed.'); }} notify={notify}/>}
    </motion.div>
  </Shell><div className="toast-stack" aria-live="polite"><AnimatePresence>{toasts.map(toast => <motion.div key={toast.id} className={`toast ${toast.tone}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }}><CheckCircle2 size={17}/><span>{toast.message}</span><button className="icon-button" aria-label="Dismiss notification" onClick={() => setToasts(old => old.filter(t => t.id !== toast.id))}><X size={14}/></button></motion.div>)}</AnimatePresence></div></MotionConfig>;
}
function Evaluations() {
    const [task, setTask] = useState('knowledge');
    return <><header className="page-header"><div><div className="eyebrow">VALIDATION / QUALITY LAB</div><h1>Evidence over assumptions.</h1><p>Inspect the repository's evaluation cases. Model-quality claims need actual model runs.</p></div><span className="badge warning"><FlaskConical size={12}/> Local case definitions</span></header>
  <div className="grid-3">{['knowledge', 'inbox', 'scope'].map(name => <button key={name} className={`panel eval-card ${task === name ? 'selected' : ''}`} onClick={() => setTask(name)}><span className="eyebrow">{name === 'scope' ? 'MEETING-TO-SCOPE' : name.toUpperCase()}</span><strong>{cases[name].length}<small> defined cases</small></strong><span className="muted">Inspect expected outcomes <ArrowUpRight size={13}/></span></button>)}</div>
  <div className="notice" style={{ marginTop: 24 }}><ShieldCheck size={18}/><div>These are the existing repository's test definitions—not live pass/fail results. The API has no evaluation-run endpoint. Claude quality, latency, and cost are not measured here.</div></div>
  <section className="panel" style={{ marginTop: 24 }}><div className="panel-header"><h2>Case explorer</h2><span className="badge">{task}</span></div><div className="table-scroll"><table className="atlas-table"><thead><tr><th>Case</th><th>Input</th><th>Expected check</th><th>Run state</th></tr></thead><tbody>{cases[task].map(item => <tr key={item.id}><td><code>{item.id}</code></td><td>{'question' in item ? item.question : 'subject' in item ? item.subject : item.transcript}</td><td>{item.expected}</td><td><span className="badge">Not run in this UI</span></td></tr>)}</tbody></table></div></section>
  <section className="panel" style={{ marginTop: 24 }}><h3><Terminal size={17}/> Run reproducibly</h3><p className="muted" style={{ margin: '12px 0' }}>From the Python project folder, use the existing runner. It tests deterministic behavior and is not a model comparison.</p><pre className="code-block">python -m pytest{'\n'}python evals/run_evals.py</pre></section></>;
}
function ActivityPage({ activities }) {
    const [filter, setFilter] = useState('all');
    const visible = activities.filter(item => filter === 'all' || item.kind === filter);
    return <><header className="page-header"><div><div className="eyebrow">WORKSPACE / TRACEABILITY</div><h1>Every decision, in context.</h1><p>Events observed in this browser session. This is not a durable backend audit trail.</p></div><span className="badge"><Clock3 size={12}/> Session only</span></header><div className="tabs" style={{ marginBottom: 24 }}>{['all', 'knowledge', 'inbox', 'scope', 'system', 'error'].map(value => <button className={`tab ${value === filter ? 'active' : ''}`} key={value} onClick={() => setFilter(value)}>{value === 'all' ? 'All events' : value}</button>)}</div><section className="panel">{visible.length ? visible.map(item => <article className="activity-record" key={item.id}><span className={`activity-symbol ${item.kind}`}><ActivityIcon size={17}/></span><div><h3>{item.title}</h3><p className="muted">{item.detail}</p></div><time dateTime={item.time}>{new Date(item.time).toLocaleTimeString()}</time></article>) : <EmptyState title="A clear activity trail starts here" description="Ask a question, review an email, or generate a scope. Confirmed actions will appear in this session."/>}</section></>;
}
function Settings({ health, connected, onConnect, notify }) {
    const [url, setUrl] = useState(getApiBase()), [busy, setBusy] = useState(false);
    return <><header className="page-header"><div><div className="eyebrow">WORKSPACE / CONFIGURATION</div><h1>Built on clear boundaries.</h1><p>Manage the API connection. Model credentials stay exclusively on the Python server.</p></div></header><div className="grid-2"><section className="panel"><div className="panel-header"><h2>API connection</h2><span className={`badge ${connected ? 'success' : 'warning'}`}>{connected ? 'Connected' : 'Offline'}</span></div><form onSubmit={async (event) => { event.preventDefault(); setBusy(true); try {
        setApiBase(url);
        await onConnect();
        notify('Connection settings applied. Check the live status indicator.');
    }
    catch (error) {
        notify(error instanceof Error ? error.message : 'Invalid configuration', 'error');
    }
    finally {
        setBusy(false);
    } }}><label className="field">Backend origin<input className="input" value={url} placeholder="Empty = same-origin Vite proxy" onChange={event => setUrl(event.target.value)}/></label><p className="muted" style={{ margin: '12px 0 20px' }}>Empty uses the development proxy to port 8000. Custom origins require backend CORS permission. Changes apply to this browser session only.</p><button className="button primary" disabled={busy}><RefreshCw size={15} className={busy ? 'spinner' : ''}/>{busy ? 'Checking…' : 'Apply & check connection'}</button></form></section><section className="panel"><h2>Runtime transparency</h2><dl className="runtime-details"><dt>Reported backend</dt><dd>{health?.ai_backend ?? 'Unavailable'}</dd><dt>Articles reported</dt><dd>{health?.article_count ?? 'Unavailable'}</dd><dt>Delivery transport</dt><dd>Not implemented</dd><dt>Storage</dt><dd>Backend in-memory · resets on restart</dd></dl><div className="notice">The knowledge adapter supports Claude. Inbox classification and scope extraction currently use rules. No API key is requested or stored by this frontend.</div></section></div><section className="panel" style={{ marginTop: 24 }}><h2>Integration boundaries</h2><p className="muted" style={{ marginTop: 12 }}>Live Brilliant Directories ingestion, synchronization receipts, expert-task management, durable version history, evaluation-run APIs, scope-edit persistence, and delivery are not available in the current backend. The workspace does not simulate these operations as successful.</p></section></>;
}
