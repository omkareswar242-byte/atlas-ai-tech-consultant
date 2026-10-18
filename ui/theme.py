"""Static, accessible presentation helpers for the consultant workspace."""

import streamlit as st


_THEME = """<style>
:root {
    --ink: #20201f;
    --muted: #696762;
    --crimson: #b02535;
    --paper: #fffefa;
    --canvas: #f7f6f2;
    --line: #e2e0d9;
    --ring: #b02535;
    --ease: cubic-bezier(.22, 1, .36, 1);
}
[data-testid="stAppViewContainer"] {
    color: var(--ink);
    background: var(--canvas);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
}
[data-testid="stHeader"] {
    background: var(--canvas);
    border-bottom: 1px solid var(--line);
}
[data-testid="stMainBlockContainer"], .main .block-container {
    max-width: 1240px;
    padding: 3.5rem 3.5rem 5rem;
    animation: workspace-enter .7s var(--ease) both;
}
[data-testid="stMain"] :is(h1, h2, h3) {
    color: var(--ink);
    font-family: inherit;
    font-weight: 600;
    letter-spacing: -.035em;
    text-wrap: balance;
}
[data-testid="stMain"] h1 {font-size: clamp(2rem, 3.5vw, 3rem);}
[data-testid="stMain"] h2 {font-size: 1.65rem; line-height: 1.25;}
[data-testid="stMain"] h3 {font-size: 1.15rem; line-height: 1.4;}
[data-testid="stMain"] :is(p, li) {line-height: 1.65;}
[data-testid="stMain"] [data-testid="stCaptionContainer"] {color: var(--muted);}
[data-testid="stMain"] a {color: var(--crimson); text-underline-offset: .22em;}
[data-testid="stMain"] hr {border-color: var(--line); margin: 2rem 0;}
[data-testid="stForm"] {
    padding: clamp(1.25rem, 3vw, 2.25rem);
    border: 1px solid var(--line);
    border-radius: 18px;
    background: var(--paper);
    box-shadow: 0 2px 3px #20201f02, 0 12px 32px #20201f03;
}
[data-testid="stExpander"] {
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--paper);
    overflow: hidden;
}
[data-testid="stExpander"] summary {color: var(--ink); font-weight: 500; padding: .85rem 1rem;}
[data-testid="stMetric"] {
    background: var(--paper);
    border: 1px solid var(--line);
    padding: 1.35rem;
    border-radius: 14px;
}
[data-testid="stMetricValue"] {letter-spacing: -.045em;}
[data-testid="stAlert"] {border-radius: 12px;}
[data-testid="stWidgetLabel"] p {font-size: .875rem; font-weight: 600; color: var(--ink);}
[data-testid="stAppViewContainer"] :is(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea),
[data-testid="stAppViewContainer"] [data-baseweb="select"] > div {
    background: var(--paper) !important;
    color: var(--ink) !important;
    -webkit-text-fill-color: var(--ink) !important;
    caret-color: var(--crimson);
    border-radius: 9px;
}
[data-testid="stAppViewContainer"] :is([data-baseweb="input"], [data-baseweb="textarea"], [data-baseweb="select"] > div) {
    background: var(--paper) !important;
    border-color: #b6b3aa;
    border-radius: 9px;
    transition: border-color .25s var(--ease), box-shadow .25s var(--ease);
}
[data-testid="stAppViewContainer"] [data-baseweb="select"] :is(span, input) {
    color: var(--ink);
    -webkit-text-fill-color: var(--ink);
}
[data-testid="stAppViewContainer"] :is(input, textarea)::placeholder {
    color: #75716a !important;
    -webkit-text-fill-color: #75716a !important;
    opacity: 1;
}
[data-testid="stAppViewContainer"] :is(input, textarea):disabled {
    background: #eeede7 !important;
    color: #696762 !important;
    -webkit-text-fill-color: #696762 !important;
    opacity: 1;
}
[data-testid="stAppViewContainer"] :is([data-baseweb="input"], [data-baseweb="textarea"], [data-baseweb="select"]):focus-within {
    outline: 2px solid var(--ring);
    outline-offset: 3px;
}
[data-testid="stAppViewContainer"] :is(input, textarea)[aria-invalid="true"] {
    outline: 2px solid var(--crimson);
    outline-offset: 2px;
}
[data-testid="stAppViewContainer"] input:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 1000px var(--paper) inset !important;
    -webkit-text-fill-color: var(--ink) !important;
}
[data-baseweb="popover"] :is([role="listbox"], [role="option"]) {background: var(--paper); color: var(--ink);}
[data-baseweb="popover"] :is([role="option"]:hover, [aria-selected="true"]) {background: #f2e9e7; color: #8c202d;}
[data-testid="stButton"] button,
[data-testid="stFormSubmitButton"] button,
[data-testid="stLinkButton"] a {
    min-height: 2.9rem;
    padding: .6rem 1.15rem;
    border: 1px solid #d2cfc6;
    border-radius: 9px;
    background: var(--paper);
    color: var(--ink);
    font-weight: 600;
    transition: background .25s var(--ease), border-color .25s var(--ease), transform .35s var(--ease), box-shadow .35s var(--ease);
}
[data-testid="stAppViewContainer"] :is(button[kind="primary"], button[data-testid="stBaseButton-primary"], button[data-testid="stBaseButton-primaryFormSubmit"]) {
    background: var(--crimson) !important;
    border-color: var(--crimson);
    color: #fff !important;
}
[data-testid="stAppViewContainer"] :is(button[kind="primary"], button[data-testid="stBaseButton-primary"], button[data-testid="stBaseButton-primaryFormSubmit"]) p {color: inherit !important;}
[data-testid="stAppViewContainer"] button:disabled {
    opacity: .55;
    transform: none;
    box-shadow: none;
    cursor: not-allowed;
}
[data-testid="stAppViewContainer"] :is(button, a, input, textarea, [role="radio"], [role="tab"], summary):focus-visible {
    outline: 3px solid var(--ring);
    outline-offset: 4px;
}
[data-testid="stTabs"] [role="tablist"] {gap: 1.75rem; border-bottom: 1px solid var(--line);}
[data-testid="stTabs"] [role="tab"] {color: var(--muted); font-weight: 600; min-height: 3rem;}
[data-testid="stTabs"] [aria-selected="true"] {color: var(--crimson);}
[data-testid="stTabs"] [data-baseweb="tab-highlight"] {background: var(--crimson); height: 2px;}
[data-testid="stSidebar"] {
    background: #242625;
    border-right: 1px solid #383a38;
    --ring: #ffabb2;
}
[data-testid="stSidebar"] [data-testid="stSidebarContent"] {padding-top: 1.5rem;}
[data-testid="stSidebar"] :is(h1, h2, h3, p, label, small),
[data-testid="stSidebar"] [data-testid="stCaptionContainer"] {color: #eeeee8;}
[data-testid="stSidebar"] :is(h1, h2, h3) {letter-spacing: -.025em;}
[data-testid="stSidebar"] a {color: #ffabb2; text-underline-offset: .2em;}
[data-testid="stSidebar"] hr {border-color: #454742; margin: 1.5rem 0;}
[data-testid="stSidebar"] [data-testid="stRadio"] [role="radiogroup"] {gap: .35rem;}
[data-testid="stSidebar"] [data-testid="stRadio"] label {
    min-height: 2.9rem;
    padding: .7rem .85rem;
    border: 1px solid transparent;
    border-radius: 8px;
    transition: background .25s var(--ease), border-color .25s var(--ease);
}
[data-testid="stSidebar"] [data-testid="stRadio"] label:hover {background: #303330;}
[data-testid="stSidebar"] [data-testid="stRadio"] label:has(input:checked) {
    background: #353834;
    border-color: #565951;
    box-shadow: inset 2px 0 #ec8c95;
}
[data-testid="stSidebar"] [data-testid="stRadio"] label:has(input:checked) p {color: #fff; font-weight: 600;}
[data-testid="stSidebar"] [data-testid="stRadio"] label:has(input:focus-visible) {outline: 2px solid var(--ring); outline-offset: 2px;}
[data-testid="stSidebar"] [data-baseweb="select"] :is(div, span, input),
[data-testid="stSidebar"] :is(input, textarea) {color: var(--ink) !important; -webkit-text-fill-color: var(--ink) !important;}
[data-testid="stSidebar"] :is([data-baseweb="input"], [data-baseweb="textarea"], [data-baseweb="select"]) svg {color: #696762; fill: currentColor;}
[data-testid="stSidebar"] [data-testid="stButton"] button p {color: inherit;}
[data-testid="stSidebar"] :is([data-testid="stSidebarCollapseButton"], [data-testid="stBaseButton-headerNoPadding"]) {color: #eeeee8;}
.consultant-hero {
    position: relative;
    padding: clamp(2.5rem, 5vw, 4.75rem) 0 2.25rem;
    margin: 0 0 2.75rem;
    border-bottom: 1px solid var(--line);
    animation: workspace-enter .9s var(--ease) both;
}
.consultant-hero .hero-eyebrow {
    display: flex;
    align-items: center;
    gap: .75rem;
    margin: 0 0 2rem;
    color: var(--muted);
    font-size: .68rem;
    font-weight: 600;
    letter-spacing: .16em;
    line-height: 1.5;
}
.consultant-hero .hero-eyebrow::before {content: ""; width: 1.5rem; height: 2px; background: var(--crimson); flex-shrink: 0;}
[data-testid="stMain"] .consultant-hero h1 {
    max-width: 100%;
    padding: 0;
    margin: 0 0 1.75rem;
    color: var(--ink);
    font-size: clamp(2.8rem, 6.6vw, 5.9rem);
    font-weight: 600;
    letter-spacing: -.065em;
    line-height: 1.06;
    text-wrap: initial;
}
.consultant-hero h1 span {color: var(--crimson);}
.consultant-hero .hero-copy {
    max-width: 32rem;
    margin: 0;
    color: var(--muted);
    font-size: clamp(1rem, 1.5vw, 1.15rem);
    line-height: 1.7;
    text-wrap: pretty;
}
.consultant-hero .hero-capabilities {
    display: flex;
    flex-wrap: wrap;
    gap: .65rem 1.6rem;
    padding: 0;
    margin: 2.5rem 0 0;
    list-style: none;
}
.consultant-hero .hero-capabilities li {
    display: flex;
    align-items: center;
    gap: .6rem;
    color: #595750;
    font-size: .75rem;
    font-weight: 500;
    letter-spacing: .01em;
}
.consultant-hero .hero-capabilities li::before {content: ""; width: 4px; height: 4px; border-radius: 50%; background: #939087; flex-shrink: 0;}
@keyframes workspace-enter {
    from {opacity: 0; transform: translateY(12px);}
    to {opacity: 1; transform: translateY(0);}
}
@media (hover: hover) and (pointer: fine) {
    [data-testid="stButton"] button:not(:disabled):hover,
    [data-testid="stFormSubmitButton"] button:not(:disabled):hover,
    [data-testid="stLinkButton"] a:hover {
        background: #f0eee7;
        border-color: #aaa69b;
        color: var(--ink);
        transform: translateY(-1px);
        box-shadow: 0 3px 8px #20201f08;
    }
    [data-testid="stAppViewContainer"] :is(button[kind="primary"], button[data-testid="stBaseButton-primary"], button[data-testid="stBaseButton-primaryFormSubmit"]):not(:disabled):hover {
        background: #94202e !important;
        border-color: #94202e;
        color: #fff;
    }
}
@media (max-width: 900px) {
    [data-testid="stMainBlockContainer"], .main .block-container {padding: 2rem 1.75rem 3.5rem;}
}
@media (max-width: 600px) {
    [data-testid="stMainBlockContainer"], .main .block-container {padding: 1.5rem 1.1rem 3rem;}
    .consultant-hero {padding-top: 2rem; margin-bottom: 2rem;}
    [data-testid="stMain"] .consultant-hero h1 {font-size: clamp(2rem, 8.7vw, 3.25rem); letter-spacing: -.055em; line-height: 1.1;}
    .consultant-hero .hero-eyebrow {font-size: .6rem; letter-spacing: .12em; margin-bottom: 1.5rem;}
    .consultant-hero .hero-capabilities {gap: .55rem 1.1rem; margin-top: 1.75rem;}
    [data-testid="stForm"] {border-radius: 12px; padding: 1.1rem;}
    [data-testid="stTabs"] [role="tablist"] {gap: 1rem;}
}
@media (prefers-reduced-motion: reduce) {
    [data-testid="stAppViewContainer"],
    [data-testid="stAppViewContainer"] *,
    [data-testid="stAppViewContainer"] *::before,
    [data-testid="stAppViewContainer"] *::after {
        animation: none !important;
        transition: none !important;
        scroll-behavior: auto !important;
    }
}
</style>"""

_HERO = """<section class="consultant-hero" aria-labelledby="consultant-hero-title">
<p class="hero-eyebrow">THE CONSULTANT WORKSPACE</p>
<h1 id="consultant-hero-title">Less busywork.<br><span>More possibility.</span></h1>
<p class="hero-copy">Explore your knowledge, draft customer replies, and shape project scope. One considered workspace.</p>
<ul class="hero-capabilities" aria-label="Workspace capabilities" role="list">
<li>Source-aware answers</li>
<li>Human review</li>
<li>Project scoping</li>
</ul>
</section>"""


def apply_theme() -> None:
    """Apply the warm-white, charcoal, and restrained crimson stylesheet."""
    st.markdown(_THEME, unsafe_allow_html=True)


def render_hero() -> None:
    """Render the static editorial introduction without interpolated content."""
    st.markdown(_HERO, unsafe_allow_html=True)
