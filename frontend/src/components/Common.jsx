import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ExternalLink, FileText, LoaderCircle, ShieldCheck, X } from 'lucide-react';
export function SourceCitation({ source }) {
    let valid = false;
    let fixture = false;
    try {
        const url = new URL(source.url);
        valid = ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
        fixture = url.hostname.endsWith('.example') || url.hostname === 'example';
    }
    catch { /* omit invalid URLs */ }
    return <details className="source-card"><summary><FileText size={15}/><span>{source.title}</span></summary><p>{source.excerpt}</p>{fixture && <span className="badge warning">Sample fixture · not live documentation</span>}{valid && <a href={source.url} target="_blank" rel="noopener noreferrer" className="source-link">{source.url}<ExternalLink size={12}/></a>}</details>;
}
export function EmptyState({ title, description }) { return <div className="empty-state"><div className="empty-icon"><ShieldCheck size={24}/></div><h3>{title}</h3><p>{description}</p></div>; }
export function Loading({ label = 'Working…' }) { return <div className="row muted" role="status"><LoaderCircle className="spinner" size={18}/>{label}</div>; }
export function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onClose, busy = false }) {
    const ref = useRef(null);
    const reduce = useReducedMotion();
    useEffect(() => { if (!open)
        return; const old = document.activeElement; ref.current?.querySelector('button')?.focus(); const listener = (e) => { if (e.key === 'Escape' && !busy)
        onClose(); if (e.key === 'Tab') {
        const items = ref.current?.querySelectorAll('button:not(:disabled)');
        if (!items?.length)
            return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        }
        else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    } }; document.addEventListener('keydown', listener); return () => { document.removeEventListener('keydown', listener); old?.focus(); }; }, [open, busy, onClose]);
    return <AnimatePresence>{open && <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={e => { if (e.target === e.currentTarget && !busy)
        onClose(); }}><motion.div className="panel confirm-dialog" ref={ref} role="dialog" aria-modal="true" aria-label={title} initial={reduce ? {} : { y: 12, scale: .98 }} animate={{ y: 0, scale: 1 }}><div className="row" style={{ justifyContent: 'space-between' }}><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={18}/></button></div><p className="muted">{description}</p><div className="row" style={{ justifyContent: 'flex-end', marginTop: 24 }}><button className="button secondary" onClick={onClose} disabled={busy}>Cancel</button><button className="button primary" onClick={onConfirm} disabled={busy}>{busy ? 'Recording…' : confirmLabel}</button></div></motion.div></motion.div>}</AnimatePresence>;
}
