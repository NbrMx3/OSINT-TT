import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown, ArrowRight, ArrowUpRight, AtSign, BadgeCheck, Braces,
  ChevronRight, CircleDot, Database, FileText, Globe2, LockKeyhole,
  Mail, Menu, Network, Radar, Search, ShieldCheck, Sparkles, Target,
  Wifi, X,
} from "lucide-react";
import "./LandingPage.css";

const modules = [
  { icon: Globe2, name: "Domain intelligence", text: "Connect registration, DNS, certificate and website signals.", to: "/domain", tag: "Infrastructure" },
  { icon: Wifi, name: "IP intelligence", text: "Review address reputation, network ownership and public geolocation context.", to: "/ip", tag: "Infrastructure" },
  { icon: Mail, name: "Email intelligence", text: "Inspect domain email security and use authorized exposure checks.", to: "/email", tag: "Identity" },
  { icon: AtSign, name: "Username intelligence", text: "Find public profiles through supported platform APIs.", to: "/username", tag: "Identity" },
  { icon: ShieldCheck, name: "Threat intelligence", text: "Assess domains, IPs, URLs and file hashes against available sources.", to: "/threats", tag: "Threats" },
  { icon: Network, name: "Relationship mapping", text: "Explore attributed links between saved entities and evidence.", to: "/graph", tag: "Analysis" },
];

