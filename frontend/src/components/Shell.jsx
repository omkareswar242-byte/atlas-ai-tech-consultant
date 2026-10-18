import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Activity as ActivityIcon, ArrowDownLeft, ArrowUpRight, Bell, BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, Command, FileText, HelpCircle, Inbox, LayoutDashboard, Menu, Moon, Search, Settings, ShieldCheck, Sun, X } from 'lucide-react';
const navigation = [
    { page: 'overview', label: 'Overview', icon: LayoutDashboard, hint: 'Your workspace at a glance' },
    { page: 'knowledge', label: 'Knowledge Brain', icon: BookOpen, hint: 'Ask your consulting knowledge base' },
    { page: 'inbox', label: 'Inbox Agent', icon: Inbox, hint: 'Draft, review, and approve replies' },
    { page: 'scope', label: 'Meeting-to-Scope', icon: FileText, hint: 'Turn meeting notes into project scope' },
    { page: 'evaluations', label: 'Evaluations', icon: ShieldCheck, hint: 'Inspect quality and review gates' },
    { page: 'activity', label: 'Activity', icon: ActivityIcon, hint: 'Explore this session’s activity' },
    { page: 'settings', label: 'Settings', icon: Settings, hint: 'Connection and workspace configuration' },
];
export function AtlasMark({ className = '' }) {
    const gradient = useId().replace(/:/g, '');
    return <svg className={className} width="34" height="38" viewBox="0 0 34 38" fill="none" aria-hidden="true"><defs><linearGradient id={gradient} x1="3" y1="4" x2="29" y2="35" gradientUnits="userSpaceOnUse"><stop stopColor="#91f5ef"/><stop offset="1" stopColor="#5d71f5"/></linearGradient></defs><path d="M17 2 33 32 25 36 17 20 9 36 1 32 17 2Z" fill={`url(#${gradient})`}/><path d="m11 25 6-11 6 11H11Z" fill="var(--bg)"/><path d="M10 29h14" stroke="var(--bg)" strokeWidth="2"/></svg>;
}
function displayTime(time) {
    const date = new Date(time);
    return Number.isNaN(date.getTime()) ? time : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
export default function Shell({ page, onNavigate, health, connected, activities, children }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [commandOpen, setCommandOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedCommand, setSelectedCommand] = useState(0);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [lightTheme, setLightTheme] = useState(false);
    const [seenCount, setSeenCount] = useState(0);
    const commandRef = useRef(null);
    const commandInput = useRef(null);
    const mobileRef = useRef(null);
    const lastFocus = useRef(null);
    const reducedMotion = useReducedMotion();
    const current = navigation.find(item => item.page === page);
    const filtered = navigation.filter(item => `${item.label} ${item.hint}`.toLowerCase().includes(query.toLowerCase()));
    const unseen = Math.max(0, activities.length - seenCount);
    useEffect(() => {
        document.documentElement.dataset.theme = lightTheme ? 'light' : 'dark';
    }, [lightTheme]);
    useEffect(() => {
        const keydown = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setCommandOpen(open => !open);
                setNotificationsOpen(false);
                setProfileOpen(false);
            }
            if (event.key === 'Escape') {
                setCommandOpen(false);
                setMobileOpen(false);
                setNotificationsOpen(false);
                setProfileOpen(false);
            }
        };
        window.addEventListener('keydown', keydown);
        return () => window.removeEventListener('keydown', keydown);
    }, []);
    useEffect(() => {
        if (!commandOpen && !mobileOpen)
            return;
        lastFocus.current = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const timer = window.setTimeout(() => {
            if (commandOpen)
                commandInput.current?.focus();
            else
                mobileRef.current?.querySelector('button')?.focus();
        }, 0);
        const trapFocus = (event) => {
            if (event.key !== 'Tab')
                return;
            const root = commandOpen ? commandRef.current : mobileRef.current;
            const targets = Array.from(root?.querySelectorAll('button:not([disabled]), input, [tabindex="0"]') ?? []).filter(element => element.getClientRects().length > 0);
            if (!targets?.length)
                return;
            const first = targets[0], last = targets[targets.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            }
            else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', trapFocus);
        return () => {
            window.clearTimeout(timer);
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', trapFocus);
            lastFocus.current?.focus();
        };
    }, [commandOpen, mobileOpen]);
    useEffect(() => { setSelectedCommand(0); }, [query]);
    const navigate = (destination) => {
        onNavigate(destination);
        setMobileOpen(false);
        setCommandOpen(false);
        setProfileOpen(false);
        setNotificationsOpen(false);
    };
    const openCommand = () => { setQuery(''); setCommandOpen(true); setNotificationsOpen(false); setProfileOpen(false); };
    const sidebarContent = <>
    <div className="sidebar-brand"><button className="brand-button" onClick={() => navigate('overview')} aria-label="Atlas overview"><AtlasMark /><span className="brand-wordmark">ATLAS<span className="brand-descriptor">CONSULTING INTELLIGENCE</span></span></button><button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={19}/></button></div>
    <div className="workspace-switch"><span className="workspace-avatar">A<span /></span><div><strong>Atlas workspace</strong><span>Personal workspace</span></div><ChevronDown size={14} className="workspace-chevron"/></div>
    <div className="sidebar-section-label">WORKSPACE</div>
    <nav className="main-nav" aria-label="Main navigation">{navigation.map((item, index) => <button key={item.page} className={`nav-item ${page === item.page ? 'active' : ''} ${index === 4 ? 'nav-separated' : ''}`} aria-current={page === item.page ? 'page' : undefined} title={collapsed ? item.label : undefined} onClick={() => navigate(item.page)}><item.icon size={19} strokeWidth={1.65}/><span>{item.label}</span>{page === item.page && <span className="nav-active-dot"/>}</button>)}</nav>
    <div className="sidebar-bottom"><div className="sidebar-assurance"><span className="assurance-icon"><ShieldCheck size={19}/></span><strong>Intelligence, with oversight.</strong><p>Human review stays at the heart of every workflow.</p><button onClick={() => navigate('evaluations')}>Explore review controls <ArrowUpRight size={14}/></button></div><div className="sidebar-system"><span className={`status-dot ${connected ? 'online' : ''}`}/><span>{connected ? 'API connected' : 'API disconnected'}</span><span className="demo-small">DEMO</span></div><button className="sidebar-profile" onClick={() => navigate('settings')}><span className="avatar">AC</span><span><strong>Atlas consultant</strong><small>Local demo workspace</small></span><Settings size={16}/></button></div>
    <button className="sidebar-collapse" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}</button>
  </>;
    return <div className={`app-shell ${collapsed ? 'sidebar-is-collapsed' : ''}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar desktop-sidebar">{sidebarContent}</aside>
    {mobileOpen && <div className="mobile-nav-layer"><button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} tabIndex={-1}/><aside className="sidebar mobile-sidebar" ref={mobileRef} role="dialog" aria-modal="true" aria-label="Navigation">{sidebarContent}</aside></div>}
    <div className="app-main">
      <header className="topbar"><div className="topbar-leading"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={21}/></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={12}/><strong>{current.label}</strong></div></div><div className="topbar-actions"><button className="search-trigger" onClick={openCommand}><Search size={15}/><span>Search anything...</span><kbd><Command size={10}/> K</kbd></button><span className="topbar-divider"/><button className="icon-button theme-toggle" onClick={() => setLightTheme(value => !value)} aria-label={`Switch to ${lightTheme ? 'dark' : 'light'} theme`}>{lightTheme ? <Moon size={18}/> : <Sun size={18}/>}</button><div className="popover-anchor"><button className={`icon-button notification-trigger ${notificationsOpen ? 'is-open' : ''}`} aria-label={`Notifications${unseen ? `, ${unseen} unread` : ''}`} aria-expanded={notificationsOpen} aria-controls="notifications-panel" onClick={() => { setNotificationsOpen(value => !value); setProfileOpen(false); setSeenCount(activities.length); }}><Bell size={18}/>{unseen > 0 && <i />}</button>{notificationsOpen && <><button className="popover-dismiss" aria-label="Close notifications" onClick={() => setNotificationsOpen(false)} tabIndex={-1}/><section className="header-popover notifications-popover" id="notifications-panel" aria-label="Notifications"><div className="popover-heading"><strong>Workspace activity</strong><span className="badge">{activities.length} events</span></div>{activities.length ? <div className="notification-list">{activities.slice(0, 5).map(item => <div className="notification-item" key={item.id}><span className={`activity-dot ${item.kind}`}/><div><strong>{item.title}</strong><p>{item.detail}</p><time>{displayTime(item.time)}</time></div></div>)}</div> : <div className="popover-empty"><Bell size={22}/><strong>You’re all caught up</strong><p>Actions in this workspace will appear here.</p></div>}<button className="popover-footer" onClick={() => navigate('activity')}>View all activity <ArrowUpRight size={14}/></button></section></>}</div><div className="popover-anchor"><button className="avatar topbar-avatar" aria-label="Open profile menu" aria-expanded={profileOpen} aria-controls="profile-menu" onClick={() => { setProfileOpen(value => !value); setNotificationsOpen(false); }}>AC</button>{profileOpen && <><button className="popover-dismiss" aria-label="Close profile menu" onClick={() => setProfileOpen(false)} tabIndex={-1}/><div id="profile-menu" className="header-popover profile-popover"><div className="profile-identity"><strong>Atlas consultant</strong><span>Local demo workspace</span></div><button onClick={() => navigate('settings')}><Settings size={16}/> Workspace settings</button><button onClick={() => navigate('evaluations')}><ShieldCheck size={16}/> Review controls</button><button onClick={() => navigate('activity')}><ActivityIcon size={16}/> Session activity</button></div></>}</div></div></header>
      <main id="main-content" className="main-content" tabIndex={-1}>{children}</main>
      <footer className="app-footer"><span><AtlasMark /> ATLAS <span className="footer-dot">/</span> Built for thoughtful work.</span><span><span className={`status-dot ${connected ? 'online' : ''}`}/> {connected ? 'API connected' : 'Offline'}<span className="footer-dot">·</span>{health?.ai_backend || 'Backend not available'}<span className="footer-dot">·</span>Fixture API · no live sync</span></footer>
    </div>
    <AnimatePresence>{commandOpen && <motion.div className="dialog-overlay command-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.15 }} onMouseDown={event => { if (event.target === event.currentTarget)
        setCommandOpen(false); }}><motion.div ref={commandRef} className="command-dialog" role="dialog" aria-modal="true" aria-label="Search workspace pages" initial={{ opacity: 0, y: reducedMotion ? 0 : -12, scale: reducedMotion ? 1 : 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}><div className="command-search"><Search size={21}/><input ref={commandInput} value={query} onChange={event => setQuery(event.target.value)} placeholder="Where would you like to go?" aria-label="Search pages" aria-controls="command-results" onKeyDown={event => { if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedCommand(value => Math.min(value + 1, filtered.length - 1));
    } if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedCommand(value => Math.max(0, value - 1));
    } if (event.key === 'Enter' && filtered[selectedCommand])
        navigate(filtered[selectedCommand].page); }}/><button className="keyboard-key" onClick={() => setCommandOpen(false)} aria-label="Close search">esc</button></div><div className="command-results" id="command-results"><div className="sidebar-section-label">JUMP TO</div>{filtered.length ? filtered.map((item, index) => <button className={`command-result ${index === selectedCommand ? 'selected' : ''}`} key={item.page} onMouseEnter={() => setSelectedCommand(index)} onClick={() => navigate(item.page)}><item.icon size={19}/><span><strong>{item.label}</strong><small>{item.hint}</small></span>{page === item.page ? <Check size={15}/> : <ArrowDownLeft size={15}/>}</button>) : <div className="empty-state">No pages match “{query}”.</div>}</div><div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to open</span><span><HelpCircle size={12}/> Search workspace pages</span></div></motion.div></motion.div>}</AnimatePresence>
    <span className="sr-only" aria-live="polite">{connected ? 'Backend API connected' : 'Backend API disconnected'}</span>
  </div>;
}
