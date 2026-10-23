import { useEffect, useState } from 'react';
import { navigateTo, normalizePathname, useLocationKey } from './routing.js';
import { validateContactForm } from './contactForm.js';
import { BLOG_ARTICLES } from './blogArticles.js';
import { SITE_METADATA } from './siteMetadata.js';
import './site.css';

const PAGE_LINKS = [
  { path: '/', label: 'Home' },
  { path: '/about', label: 'About Us' },
  { path: '/contact', label: 'Contact Us' },
  { path: '/blog', label: 'Blog' },
  { path: '/privacy-policy', label: 'Privacy Policy' },
  { path: '/terms-and-conditions', label: 'Terms' }
];

function brandLogo(theme) {
  return theme === 'dark' ? '/brand/my-finance-light.svg' : '/brand/my-finance-dark.svg';
}

const FEATURES = [
  { icon: 'arrows', number: '01', title: 'Track income and expenses', text: 'Record money coming in and going out with clear categories, dates, and optional notes.' },
  { icon: 'search', number: '02', title: 'Find a transaction', text: 'Search descriptions and categories, then filter by transaction type or category.' },
  { icon: 'balance', number: '03', title: 'See your financial summary', text: 'Review recorded income, expenses, net balance, and savings rate in one place.' },
  { icon: 'chart', number: '04', title: 'Understand spending', text: 'Explore expense categories, recent activity, and a six-month spending trend.' }
];

function SiteIcon({ name, size = 20 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    arrows: <><path d="M7 7h12l-3-3" /><path d="M19 7l-3 3M17 17H5l3 3" /><path d="m5 17 3-3" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    balance: <><path d="M3 8h18M5 8V5l7-3 7 3v3M5 8v11m14-11v11M3 21h18" /><path d="M9 12h6m-6 3h6" /></>,
    chart: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 6-7" /></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    moon: <path d="M20.6 14.2A8.7 8.7 0 0 1 9.8 3.4 8.9 8.9 0 1 0 20.6 14.2Z" />,
    book: <><path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4Z" /><path d="M4 17a3 3 0 0 1 3-3h12M8 8h7" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />
  };
  return <svg {...common}>{paths[name] || paths.arrow}</svg>;
}

function SiteLink({ href, onClick, children, ...props }) {
  const handleClick = event => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target || props.download || !href.startsWith('/')) return;
    event.preventDefault();
    navigateTo(href);
    if (!href.includes('#')) window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return <a href={href} onClick={handleClick} {...props}>{children}</a>;
}