const workflow = [
  { number: "01", icon: Search, title: "Collect intelligence", text: "Gather records from public sources and authorized provider APIs." },
  { number: "02", icon: Braces, title: "Analyse findings", text: "Normalize results and retain source attribution and collection status." },
  { number: "03", icon: Network, title: "Discover relationships", text: "Correlate entities into an evidence-linked investigation graph." },
  { number: "04", icon: FileText, title: "Generate reports", text: "Share structured findings through PDF and data exports." },
];

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return <div className="landing-page">
    <header className="landing-nav">
      <div className="landing-nav-inner">
        <a className="landing-brand" href="#top" aria-label="OSINT-X home" onClick={closeMenu}>
          <span className="landing-brand-mark"><Radar size={20} /></span>
          <span>OSINT<span className="brand-cyan">-X</span></span>
        </a>
        <button className="landing-menu-toggle" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={`landing-links${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
          <a href="#top" onClick={closeMenu}>Home</a>
          <a href="#features" onClick={closeMenu}>Features</a>
          <a href="#modules" onClick={closeMenu}>Modules</a>
          <a href="#workflow" onClick={closeMenu}>How it works</a>
          <a href="#trust" onClick={closeMenu}>About</a>
          <div className="landing-mobile-actions"><Link className="landing-signin" to="/login" onClick={closeMenu}>Sign in</Link><Link className="landing-button landing-button-primary" to="/register" onClick={closeMenu}>Get started <ArrowRight size={15} /></Link></div>
        </nav>
        <div className="landing-nav-actions"><Link className="landing-signin" to="/login">Sign in</Link><Link className="landing-button landing-button-primary" to="/register">Get started <ArrowRight size={15} /></Link></div>
      </div>
    </header>

    <main id="top">
      <section className="landing-hero">
        <div className="landing-hero-grid" aria-hidden="true" />
        <div className="landing-hero-content">
          <div className="landing-eyebrow"><span className="eyebrow-pulse" /> Open source intelligence platform</div>
          <h1>Discover. Connect.<br /><span>Investigate.</span></h1>
          <p className="landing-hero-subtitle">Intelligence Beyond Boundaries.</p>
          <p className="landing-hero-copy">Unify publicly available intelligence sources, uncover digital relationships and transform fragmented information into actionable intelligence.</p>
          <div className="landing-hero-actions"><Link className="landing-button landing-button-primary landing-button-large" to="/register">Start an investigation <ArrowRight size={17} /></Link><a className="landing-button landing-button-secondary landing-button-large" href="#modules">Explore platform <ArrowDown size={16} /></a></div>
          <div className="landing-proof"><span><BadgeCheck size={14} /> Evidence linked</span><i /> <span><LockKeyhole size={13} /> Tenant scoped</span><i /> <span><Database size={14} /> Source attributed</span></div>
        </div>
        <NetworkIllustration />
        <a className="landing-scroll-cue" href="#features" aria-label="Scroll to platform features"><ArrowDown size={17} /></a>
      </section>

      <section className="landing-capabilities" id="features">
        <div className="landing-capability"><span className="capability-icon"><CircleDot size={17} /></span><div><strong>6</strong><span>focused intelligence modules</span></div></div>
        <div className="landing-capability"><span className="capability-icon"><Target size={17} /></span><div><strong>4</strong><span>steps from collection to report</span></div></div>
        <div className="landing-capability"><span className="capability-icon"><FileText size={17} /></span><div><strong>3</strong><span>report formats: PDF, JSON, CSV</span></div></div>
        <div className="landing-capability capability-note"><span className="capability-icon"><Sparkles size={17} /></span><div><strong>Evidence first</strong><span>observations keep source and context</span></div></div>
      </section>

      <section className="landing-section landing-modules" id="modules">
        <div className="section-heading"><div><p className="section-kicker">A connected investigation workspace</p><h2>One platform. <span>Multiple signals.</span></h2><p className="section-intro">Move from an indicator to a structured investigation, with the source and limits of each result kept in view.</p></div><Link className="section-link" to="/register">Open your workspace <ArrowUpRight size={15} /></Link></div>
        <div className="landing-module-grid">{modules.map(({ icon: Icon, name, text, to, tag }) => <article className="landing-module-card" key={name}><div className="module-card-top"><span className="module-icon"><Icon size={19} /></span><span className="module-tag">{tag}</span></div><h3>{name}</h3><p>{text}</p><Link to={to} aria-label={`Learn more about ${name}`}><span>Explore module</span><ChevronRight size={15} /></Link></article>)}</div>
      </section>

      <section className="landing-graph-section" aria-labelledby="graph-title">
        <div className="landing-graph-copy"><p className="section-kicker">See the connections</p><h2 id="graph-title">Turn separate clues into a <span>clearer picture.</span></h2><p>Explore a visual map of entities and their supporting evidence. Relationships show where information came from and how strongly sources support a connection.</p><ul><li><BadgeCheck size={15} /> Evidence attached to relationships</li><li><BadgeCheck size={15} /> Confidence factors shown transparently</li><li><BadgeCheck size={15} /> Shared identifiers treated as leads</li></ul><Link className="landing-button landing-button-secondary" to="/register">Explore relationship mapping <ArrowRight size={15} /></Link></div>
        <GraphIllustration />
      </section>

      <section className="landing-section landing-workflow" id="workflow">
        <div className="section-heading section-heading-centered"><div><p className="section-kicker">A practical workflow</p><h2>From first signal to <span>useful report.</span></h2><p className="section-intro">Keep collection, analysis and reporting in a single, traceable process.</p></div></div>
        <div className="landing-workflow-grid">{workflow.map(({ number, icon: Icon, title, text }) => <article className="workflow-step" key={number}><div className="workflow-top"><span className="workflow-number">{number}</span><span className="workflow-icon"><Icon size={18} /></span></div><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="landing-trust" id="trust">
        <div className="trust-heading"><p className="section-kicker">Designed for responsible analysis</p><h2>Context matters as much as the finding.</h2><p>OSINT-X keeps collection provenance and investigative limits close to the results, so analysts can review what a signal does—and does not—show.</p></div>
        <div className="trust-grid"><TrustItem icon={Globe2} title="Public and authorized sources" text="Collectors use public records and configured provider integrations." /><TrustItem icon={BadgeCheck} title="Evidence provenance" text="Findings retain source references, collection times and availability." /><TrustItem icon={LockKeyhole} title="Scoped workspaces" text="Investigation records are isolated by tenant and protected by roles." /><TrustItem icon={FileText} title="Auditable activity" text="Investigation history and analyst activity support review and reporting." /></div>
      </section>

      <section className="landing-cta"><div className="cta-orbit" aria-hidden="true" /><div><p className="section-kicker">Build a clearer picture</p><h2>Turn public information<br /><span>into intelligence.</span></h2><p>Start exploring a unified environment for open-source intelligence and digital investigations.</p><div className="landing-hero-actions"><Link className="landing-button landing-button-primary landing-button-large" to="/register">Get started <ArrowRight size={16} /></Link><a className="landing-button landing-button-secondary landing-button-large" href="#modules">Explore features <ArrowDown size={15} /></a></div></div></section>
    </main>

    <footer className="landing-footer"><div className="footer-main"><div className="footer-brand-block"><a className="landing-brand" href="#top"><span className="landing-brand-mark"><Radar size={19} /></span><span>OSINT<span className="brand-cyan">-X</span></span></a><p>A focused workspace for collecting, connecting and reporting open-source intelligence.</p></div><div className="footer-column"><h3>Platform</h3><a href="#features">Capabilities</a><a href="#modules">Intelligence modules</a><a href="#workflow">How it works</a><Link to="/register">Create workspace</Link></div><div className="footer-column"><h3>Workspace</h3><Link to="/login">Sign in</Link><Link to="/register">Get started</Link><Link to="/graph">Relationship mapping</Link><Link to="/reports">Reporting</Link></div><div className="footer-note"><span className="footer-status"><span /> Platform workspace</span><p>Use responsibly. Results reflect available sources and should be assessed in context.</p></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} OSINT-X</span><span>Open-source intelligence, with context.</span></div></footer>
  </div>;
}

function NetworkIllustration() {
  return <div className="hero-visual" aria-label="Illustration of connected intelligence entities">
    <div className="visual-topbar"><span><span className="live-dot" /> NETWORK OVERVIEW</span><span>ILLUSTRATIVE VIEW</span></div>
    <svg className="hero-network" viewBox="0 0 720 480" role="img" aria-labelledby="network-title">
      <title id="network-title">Illustrative network of connected domain, address, email and organization entities</title>
      <defs><radialGradient id="globeGlow"><stop stopColor="#0b5a9b" stopOpacity=".34" /><stop offset="1" stopColor="#05101e" stopOpacity="0" /></radialGradient><linearGradient id="lineGlow"><stop stopColor="#07d9ff" stopOpacity=".08" /><stop offset=".5" stopColor="#22a7ff" stopOpacity=".8" /><stop offset="1" stopColor="#07d9ff" stopOpacity=".08" /></linearGradient><filter id="softGlow"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
      <circle cx="393" cy="239" r="214" fill="url(#globeGlow)" /><circle className="radar-ring ring-one" cx="393" cy="239" r="162" /><circle className="radar-ring ring-two" cx="393" cy="239" r="125" /><circle className="radar-ring ring-three" cx="393" cy="239" r="82" />
      <g className="network-lines" stroke="url(#lineGlow)" strokeWidth="1.4"><path d="M133 320 221 170 322 250 393 239 510 131 588 218 516 327 393 239 293 380 221 170 460 376 510 131 322 250 588 218" /><path d="M133 320 293 380 516 327 588 218 460 376 322 250 221 170" opacity=".55" /><path d="M221 170 393 239 460 376M133 320 322 250 510 131M293 380 393 239 588 218" opacity=".35" /></g>
      <g className="map-specks" fill="#45bafa"><circle cx="393" cy="78" r="2"/><circle cx="521" cy="123" r="1.5"/><circle cx="555" cy="320" r="1.6"/><circle cx="250" cy="300" r="1.4"/><circle cx="450" cy="160" r="1.2"/><circle cx="328" cy="105" r="1.3"/><circle cx="275" cy="220" r="1.4"/><circle cx="403" cy="348" r="1.5"/><circle cx="493" cy="277" r="1.4"/><circle cx="337" cy="304" r="1.2"/></g>
      <g className="network-nodes" filter="url(#softGlow)"><Node x={133} y={320} label="EMAIL" sub="analyst@…" /><Node x={221} y={170} label="DOMAIN" sub="northstar.io" /><Node x={322} y={250} label="ORGANIZATION" sub="Northstar Group" /><Node x={393} y={239} label="CORRELATION" sub="Evidence link" main /><Node x={510} y={131} label="IP ADDRESS" sub="203.0.113.42" /><Node x={588} y={218} label="DOMAIN" sub="portal.example" /><Node x={516} y={327} label="HOSTNAME" sub="edge-01.example" /><Node x={293} y={380} label="PUBLIC PROFILE" sub="@northstar" /><Node x={460} y={376} label="NETWORK" sub="AS64500" /></g>
      <g className="illustration-labels"><text x="48" y="431">ENTITY RELATIONSHIPS</text><text x="48" y="449">Illustrative graph · not live investigation data</text></g>
    </svg>
    <div className="visual-foot"><span><i className="legend-dot dot-domain" /> Infrastructure</span><span><i className="legend-dot dot-identity" /> Identity</span><span><i className="legend-dot dot-link" /> Evidence relationship</span></div>
  </div>;
}

function Node({ x, y, label, sub, main = false }: { x: number; y: number; label: string; sub: string; main?: boolean }) {
  return <g className={`entity-node${main ? " entity-node-main" : ""}`} transform={`translate(${x} ${y})`}><circle className="node-halo" r={main ? 17 : 11} /><circle className="node-core" r={main ? 6 : 4.5} /><text className="node-label" x="13" y="-4">{label}</text><text className="node-sub" x="13" y="8">{sub}</text></g>;
}

function GraphIllustration() {
  return <div className="graph-preview" aria-label="Illustrative map connecting a domain, IP, email and organization"><div className="graph-preview-head"><span><Network size={15} /> CORRELATION MAP</span><span className="preview-badge">ILLUSTRATIVE</span></div><svg viewBox="0 0 560 340" role="img" aria-label="Connected domain, IP address, email and organization nodes"><defs><filter id="graphGlow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g className="graph-edges"><path d="M131 91 278 151 424 81M131 91 168 254 278 151 398 256 424 81M168 254 398 256"/><path d="M131 91 398 256M424 81 168 254" className="graph-edge-muted"/></g><g className="graph-node graph-node-domain" transform="translate(131 91)" filter="url(#graphGlow)"><circle r="27"/><Globe2 x="-9" y="-9" width="18" height="18"/><text y="48">domain</text></g><g className="graph-node graph-node-org" transform="translate(278 151)" filter="url(#graphGlow)"><circle r="34"/><Target x="-10" y="-10" width="20" height="20"/><text y="56">organization</text></g><g className="graph-node graph-node-ip" transform="translate(424 81)" filter="url(#graphGlow)"><circle r="27"/><Wifi x="-9" y="-9" width="18" height="18"/><text y="48">IP address</text></g><g className="graph-node graph-node-email" transform="translate(168 254)" filter="url(#graphGlow)"><circle r="25"/><Mail x="-8" y="-8" width="16" height="16"/><text y="46">email</text></g><g className="graph-node graph-node-net" transform="translate(398 256)" filter="url(#graphGlow)"><circle r="25"/><Database x="-8" y="-8" width="16" height="16"/><text y="46">network</text></g></svg><div className="graph-preview-legend"><span><i className="legend-dot dot-domain"/> Domain</span><span><i className="legend-dot dot-identity"/> Identity</span><span><i className="legend-dot dot-link"/> Infrastructure</span></div></div>;
}

function TrustItem({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) { return <article className="trust-item"><span><Icon size={18} /></span><div><h3>{title}</h3><p>{text}</p></div></article>; }

export default LandingPage;
