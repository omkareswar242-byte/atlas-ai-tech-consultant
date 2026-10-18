import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUp, BookOpen, Check, ChevronRight, Database, FileText, MessageSquare, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import { api } from '../api';
import { EmptyState, Loading, SourceCitation } from '../components/Common';
import './workflows.css';
const suggestions = ['How does product search work?', 'Can customers filter products by brand?', 'What are the mobile experience limitations?'];
const errorMessage = (error) => error instanceof Error ? error.message : 'The request could not be completed. Please try again.';
export default function Knowledge({ notify, log }) {
    const [question, setQuestion] = useState('');
    const [turns, setTurns] = useState([]);
    const [selected, setSelected] = useState(null);
    const [busy, setBusy] = useState(false);
    const [articles, setArticles] = useState([]);
    const [indexLoading, setIndexLoading] = useState(true);
    const [indexError, setIndexError] = useState('');
    const [showIndex, setShowIndex] = useState(false);
    const [expert, setExpert] = useState(null);
    const end = useRef(null);
    const nextId = useRef(0);
    const reduced = useReducedMotion();
    useEffect(() => {
        let active = true;
        api.articles().then(data => { if (active)
            setArticles(data); }).catch(error => { if (active)
            setIndexError(errorMessage(error)); }).finally(() => { if (active)
            setIndexLoading(false); });
        return () => { active = false; };
    }, []);
    useEffect(() => { end.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'nearest' }); }, [turns, busy, reduced]);
    const active = turns.find(turn => turn.id === selected);
    async function ask(text = question) {
        const clean = text.trim();
        if (!clean || busy)
            return;
        const id = ++nextId.current;
        setTurns(old => [...old, { id, question: clean }]);
        setSelected(id);
        setQuestion('');
        setBusy(true);
        try {
            const result = await api.query(clean);
            setTurns(old => old.map(turn => turn.id === id ? { ...turn, result } : turn));
            log('Knowledge question answered', result.needs_human ? `Expert review requested${result.escalation_id ? ` · ${result.escalation_id}` : ''}` : `${result.sources.length} evidence sources returned`, 'knowledge');
        }
        catch (error) {
            const message = errorMessage(error);
            setTurns(old => old.map(turn => turn.id === id ? { ...turn, error: message } : turn));
            notify(message, 'error');
        }
        finally {
            setBusy(false);
        }
    }
    return <div className="workflow-page knowledge-page">
    <header className="workflow-heading"><div><div className="workflow-eyebrow">INTELLIGENCE WORKSPACE</div><h1>Knowledge assistant <span className="workflow-beta">EVIDENCE FIRST</span></h1><p>Clear answers. Traceable sources. A human when it matters.</p></div><button className="button" onClick={() => setShowIndex(!showIndex)}><Database size={15}/> Knowledge index <span className="workflow-count">{indexLoading ? '…' : indexError ? '—' : articles.length}</span></button></header>
    <div className="workflow-disclaimer"><ShieldCheck size={16}/><span>Demonstration knowledge uses fixture articles. Answers are grounded in returned evidence; coverage is limited.</span></div>
    {showIndex && <section className="panel workflow-index"><div className="workflow-section-heading"><div><h2>Knowledge index</h2><p>{articles.length} articles returned by the API · Sync is not available</p></div><button className="button icon-button" aria-label="Close knowledge index" onClick={() => setShowIndex(false)}><X size={16}/></button></div>{indexLoading ? <Loading label="Loading articles…"/> : indexError ? <p role="alert">{indexError}</p> : articles.length ? <div className="workflow-index-grid">{articles.map(article => <article key={article.id}><FileText size={17}/><h3>{article.title}</h3><p>{article.body}</p><span className="workflow-muted">{article.id}</span></article>)}</div> : <EmptyState title="No indexed articles" description="The API returned an empty knowledge index."/>}</section>}
    <div className="knowledge-layout">
      <section className="panel knowledge-conversation" aria-label="Knowledge conversation"><div className="workflow-section-heading"><div className="workflow-inline"><MessageSquare size={17}/><h2>Your conversation</h2></div><span className="workflow-muted">This session only</span></div>
        <div className="knowledge-messages" aria-live="polite">
          {!turns.length && <motion.div initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="knowledge-welcome"><div className="knowledge-orb"><Sparkles size={29}/></div><span className="workflow-eyebrow">A GOOD QUESTION IS A GREAT START</span><h2>What would you like to know?</h2><p>Explore product capabilities, uncover limitations,<br />and get answers with supporting evidence.</p><div className="knowledge-suggestions">{suggestions.map(text => <button key={text} onClick={() => void ask(text)} disabled={busy}><Search size={15}/><span>{text}</span><ChevronRight size={15}/></button>)}</div></motion.div>}
          {turns.map(turn => <div className="knowledge-turn" key={turn.id}><div className="knowledge-user"><span className="workflow-avatar">Y</span><div><span className="workflow-message-author">You</span><p>{turn.question}</p></div></div><div className={`knowledge-answer ${selected === turn.id ? 'is-selected' : ''}`}><span className="workflow-avatar assistant"><Sparkles size={15}/></span><div className="knowledge-answer-body"><span className="workflow-message-author">Atlas <span className="workflow-muted">· Knowledge assistant</span></span>{!turn.result && !turn.error ? <Loading label="Retrieving evidence and preparing your answer…"/> : turn.error ? <div role="alert" className="workflow-error"><p>{turn.error}</p><button className="button" disabled={busy} onClick={() => void ask(turn.question)}>Retry question</button></div> : turn.result && <><p className="workflow-prewrap">{turn.result.answer}</p>{(turn.result.status === 'insufficient_evidence' || turn.result.needs_human) && <div className="workflow-warning"><strong>Human expertise needed</strong><p>The available evidence does not fully support an answer. {turn.result.escalation_id ? `An expert request was automatically created: ${turn.result.escalation_id}.` : 'No expert request ID was returned; routing cannot be verified.'}</p><button className="button" onClick={() => setExpert(turn)}>View expert request <ChevronRight size={14}/></button></div>}<button className="knowledge-evidence-link" onClick={() => setSelected(turn.id)}><BookOpen size={14}/>{turn.result.sources.length} returned sources {selected === turn.id && <Check size={13}/>}</button></>}</div></div></div>)}<div ref={end}/>
        </div>
        <form className="knowledge-composer" onSubmit={event => { event.preventDefault(); void ask(); }}><label className="sr-only" htmlFor="knowledge-question">Ask a question</label><textarea id="knowledge-question" rows={3} placeholder="Ask about a feature, a workflow, or a limitation…" value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        void ask();
    } }}/><div><span>Ctrl / ⌘ + Enter to ask · Verify important decisions</span><button className="button primary" type="submit" disabled={busy || !question.trim()} aria-label="Ask question"><ArrowUp size={18}/></button></div></form>
      </section>
      <aside className="panel knowledge-sources"><div className="workflow-section-heading"><div className="workflow-inline"><BookOpen size={17}/><h2>Supporting evidence</h2></div><span className="workflow-count">{active?.result?.sources.length ?? 0}</span></div>{active?.result ? <><p className="workflow-muted source-context">Sources returned for the selected answer. Relevance is a retrieval signal, not a verified accuracy score.</p>{active.result.sources.length ? active.result.sources.map((source, index) => <SourceCitation key={`${source.article_id}-${index}`} source={source}/>) : <EmptyState title="No supporting sources" description="No evidence was returned for this question. A human should verify the answer."/>}</> : <div className="knowledge-source-empty"><div className="workflow-empty-icon"><BookOpen size={24}/></div><h3>Evidence lives here</h3><p>Ask a question to see the exact articles used in the response.</p><div className="source-placeholder"/><div className="source-placeholder short"/></div>}<div className="knowledge-source-footer"><ShieldCheck size={15}/> Only returned evidence appears here</div></aside>
    </div>
    {expert && <div className="workflow-modal-backdrop" onClick={() => setExpert(null)}><section role="dialog" aria-modal="true" aria-labelledby="expert-title" className="panel workflow-modal" onClick={event => event.stopPropagation()}><div className="workflow-section-heading"><h2 id="expert-title">Expert request details</h2><button className="button" onClick={() => setExpert(null)} aria-label="Close expert request"><X size={16}/></button></div><span className="workflow-badge warning">Automatic escalation</span><dl className="workflow-details"><dt>Request ID</dt><dd>{expert.result?.escalation_id ?? 'Not provided by API'}</dd><dt>Question</dt><dd>{expert.question}</dd><dt>Evidence returned</dt><dd>{expert.result?.sources.length ?? 0} sources</dd></dl><p className="workflow-muted">These are the details returned with this answer. Expert assignment, delivery, and resolution status are not exposed by this interface.</p><button className="button primary" onClick={() => setExpert(null)}>Done</button></section></div>}
  </div>;
}