function SiteHeader({ path, theme, setTheme, user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return undefined;
    const change = event => setSystemDark(event.matches);
    media.addEventListener?.('change', change);
    return () => media.removeEventListener?.('change', change);
  }, []);
  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
  const toggleTheme = () => { void setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'); };
  const ctaPath = user ? '/app' : '/login';
  const ctaLabel = user ? 'Open dashboard' : 'Sign in';

  return <header className="site-header">
    <div className="site-header-inner">
      <SiteLink className="site-brand" href="/" aria-label="My Finance home">
        <img className="site-brand-logo" src={brandLogo(resolvedTheme)} alt="My Finance" width="190" height="42" />
      </SiteLink>
      <nav id="site-primary-navigation" className={`site-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Website navigation">
        {PAGE_LINKS.map(link => { const current = path === link.path || (link.path === '/blog' && path.startsWith('/blog/')); return <SiteLink key={link.path} href={link.path} className={current ? 'is-current' : ''} aria-current={current ? 'page' : undefined} onClick={() => setMenuOpen(false)}>{link.label}</SiteLink>; })}
        <SiteLink className="site-nav-mobile-cta" href={ctaPath} onClick={() => setMenuOpen(false)}>{user ? 'Open dashboard' : 'Get started'} <SiteIcon name="arrow" size={16} /></SiteLink>
      </nav>
      <div className="site-header-actions">
        <button className="site-theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}><SiteIcon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} size={19} /></button>
        <SiteLink className="site-button site-button-primary site-header-cta" href={ctaPath}>{ctaLabel}<SiteIcon name="arrow" size={16} /></SiteLink>
        <button className="site-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="site-primary-navigation" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} onClick={() => setMenuOpen(open => !open)}><SiteIcon name={menuOpen ? 'close' : 'menu'} size={20} /></button>
      </div>
    </div>
  </header>;
}

function SiteFooter({ theme }) {
  return <footer className="site-footer">
    <div className="site-footer-main">
      <div className="site-footer-brand"><SiteLink className="site-brand" href="/" aria-label="My Finance home"><img className="site-footer-logo" src={brandLogo(theme)} alt="My Finance" width="190" height="42" /></SiteLink><p>A clearer view of the money you record.</p></div>
      <div className="site-footer-links" aria-label="Footer navigation">{PAGE_LINKS.map(link => <SiteLink key={link.path} href={link.path}>{link.label}</SiteLink>)}</div>
    </div>
    <div className="site-footer-bottom"><span>© {new Date().getFullYear()} My Finance</span><span>Personal finance tracking and organization</span></div>
  </footer>;
}

function PageIntro({ eyebrow, title, description }) {
  return <header className="site-page-intro"><span className="site-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></header>;
}

function HomePage({ user }) {
  return <>
    <section className="site-hero">
      <div className="site-hero-copy"><span className="site-eyebrow"><i /> Personal finance, with more clarity</span><h1>A clearer picture of your money <em>starts here.</em></h1><p>Keep the income and expenses you record together, understand your spending, and make room for more thoughtful money habits.</p>
        <div className="site-hero-actions"><SiteLink className="site-button site-button-primary site-button-large" href={user ? '/app' : '/signup'}>{user ? 'Open dashboard' : 'Get started'}<SiteIcon name="arrow" size={18} /></SiteLink><SiteLink className="site-button site-button-secondary site-button-large" href="/about">Learn more</SiteLink></div>
        <div className="site-hero-note"><SiteIcon name="shield" size={17} /><span>Your account and transaction records stay connected to your existing My Finance account.</span></div>
      </div>
      <div className="site-hero-visual" aria-label="A visual summary of My Finance features">
        <div className="site-orbit orbit-one" /><div className="site-orbit orbit-two" />
        <div className="site-preview-card">
          <div className="site-preview-top"><span className="site-preview-mark">₨</span><span>MY FINANCE <small>YOUR MONEY, ORGANIZED</small></span><span className="site-preview-dots" aria-hidden="true">•••</span></div>
          <div className="site-preview-label">A more thoughtful view</div>
          <div className="site-preview-rows"><div><span className="preview-dot income-dot" /><span>Income tracking</span><b>01</b></div><div><span className="preview-dot expense-dot" /><span>Expense categories</span><b>02</b></div><div><span className="preview-dot report-dot" /><span>Spending reports</span><b>03</b></div></div>
          <div className="site-preview-flow" aria-label="Record, review, and reflect"><span>Record</span><i /><span>Review</span><i /><span>Reflect</span></div>
          <div className="site-preview-caption"><span>Built around your records</span><span><SiteIcon name="shield" size={14} /> PRIVATE</span></div>
        </div>
        <div className="site-float-tag"><span className="site-float-icon"><SiteIcon name="chart" size={17} /></span><span><strong>Reports that make sense</strong><small>Clear categories. Useful trends.</small></span></div>
      </div>
    </section>

    <section className="site-trust-strip" aria-label="Product principles"><span><i /> Your records</span><b>·</b><span>One organized view</span><b>·</b><span>PKR currency support</span><b>·</b><span>No invented numbers</span></section>

    <section className="site-section" id="features"><div className="site-section-heading"><div><span className="site-eyebrow">Designed around everyday finances</span><h2>Everything you need to <em>see the full picture.</em></h2></div><p>Simple tools to help you record activity and understand where your money goes.</p></div>
      <div className="site-feature-grid">{FEATURES.map(feature => <article className="site-feature-card" key={feature.number}><div className="site-feature-top"><span className="site-feature-icon"><SiteIcon name={feature.icon} size={20} /></span><small>{feature.number}</small></div><h3>{feature.title}</h3><p>{feature.text}</p></article>)}</div>
    </section>

    <section className="site-how" id="how-it-works"><div className="site-how-heading"><span className="site-eyebrow">A simple rhythm</span><h2>From daily entries to <em>useful insight.</em></h2><p>Start with what you know. My Finance organizes the records you add.</p></div>
      <div className="site-steps"><article><span>01</span><div><h3>Create or sign in</h3><p>Use your existing My Finance account to access your private records.</p></div></article><article><span>02</span><div><h3>Record activity</h3><p>Add income and expenses with an amount, category, date, and optional description.</p></div></article><article><span>03</span><div><h3>Review your reports</h3><p>Use your balance summary, category breakdown, and monthly spending trend to reflect on your records.</p></div></article></div>
    </section>

    <section className="site-cta-band"><div><span className="site-eyebrow">A little more clarity goes a long way</span><h2>Make your money easier to understand.</h2><p>Your records, thoughtfully organized in one place.</p></div><SiteLink className="site-button site-button-light site-button-large" href={user ? '/app' : '/signup'}>{user ? 'Open dashboard' : 'Get started'}<SiteIcon name="arrow" size={18} /></SiteLink></section>
  </>;
}

function AboutPage({ user }) {
  return <div className="site-reading-page">
    <PageIntro eyebrow="About My Finance" title="A practical place to understand your everyday money." description="My Finance is a personal finance tracker designed to help you organize the transactions you choose to record." />
    <section className="site-reading-card"><span className="site-reading-number">01</span><div><h2>Money organization, made clearer</h2><p>My Finance brings recorded income and expenses into one dashboard. Each transaction can include an amount, category, date, and description, so your activity is easier to review over time.</p></div></section>
    <section className="site-reading-card"><span className="site-reading-number">02</span><div><h2>Useful summaries from your own records</h2><p>The app calculates totals, net balance, savings rate, and expense category shares from the transactions in your account. Reports include a category breakdown and a six-month expense trend. My Finance does not add sample transactions to your account.</p></div></section>
    <section className="site-reading-card"><span className="site-reading-number">03</span><div><h2>Built for usability and privacy</h2><p>Search, type and category filters help you find activity. Email and password authentication is handled by Supabase. Transaction records use the existing user-scoped database policies, and the app keeps the same account across web and Android.</p></div></section>
    <section className="site-reading-callout"><SiteIcon name="shield" size={22} /><div><h2>Your records remain yours to manage</h2><p>Export a backup, import validated records, delete individual transactions, or clear transaction rows from your account in Settings.</p></div></section>
    <div className="site-page-cta"><div><h2>Ready to get organized?</h2><p>Sign in to continue with your records or create an account.</p></div><SiteLink className="site-button site-button-primary" href={user ? '/app' : '/signup'}>{user ? 'Open dashboard' : 'Get started'}<SiteIcon name="arrow" size={17} /></SiteLink></div>
  </div>;
}

const EMPTY_CONTACT = { name: '', email: '', subject: '', message: '' };
function ContactPage() {
  const [form, setForm] = useState(EMPTY_CONTACT);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: '', text: '' });
  const [sending, setSending] = useState(false);

  const update = event => {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
    setErrors(current => ({ ...current, [name]: '' }));
    setStatus({ type: '', text: '' });
  };

  const submit = async event => {
    event.preventDefault();
    const nextErrors = validateContactForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setStatus({ type: 'error', text: 'Please correct the highlighted fields.' });
      return;
    }

    const endpoint = String(import.meta.env.VITE_CONTACT_FORM_ENDPOINT || '').trim();
    if (!endpoint) {
      setStatus({ type: 'error', text: 'Your message was not sent or saved. Message delivery is not configured yet; the site owner needs to connect a secure contact endpoint.' });
      return;
    }

    let target;
    try { target = new URL(endpoint, window.location.origin); }
    catch { setStatus({ type: 'error', text: 'The contact endpoint is not configured with a valid URL.' }); return; }
    if (window.location.protocol === 'https:' && target.protocol !== 'https:') {
      setStatus({ type: 'error', text: 'The contact endpoint must use HTTPS on this site.' });
      return;
    }

    setSending(true);
    setStatus({ type: 'loading', text: 'Submitting your message…' });
    try {
      const response = await fetch(target.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), subject: form.subject.trim(), message: form.message.trim() })
      });
      if (!response.ok || !response.headers.get('content-type')?.toLowerCase().includes('application/json')) throw new Error('The contact service did not return a valid acknowledgement.');
      setForm(EMPTY_CONTACT);
      setStatus({ type: 'success', text: 'The configured contact service accepted your message.' });
    } catch {
      setStatus({ type: 'error', text: 'We could not submit your message. It has not been confirmed as received; please try again later.' });
    } finally { setSending(false); }
  };

  return <div className="site-reading-page contact-page">
    <PageIntro eyebrow="Contact Us" title="We’d be glad to hear from you." description="Use this form for questions or feedback about My Finance. Please do not include passwords, account recovery links, or sensitive financial details." />
    <div className="contact-layout">
      <aside className="contact-aside"><span className="contact-aside-icon"><SiteIcon name="shield" size={23} /></span><h2>Get in touch.</h2><p>For questions or feedback, email My Finance. Please do not send passwords, account recovery links, or sensitive financial details.</p><a className="contact-email-link" href="mailto:askhmzkiani@gmail.com">askhmzkiani@gmail.com</a><div className="contact-aside-note"><strong>Contact form delivery</strong><span>The form below needs a secure endpoint configured by the site owner. Email is available now through your mail app.</span></div></aside>
      <form className="contact-form" onSubmit={submit} noValidate>
        <div className="contact-fields-row">
          <label className="site-field"><span>Name</span><input name="name" autoComplete="name" value={form.name} onChange={update} required aria-invalid={!!errors.name} aria-describedby={errors.name ? 'contact-name-error' : undefined} />{errors.name && <small id="contact-name-error" className="site-field-error">{errors.name}</small>}</label>
          <label className="site-field"><span>Email</span><input name="email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={update} required aria-invalid={!!errors.email} aria-describedby={errors.email ? 'contact-email-error' : undefined} />{errors.email && <small id="contact-email-error" className="site-field-error">{errors.email}</small>}</label>
        </div>
        <label className="site-field"><span>Subject</span><input name="subject" maxLength={160} value={form.subject} onChange={update} required aria-invalid={!!errors.subject} aria-describedby={errors.subject ? 'contact-subject-error' : undefined} />{errors.subject && <small id="contact-subject-error" className="site-field-error">{errors.subject}</small>}</label>
        <label className="site-field"><span>Message</span><textarea name="message" rows={6} maxLength={4000} value={form.message} onChange={update} required aria-invalid={!!errors.message} aria-describedby={errors.message ? 'contact-message-error' : undefined} /><small className="site-field-hint">Up to 4,000 characters</small>{errors.message && <small id="contact-message-error" className="site-field-error">{errors.message}</small>}</label>
        {status.text && <div className={`contact-status status-${status.type}`} role={status.type === 'error' ? 'alert' : 'status'} aria-live="polite">{status.type === 'loading' && <span className="contact-spinner" aria-hidden="true" />}{status.text}</div>}
        <button className="site-button site-button-primary contact-submit" type="submit" disabled={sending}>{sending ? 'Submitting…' : 'Send message'}<SiteIcon name="arrow" size={17} /></button>
        <p className="contact-form-footnote">Submitting sends these fields only to the configured contact endpoint. If no endpoint is configured, nothing is transmitted or stored.</p>
      </form>
    </div>
  </div>;
}

function LegalOwnerNote() {
  return <div className="legal-owner-note"><strong>Owner review required before publication</strong><span>Add the responsible legal name, governing jurisdiction, and effective date, and have the final copy reviewed for applicable law. The contact email shown on this site was supplied by the owner.</span></div>;
}

function PrivacyPage() {
  return <div className="site-reading-page legal-page">
    <PageIntro eyebrow="Privacy Policy" title="Your information and how My Finance handles it." description="This policy describes the current My Finance application based on its implementation. It needs owner review before being treated as a final legal policy." />
    <LegalOwnerNote />
    <p className="legal-updated">Effective date: to be supplied by the owner.</p>
    <section className="legal-section"><h2>Information you provide</h2><p>When you create an account, you provide your name, email address, and password to Supabase Authentication. My Finance does not save or log your password itself. When you add a transaction, the app processes its type, amount, category, date, description, and record identifiers. Theme choice and any legacy device records are stored on that device.</p></section>
    <section className="legal-section"><h2>How the information is used</h2><p>Account information supports registration and sign-in. Transaction records are used to show the dashboard, transaction history, totals, category breakdowns, and spending reports. These summaries are calculated from the records in your account; the app does not create sample entries in a signed-in account.</p></section>
    <section className="legal-section"><h2>Storage and service providers</h2><p>Authenticated transaction records are stored in the existing Supabase Postgres project used by this app. Supabase also handles email and password authentication. The hosted web application may be served by Vercel when deployed there. The Android app uses the same Supabase project. The browser stores the Supabase session in browser local storage; the Android application uses its native secure-storage plugin. Theme preference and legacy local transaction data may be stored on the device.</p><p>The public website includes finance education articles and does not currently include analytics or advertising integrations. Website hosting providers may process technical request information as part of delivering the site; review the provider's current privacy information. If a contact endpoint is configured, contact form fields are sent to that endpoint; update this policy with the endpoint operator and retention details before enabling it. With no endpoint configured, contact messages are neither transmitted nor saved by the form. Email links open the visitor's chosen email application.</p></section>
    <section className="legal-section"><h2>Access controls</h2><p>The application queries and writes transaction rows with the signed-in user ID. The included database migration enables RLS and defines separate owner checks for reading, creating, updating, and deleting rows. These safeguards depend on the deployed database retaining the policies and grants expected by the app. The publishable key is used in the client; a service-role key is not used by the frontend.</p></section>
    <section className="legal-section"><h2>Retention and deletion</h2><p>Transaction rows remain in the account until you delete them individually or use the Settings action to clear account transactions, or until the database owner applies another retention action. Signing out does not delete account data. My Finance currently has no in-app account deletion workflow. Device-local records can remain on the device, and clearing account rows does not remove those local copies. Supabase's applicable project retention and backup practices also affect stored data.</p></section>
    <section className="legal-section"><h2>Security and your choices</h2><p>The app uses Supabase authentication and database access rules, but no internet service can promise perfect security. Keep your device and account credentials protected, sign out on shared devices, and avoid placing highly sensitive details in transaction descriptions. You can export a JSON backup, delete transaction records in the app, or stop using the service. Browser session storage is available to the browser profile on that device.</p></section>
    <section className="legal-section"><h2>Policy updates and contact</h2><p>This policy may need updates when the app or its service providers change. The owner should publish a revised effective date and final legal details. For privacy questions, email <a href="mailto:askhmzkiani@gmail.com">askhmzkiani@gmail.com</a>. The legal operator identity and jurisdiction still require owner review.</p></section>
  </div>;
}

function TermsPage() {
  return <div className="site-reading-page legal-page">
    <PageIntro eyebrow="Terms and Conditions" title="Clear expectations for using My Finance." description="These draft terms describe the current finance-tracking application and require review by the project owner before publication." />
    <LegalOwnerNote />
    <p className="legal-updated">Effective date: to be supplied by the owner.</p>
    <section className="legal-section"><h2>1. Acceptance</h2><p>By creating an account or using My Finance, you agree to use the application in accordance with these terms and any applicable rules for the service. The owner should supply the legal identity and governing jurisdiction before making these terms final.</p></section>
    <section className="legal-section"><h2>2. What the app does</h2><p>My Finance is a personal finance organization and tracking tool. It records user-entered transactions and calculates summaries and reports from those records. It is not a bank, financial adviser, tax adviser, investment adviser, payment processor, or source of professional financial advice. It does not move or hold your money.</p></section>
    <section className="legal-section"><h2>3. Appropriate use and account responsibility</h2><p>Use an account you are authorized to access. Keep your sign-in details private, use a device you trust, and notify the account provider if you believe your account has been accessed without permission. Do not attempt to disrupt the app, bypass access controls, or use another person's financial records without authorization.</p></section>
    <section className="legal-section"><h2>4. Your records and decisions</h2><p>You are responsible for the accuracy and completeness of amounts, categories, dates, and descriptions you enter. Calculations and charts reflect the records currently available to the app and may be incomplete if records are missing or incorrect. Review important financial, tax, and investment decisions with an appropriately qualified professional.</p></section>
    <section className="legal-section"><h2>5. Availability and changes</h2><p>The web app and its Supabase services require network access for sign-in and account records. Availability may be affected by maintenance, service-provider outages, connectivity, or changes to the application. Features and the app may change over time. The owner should review this section against the intended service commitments before publication.</p></section>
    <section className="legal-section"><h2>6. Account access and data</h2><p>You can sign out, delete individual transactions, or clear your account's transaction rows in Settings. Clearing transaction rows is destructive and confirmed in the app. There is currently no in-app account suspension, account deletion, or full account termination workflow; signing out does not delete your data. Contact the project owner through a configured support method for account-level requests.</p></section>
    <section className="legal-section"><h2>7. Intellectual property</h2><p>My Finance includes project code, visual design, and third-party open-source software. Rights to the original project materials depend on their actual ownership and licenses. These draft terms do not grant rights to third-party materials or resolve ownership questions; the owner should review and state the applicable ownership terms.</p></section>
    <section className="legal-section"><h2>8. Limitations</h2><p>My Finance is provided as a tracking tool, without a promise that it will be continuously available or suitable for a particular financial purpose. To the extent allowed by applicable law, the owner should specify any limitations of liability and warranties that apply. This clause requires legal review; no jurisdiction or legal guarantees have been supplied.</p></section>
    <section className="legal-section"><h2>9. Updates and contact</h2><p>Updated terms should be published with a new effective date. The project owner must provide a legal operator name and governing jurisdiction. For questions about My Finance, email <a href="mailto:askhmzkiani@gmail.com">askhmzkiani@gmail.com</a>. The supplied email is a contact channel, not a statement of legal identity.</p></section>
  </div>;
}

function ArticleImage({ article, compact = false }) {
  const [missing, setMissing] = useState(false);
  return <div className={`blog-image ${compact ? 'blog-image-compact' : ''} ${missing ? 'blog-image-missing' : ''}`}>
    {missing
      ? <div className="blog-image-pending" aria-label="Article image will be added by the site owner"><span className="blog-image-pending-mark"><SiteIcon name="book" size={22} /></span><span>Article image pending</span></div>
      : <img src={article.image} alt={article.alt} loading="lazy" onError={() => setMissing(true)} />}
    <span className="blog-image-category">{article.category}</span>
  </div>;
}

function ArticleCard({ article }) {
  return <article className="blog-card">
    <SiteLink className="blog-card-image-link" href={`/blog/${article.slug}`} aria-label={`Read ${article.title}`}><ArticleImage article={article} compact /></SiteLink>
    <div className="blog-card-copy"><div className="blog-card-meta"><span>{article.category}</span><i aria-hidden="true">·</i><span>{article.readTime}</span></div><h2><SiteLink href={`/blog/${article.slug}`}>{article.title}</SiteLink></h2><p>{article.excerpt}</p><SiteLink className="blog-read-link" href={`/blog/${article.slug}`}>Read article <SiteIcon name="arrow" size={16} /></SiteLink></div>
  </article>;
}

function BlogPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const categories = [...new Set(BLOG_ARTICLES.map(article => article.category))];
  const normalizedQuery = query.trim().toLowerCase();
  const matches = BLOG_ARTICLES.filter(article => (category === 'all' || article.category === category)
    && (!normalizedQuery || `${article.title} ${article.excerpt} ${article.category}`.toLowerCase().includes(normalizedQuery)));

  return <div className="blog-page">
    <section className="blog-hero"><div className="blog-hero-copy"><span className="site-eyebrow"><i /> The My Finance journal</span><h1>Small steps. <em>Clearer money habits.</em></h1><p>Practical guides for planning a budget, understanding spending, and building routines that fit real life.</p></div><div className="blog-hero-note"><SiteIcon name="book" size={20} /><span><strong>Useful, independent reading</strong><small>Clear explanations, practical examples, and no promises of guaranteed results.</small></span></div></section>
    <section className="blog-library" aria-labelledby="blog-library-heading"><div className="blog-library-heading"><div><span className="site-eyebrow">Ideas for everyday finances</span><h2 id="blog-library-heading">Explore the journal</h2><p>Every guide is written to help you make your own informed decisions.</p></div><span className="blog-count">{matches.length} {matches.length === 1 ? 'article' : 'articles'}</span></div>
      <div className="blog-filters"><label className="blog-search-field"><SiteIcon name="search" size={18} /><span className="visually-hidden">Search articles</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search the journal" /></label><label className="blog-category-field"><span className="visually-hidden">Filter by category</span><select value={category} onChange={event => setCategory(event.target.value)}><option value="all">All topics</option>{categories.map(item => <option key={item} value={item}>{item}</option>)}</select></label></div>
      {matches.length ? <div className="blog-grid">{matches.map(article => <ArticleCard key={article.slug} article={article} />)}</div> : <div className="blog-empty"><SiteIcon name="search" size={22} /><h3>No articles found</h3><p>Try a different search or clear the topic filter.</p><button className="site-button site-button-secondary" type="button" onClick={() => { setQuery(''); setCategory('all'); }}>Clear filters</button></div>}
    </section>
    <section className="blog-disclaimer"><SiteIcon name="info" size={18} /><p>These articles are general educational information, not individualized financial, tax, investment, or legal advice. Examples are illustrative; your circumstances and local rules may differ.</p></section>
  </div>;
}

function ArticlePage({ path }) {
  const slug = path.slice('/blog/'.length);
  const articleIndex = BLOG_ARTICLES.findIndex(article => article.slug === slug);
  const article = BLOG_ARTICLES[articleIndex];
  if (!article) return <div className="blog-not-found"><span className="site-eyebrow">Page not found</span><h1>That article isn’t here.</h1><p>Browse the journal for practical guides to personal finance and budgeting.</p><SiteLink className="site-button site-button-primary" href="/blog">Explore the blog<SiteIcon name="arrow" size={16} /></SiteLink></div>;

  const related = BLOG_ARTICLES.filter(item => item.slug !== article.slug && item.category === article.category).slice(0, 2);
  const extraRelated = related.length < 2 ? BLOG_ARTICLES.filter(item => item.slug !== article.slug && !related.some(existing => existing.slug === item.slug)).slice(0, 2 - related.length) : [];
  const previous = BLOG_ARTICLES[articleIndex - 1];
  const next = BLOG_ARTICLES[articleIndex + 1];
  return <article className="blog-article">
    <nav className="blog-breadcrumbs" aria-label="Breadcrumb"><SiteLink href="/">Home</SiteLink><span aria-hidden="true">/</span><SiteLink href="/blog">Blog</SiteLink><span aria-hidden="true">/</span><span aria-current="page">{article.title}</span></nav>
    <header className="blog-article-header"><div className="blog-card-meta"><span>{article.category}</span><i aria-hidden="true">·</i><span>{article.readTime}</span></div><h1>{article.title}</h1><p className="blog-article-deck">{article.excerpt}</p></header>
    <ArticleImage key={article.slug} article={article} />
    <div className="blog-article-layout"><div className="blog-article-body"><p className="blog-article-intro">{article.intro}</p>{article.sections.map(section => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs?.map((paragraph, index) => <p key={index}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}</section>)}<aside className="blog-education-note"><SiteIcon name="info" size={18} /><p>For education only. This guide is not a substitute for advice based on your personal financial circumstances.</p></aside></div>
      <aside className="blog-article-sidebar"><div className="blog-sidebar-card"><span className="blog-sidebar-icon"><SiteIcon name="shield" size={19} /></span><strong>Make it work for you</strong><p>Use the ideas that fit your situation. Costs, services, and local rules can differ.</p><SiteLink href="/about">About My Finance <SiteIcon name="arrow" size={15} /></SiteLink></div><div className="blog-sidebar-card blog-sidebar-links"><strong>In this journal</strong><SiteLink href="/blog">All articles <SiteIcon name="arrow" size={15} /></SiteLink><SiteLink href="/contact">Contact us <SiteIcon name="arrow" size={15} /></SiteLink></div></aside></div>
    <nav className="blog-article-pager" aria-label="Article navigation">{previous ? <SiteLink href={`/blog/${previous.slug}`} className="blog-pager-link"><small>← Previous article</small><strong>{previous.title}</strong></SiteLink> : <span />}{next ? <SiteLink href={`/blog/${next.slug}`} className="blog-pager-link blog-pager-next"><small>Next article →</small><strong>{next.title}</strong></SiteLink> : <span />}</nav>
    <section className="blog-related"><div className="blog-library-heading"><div><span className="site-eyebrow">Keep exploring</span><h2>Related reading</h2></div><SiteLink className="blog-read-link" href="/blog">All articles <SiteIcon name="arrow" size={16} /></SiteLink></div><div className="blog-related-grid">{[...related, ...extraRelated].map(item => <ArticleCard key={item.slug} article={item} />)}</div></section>
  </article>;
}

function updateSeo({ title, description, path, image, type = 'website', section }) {
  document.title = title;
  const setMeta = (selector, createAttributes, content) => {
    let element = document.head.querySelector(selector);
    if (!content) { element?.remove(); return; }
    if (!element) { element = document.createElement('meta'); Object.entries(createAttributes).forEach(([key, value]) => element.setAttribute(key, value)); document.head.appendChild(element); }
    element.setAttribute('content', content);
  };
  setMeta('meta[name="description"]', { name: 'description' }, description);
  setMeta('meta[property="og:title"]', { property: 'og:title' }, title);
  setMeta('meta[property="og:description"]', { property: 'og:description' }, description);
  setMeta('meta[property="og:type"]', { property: 'og:type' }, type);
  setMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, 'My Finance');
  setMeta('meta[property="article:section"]', { property: 'article:section' }, type === 'article' ? section : '');
  setMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, image ? 'summary_large_image' : 'summary');
  const configuredUrl = String(import.meta.env.VITE_PUBLIC_SITE_URL || '').trim();
  let canonicalUrl = '';
  try {
    const base = new URL(configuredUrl);
    if (base.protocol === 'https:' && base.pathname === '/') canonicalUrl = new URL(path, base.origin).toString();
  } catch { /* Production canonical URLs are only emitted for a valid configured HTTPS site URL. */ }
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (canonicalUrl) {
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = canonicalUrl;
  } else canonical?.remove();
  setMeta('meta[property="og:url"]', { property: 'og:url' }, canonicalUrl);
  setMeta('meta[property="og:image"]', { property: 'og:image' }, canonicalUrl && image ? new URL(image, canonicalUrl).toString() : '');
}

export function PublicSite({ theme, setTheme, user }) {
  const location = useLocationKey();
  const path = normalizePathname(location.split('?')[0]);
  const article = path.startsWith('/blog/') ? BLOG_ARTICLES.find(item => item.slug === path.slice('/blog/'.length)) : null;
  const metadata = article
    ? { title: `${article.title} — My Finance Journal`, description: article.excerpt, image: article.image, type: 'article', section: article.category }
    : SITE_METADATA[path] || { title: 'My Finance', description: 'Personal finance tracking and organization with My Finance.' };
  useEffect(() => { updateSeo({ ...metadata, path }); }, [path, metadata.title, metadata.description, metadata.image]);

  return <div className="site-shell">
    <SiteHeader path={path} theme={theme} setTheme={setTheme} user={user} />
    <main className={`site-main ${path === '/' ? 'site-main-home' : ''}`}>
      {path === '/' && <HomePage user={user} />}
      {path === '/about' && <AboutPage user={user} />}
      {path === '/contact' && <ContactPage />}
      {path === '/blog' && <BlogPage />}
      {path.startsWith('/blog/') && <ArticlePage path={path} />}
      {path === '/privacy-policy' && <PrivacyPage />}
      {path === '/terms-and-conditions' && <TermsPage />}
    </main>
    <SiteFooter theme={theme === 'system' ? (document.documentElement.dataset.theme || 'dark') : theme} />
  </div>;
}
