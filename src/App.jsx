import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  ALL_CATEGORIES, APP_VERSION, CATEGORY_ICONS, EXPENSE_CATEGORIES,
  INCOME_CATEGORIES, calculateSavingsRate, calculateTotals, expenseBreakdown,
  filterTransactions, formatDate, formatPKR, isValidDateString,
  monthlyExpenses, sortTransactions, todayString
} from './data.js';
import { loadTransactions, parseTransactionImport } from './storage.js';
import { useAuth } from './AuthGate.jsx';
import { PublicSite } from './PublicSite.jsx';
import { isPublicSitePath, navigateTo, normalizePathname, screenFromPath, screenPath, useLocationKey } from './routing.js';
import {
  clearUserTransactions, deleteUserTransaction, loadUserTransactions,
  mergeUserTransactions, saveUserTransaction
} from './cloudData.js';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'transactions', label: 'Transactions', icon: 'list' },
  { id: 'reports', label: 'Reports', icon: 'chart' },
  { id: 'settings', label: 'Settings', icon: 'settings' }
];

const CHART_COLORS = Array.from({ length: 8 }, (_, index) => `var(--chart-${index + 1})`);

function Icon({ name, size = 20, ...props }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, ...props };
  const paths = {
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></>,
    chart: <><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 6-7"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.1.9-1.1 1.9-1.4-.5a7.7 7.7 0 0 1-1.6.9l-.3 1.5h-2.2l-.3-1.5a7.7 7.7 0 0 1-1.6-.9l-1.4.5-1.1-1.9 1.1-.9a6.4 6.4 0 0 1 0-1.8l-1.1-.9 1.1-1.9 1.4.5a7.7 7.7 0 0 1 1.6-.9l.3-1.5h2.2l.3 1.5a7.7 7.7 0 0 1 1.6.9l1.4-.5 1.1 1.9-1.1.9a6.4 6.4 0 0 1 0 1.8Z" transform="translate(-2 -2)"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
    moon: <path d="M20.6 14.2A8.7 8.7 0 0 1 9.8 3.4 8.9 8.9 0 1 0 20.6 14.2Z"/>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 17v3h14v-3"/></>,
    upload: <><path d="M12 16V4m-5 5 5-5 5 5"/><path d="M5 17v3h14v-3"/></>,
    trash: <><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"/></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3m-13 5h18m-11 0v2h4v-2"/></>,
    arrowUp: <path d="m7 14 5-5 5 5M12 9v11"/>,
    arrowDown: <path d="m7 10 5 5 5-5M12 4v11"/>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    back: <><path d="m15 18-6-6 6-6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    logout: <><path d="M10 17l5-5-5-5m5 5H3"/><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/></>,
    tag: <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3.4 13.4a2 2 0 0 1 0-2.8l7.2-7.2A2 2 0 0 1 12 2.8h7.2a2 2 0 0 1 2 2V12a2 2 0 0 1-.6 1.4Z"/><circle cx="16.5" cy="7.5" r="1"/></>,
    laptop: <><rect x="4" y="4" width="16" height="12" rx="2"/><path d="M2 20h20l-2-4H4l-2 4Z"/></>,
    building: <><path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h.01M15 10h.01M9 14h.01M15 14h.01M10 21v-3h4v3"/></>,
    award: <><circle cx="12" cy="8" r="6"/><path d="m8.2 13-1 8 4.8-2 4.8 2-1-8"/></>,
    gift: <><rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 13h18M12 9H7a2.5 2.5 0 1 1 2.5-2.5V9Zm0 0h5a2.5 2.5 0 1 0-2.5-2.5V9Z"/></>,
    utensils: <><path d="M7 3v7m-3-7v4a3 3 0 0 0 6 0V3m-3 7v11M17 3v18m0-18c2 2 3 5 3 8h-3"/></>,
    heart: <path d="M20.8 8.8c0 5.1-8.8 11-8.8 11s-8.8-5.9-8.8-11a4.8 4.8 0 0 1 8.8-2.6 4.8 4.8 0 0 1 8.8 2.6Z"/>,
    plane: <><path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/></>,
    fuel: <><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M3 21h14M7 7h6v5H7zM16 8h2l3 3v7a2 2 0 0 1-4 0v-4"/></>,
    coffee: <><path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Zm13 2h2a2 2 0 1 1 0 4h-2M7 3v2m4-2v2m4-2v2"/></>,
    receipt: <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M8 8h8m-8 4h8m-8 4h5"/></>,
    basket: <><path d="m3 10 2 10h14l2-10H3Zm4 0 5-7 5 7M9 13v4m6-4v4"/></>,
    bag: <><path d="M4 8h16l-1 13H5L4 8Zm4 0V6a4 4 0 1 1 8 0v2"/></>,
    book: <><path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4Z"/><path d="M4 17a3 3 0 0 1 3-3h12M8 8h7"/></>,
    film: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v4m5-4v4m5-4v4M7 16v4m5-4v4m5-4v4M3 9h18m-18 6h18"/></>,
    wifi: <><path d="M5 9a11 11 0 0 1 14 0M8 12a6.5 6.5 0 0 1 8 0m-5 4a2 2 0 0 1 2 0m-1 4h.01"/></>,
    phone: <><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></>,
    bolt: <path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>
  };
  return <svg {...common}>{paths[name] || <circle cx="12" cy="12" r="8" />}</svg>;
}

function useResolvedTheme(theme) {
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const update = event => setSystemDark(event.matches);
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  return theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
}

function AppHeader({ activePage, onThemeToggle, resolvedTheme, onAdd }) {
  const current = NAV_ITEMS.find(item => item.id === activePage);
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-lockup">
          <img className="brand-logo" src={resolvedTheme === 'dark' ? '/brand/my-finance-light.svg' : '/brand/my-finance-dark.svg'} alt="My Finance" width="190" height="42" />
        </div>
        <div className="topbar-actions">
          <div className="page-title"><span>{current?.label || 'Home'}</span><small>{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</small></div>
          <button className="icon-button theme-toggle" onClick={onThemeToggle} aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}>
            <Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} size={19} />
          </button>
          <button className="button button-primary header-add" onClick={onAdd}><Icon name="plus" size={17} /><span>Add transaction</span></button>
        </div>
      </div>
    </header>
  );
}

function BottomNav({ activePage, onNavigate }) {
  return <nav className="bottom-nav" aria-label="Main navigation">
    {NAV_ITEMS.map(item => <button key={item.id} className={`nav-item ${activePage === item.id ? 'active' : ''}`} onClick={() => onNavigate(item.id)} aria-current={activePage === item.id ? 'page' : undefined}>
      <Icon name={item.icon} size={20} /><span>{item.label}</span>
    </button>)}
  </nav>;
}

function StatCard({ label, amount, detail, tone = 'neutral', featured = false, icon }) {
  return <article className={`stat-card ${featured ? 'featured' : ''}`}>
    <div className="stat-topline"><span>{label}</span><span className={`stat-icon ${tone}`}><Icon name={icon} size={18} /></span></div>
    <strong className={`stat-value ${tone}`} aria-label={`${label}: ${formatPKR(amount)}`}><AnimatedPKR amount={amount} /></strong>
    <span className="stat-detail">{detail}</span>
  </article>;
}

function AnimatedPKR({ amount }) {
  const target = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const [displayAmount, setDisplayAmount] = useState(0);
  const currentAmount = useRef(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || typeof window.requestAnimationFrame !== 'function') {
      currentAmount.current = target;
      setDisplayAmount(target);
      return undefined;
    }

    const from = currentAmount.current;
    const startedAt = performance.now();
    const duration = 520;
    let frame = 0;
    const animate = now => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - ((1 - progress) ** 3);
      const next = from + (target - from) * eased;
      currentAmount.current = next;
      setDisplayAmount(next);
      if (progress < 1) frame = window.requestAnimationFrame(animate);
      else currentAmount.current = target;
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [target]);

  return <span aria-hidden="true">{formatPKR(displayAmount)}</span>;
}

function SummaryCards({ transactions, totals }) {
  const balance = totals.income - totals.expenses;
  return <div className="stats-grid">
    <StatCard label="Total balance" amount={balance} detail={balance >= 0 ? 'Available net balance' : 'Expenses are above income'} tone={balance >= 0 ? 'emerald' : 'rose'} featured icon="briefcase" />
    <StatCard label="Total income" amount={totals.income} detail={`${transactions.filter(tx => tx.type === 'income').length} income entries`} tone="emerald" icon="arrowDown" />
    <StatCard label="Total expenses" amount={totals.expenses} detail={`${transactions.filter(tx => tx.type === 'expense').length} expense entries`} tone="rose" icon="arrowUp" />
  </div>;
}

function InsightCard({ transactions, totals }) {
  const breakdown = expenseBreakdown(transactions);
  const top = breakdown[0];
  const second = breakdown[1];
  const balance = totals.income - totals.expenses;
  const savings = calculateSavingsRate(totals.income, totals.expenses);
  return <section className="panel insight-panel">
    <div className="section-heading"><div><span className="eyebrow">Your money at a glance</span><h2>Financial health</h2></div><span className="currency-badge">PKR <b>₨</b></span></div>
    <div className="health-grid">
      <div className="health-copy">
        <span className={`health-indicator ${balance < 0 ? 'negative' : ''}`}><i />{balance >= 0 ? 'Positive balance' : 'Spending exceeds income'}</span>
        <p>{balance >= 0
          ? `You have ${formatPKR(balance)} net savings across your recorded transactions.`
          : `Your expenses exceed income by ${formatPKR(Math.abs(balance))}. Review your spending to bring your balance back up.`}</p>
        <div className="savings-line"><span>Savings rate</span><strong>{savings}%</strong></div>
      </div>
      <div className="insight-highlight">
        <div className="insight-symbol"><Icon name="chart" size={20} /></div>
        <span className="eyebrow">Top expense category</span>
        {top ? <><strong>{top.category}</strong><span>{formatPKR(top.amount)} <small>· {Math.round(top.percentage)}% of expenses</small></span></> : <><strong>Just getting started</strong><span>Record an expense to see your top category.</span></>}
        {second && <small className="second-category">Next: {second.category} · {formatPKR(second.amount)}</small>}
      </div>
    </div>
  </section>;
}

function TransactionItem({ transaction, onEdit, onDelete, compact = false }) {
  const income = transaction.type === 'income';
  return <article className={`transaction-row ${compact ? 'compact' : ''}`}>
    <div className={`category-mark ${income ? 'income' : 'expense'}`}><Icon name={CATEGORY_ICONS[transaction.category] || 'tag'} size={18} /></div>
    <div className="transaction-copy">
      <strong>{transaction.description || transaction.category}</strong>
      <span>{transaction.category}<i>·</i>{formatDate(transaction.date)}</span>
    </div>
    <div className="transaction-end">
      <strong className={income ? 'text-income' : 'text-expense'}>{income ? '+' : '−'}{formatPKR(transaction.amount)}</strong>
      <div className="row-actions">
        <button className="text-action" onClick={() => onEdit(transaction)} aria-label={`Edit ${transaction.description || transaction.category}`}>Edit</button>
        <button className="text-action delete-action" onClick={() => onDelete(transaction)} aria-label={`Delete ${transaction.description || transaction.category}`}>Delete</button>
      </div>
    </div>
  </article>;
}

function EmptyState({ title, message, action, onAction, icon = 'list' }) {
  return <div className="empty-state"><div className="empty-icon"><Icon name={icon} size={26} /></div><h3>{title}</h3><p>{message}</p>{action && <button className="button button-primary" onClick={onAction}><Icon name="plus" size={17} />{action}</button>}</div>;
}

function RecentTransactions({ transactions, onEdit, onDelete, onSeeAll }) {
  const recent = sortTransactions(transactions).slice(0, 5);
  return <section className="panel list-panel">
    <div className="section-heading"><div><span className="eyebrow">Latest activity</span><h2>Recent transactions</h2></div>{transactions.length > 0 && <button className="link-button" onClick={onSeeAll}>See all <Icon name="chevron" size={16} /></button>}</div>
    {recent.length ? <div className="transaction-list">{recent.map(tx => <TransactionItem key={tx.id} transaction={tx} onEdit={onEdit} onDelete={onDelete} compact />)}</div>
      : <EmptyState title="No transactions yet" message="Add your first income or expense to start tracking your finances." action="Add transaction" onAction={() => onSeeAll('add')} icon="chart" />}
  </section>;
}

function Dashboard({ transactions, totals, onNavigate, onAdd, onEdit, onDelete }) {
  const currentDate = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  return <div className="page-stack">
    <div className="welcome-row"><div><span className="eyebrow">Your finances, in focus</span><h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}</h1><p>A clear view of what comes in and what goes out.</p><span className="dashboard-date"><Icon name="calendar" size={14} />{currentDate}</span></div><button className="button button-primary desktop-add" onClick={onAdd}><Icon name="plus" size={18} />Add transaction</button></div>
    <SummaryCards transactions={transactions} totals={totals} />
    <div className="quick-actions" aria-label="Quick transaction actions">
      <button className="quick-action income" onClick={() => onAdd('income')}><span className="quick-action-icon"><Icon name="arrowDown" size={19} /></span><span><strong>Add income</strong><small>Money received</small></span><Icon name="chevron" size={17} /></button>
      <button className="quick-action expense" onClick={() => onAdd('expense')}><span className="quick-action-icon"><Icon name="arrowUp" size={19} /></span><span><strong>Add expense</strong><small>Money spent</small></span><Icon name="chevron" size={17} /></button>
    </div>
    <div className="dashboard-lower-grid">
      <TrendChart transactions={transactions} compact />
      <InsightCard transactions={transactions} totals={totals} />
    </div>
    <RecentTransactions transactions={transactions} onEdit={onEdit} onDelete={onDelete} onSeeAll={onNavigate} />
  </div>;
}

function TransactionFilters({ typeFilter, setTypeFilter, categoryFilter, setCategoryFilter, searchQuery, setSearchQuery, onReset, total, visible }) {
  const filtered = typeFilter !== 'all' || categoryFilter !== 'all' || searchQuery.trim() !== '';
  return <section className="panel filter-panel">
    <div className="filter-title"><div><span className="eyebrow">Your activity</span><h2>Transactions <span className="count-badge">{visible}{filtered ? ` / ${total}` : ''}</span></h2></div>{filtered && <button className="link-button" onClick={onReset}>Clear filters <Icon name="close" size={15} /></button>}</div>
    <div className="filter-controls">
      <div className="segmented" role="group" aria-label="Filter transaction type">
        {[['all', 'All'], ['income', 'Income'], ['expense', 'Expense']].map(([value, label]) => <button key={value} className={typeFilter === value ? `selected ${value}` : ''} onClick={() => setTypeFilter(value)}>{label}</button>)}
      </div>
      <label className="search-field"><Icon name="search" size={17} /><input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search description or category" aria-label="Search transactions" />{searchQuery && <button onClick={() => setSearchQuery('')} aria-label="Clear search"><Icon name="close" size={16} /></button>}</label>
      <select className="select-control" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} aria-label="Filter by category"><option value="all">All categories</option>{ALL_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select>
    </div>
  </section>;
}

function TransactionsPage({ transactions, onEdit, onDelete, typeFilter, setTypeFilter, categoryFilter, setCategoryFilter, searchQuery, setSearchQuery, onReset, onAdd }) {
  const filtered = useMemo(() => filterTransactions(transactions, typeFilter, categoryFilter, searchQuery), [transactions, typeFilter, categoryFilter, searchQuery]);
  return <div className="page-stack">
    <div className="welcome-row"><div><span className="eyebrow">Income and expenses</span><h1>Transactions</h1><p>Search, filter, and manage every entry.</p></div><button className="button button-primary desktop-add" onClick={onAdd}><Icon name="plus" size={18} />Add transaction</button></div>
    <TransactionFilters typeFilter={typeFilter} setTypeFilter={setTypeFilter} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onReset={onReset} total={transactions.length} visible={filtered.length} />
    {filtered.length ? <section className="panel all-transactions"><div className="transaction-list">{filtered.map(tx => <TransactionItem key={tx.id} transaction={tx} onEdit={onEdit} onDelete={onDelete} />)}</div></section>
      : <section className="panel">{transactions.length ? <EmptyState title="No matching transactions" message="Try changing your search or filters." action="Clear filters" onAction={onReset} /> : <EmptyState title="No transactions yet" message="Your entries will appear here after you add them." action="Add transaction" onAction={onAdd} icon="chart" />}</section>}
  </div>;
}

function DonutChart({ transactions }) {
  const breakdown = expenseBreakdown(transactions);
  const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const slices = breakdown.map((item, index) => {
    const dash = item.percentage / 100 * circumference;
    const slice = { ...item, color: CHART_COLORS[index % CHART_COLORS.length], dash, offset };
    offset += dash;
    return slice;
  });
  return <section className="panel chart-panel">
    <div className="section-heading"><div><span className="eyebrow">Where it goes</span><h2>Expense breakdown</h2></div><span className="count-badge">{breakdown.length} categories</span></div>
    {breakdown.length ? <div className="donut-layout"><div className="donut-wrap"><svg viewBox="0 0 144 144" role="img" aria-label="Expense category breakdown">
      <circle cx="72" cy="72" r={radius} fill="none" stroke="var(--track)" strokeWidth="18" />
      {slices.map(slice => <circle key={slice.category} cx="72" cy="72" r={radius} fill="none" stroke={slice.color} strokeWidth="18" strokeDasharray={`${slice.dash} ${circumference - slice.dash}`} strokeDashoffset={-slice.offset} transform="rotate(-90 72 72)" />)}
    </svg><div className="donut-center"><small>Total spent</small><strong>{formatPKR(total)}</strong></div></div>
      <div className="chart-legend">{slices.map(slice => <div className="legend-row" key={slice.category}><i style={{ background: slice.color }} /><span>{slice.category}</span><strong>{formatPKR(slice.amount)}</strong><small>{Math.round(slice.percentage)}%</small></div>)}</div></div>
      : <EmptyState title="No expense data yet" message="Add expenses to see how spending is distributed by category." icon="chart" />}
  </section>;
}

function TrendChart({ transactions, compact = false }) {
  const months = monthlyExpenses(transactions);
  const max = Math.max(1, ...months.map(month => month.amount));
  return <section className={`panel chart-panel trend-panel ${compact ? 'dashboard-trend' : ''}`}>
    <div className="section-heading"><div><span className="eyebrow">Six month view</span><h2>Monthly spending</h2></div><span className="count-badge">Expenses</span></div>
    {months.length ? <div className="trend-chart" role="img" aria-label="Monthly expenses for the last six months">
      <div className="trend-bars">{months.map(month => <div className="trend-column" key={month.key}>
        <span className="trend-value">{formatPKR(month.amount)}</span><div className="trend-bar-wrap"><div className="trend-bar" style={{ height: `${Math.max(5, month.amount / max * 100)}%` }} /></div><span className="trend-label">{month.label}</span>
      </div>)}</div>
    </div> : <EmptyState title="No monthly trend yet" message="Your expense history will appear here, grouped by month." icon="calendar" />}
  </section>;
}

function ReportsPage({ transactions, totals }) {
  const breakdown = expenseBreakdown(transactions);
  const top = breakdown[0];
  const second = breakdown[1];
  const savings = calculateSavingsRate(totals.income, totals.expenses);
  const behavior = top && second
    ? `You are spending more on ${top.category} and ${second.category} compared to other categories.`
    : top ? `All of your current expenses are concentrated in the ${top.category} category.` : 'Record expenses to see spending patterns.';
  return <div className="page-stack">
    <div className="welcome-row"><div><span className="eyebrow">Understand your activity</span><h1>Reports</h1><p>Spending breakdowns and monthly trends based on your entries.</p></div></div>
    <div className="report-stats"><article className="panel mini-stat"><span className="eyebrow">All-time income</span><strong className="text-income">{formatPKR(totals.income)}</strong></article><article className="panel mini-stat"><span className="eyebrow">All-time expenses</span><strong className="text-expense">{formatPKR(totals.expenses)}</strong></article><article className="panel mini-stat"><span className="eyebrow">Savings rate</span><strong>{savings}%</strong></article></div>
    <div className="charts-grid"><DonutChart transactions={transactions} /><TrendChart transactions={transactions} /></div>
    <section className="panel insight-panel"><div className="section-heading"><div><span className="eyebrow">Automated analysis</span><h2>Spending insights</h2></div></div>
      {top ? <div className="report-insights"><article><span className="eyebrow">Highest category</span><strong>{top.category}</strong><span>{formatPKR(top.amount)}</span></article><article><span className="eyebrow">Share of expenses</span><strong>{Math.round(top.percentage)}%</strong><span>{top.category} of total outflow</span></article><article><span className="eyebrow">Spending behavior</span><p>{behavior}</p></article></div> : <p className="muted-copy">{behavior}</p>}
      {breakdown.length > 0 && <div className="breakdown-list">{breakdown.map((item, index) => <div className="breakdown-row" key={item.category}><div><span className="breakdown-dot" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} /><strong>{item.category}</strong></div><div className="breakdown-meter"><span style={{ width: `${Math.max(2, item.percentage)}%`, background: CHART_COLORS[index % CHART_COLORS.length] }} /></div><strong>{formatPKR(item.amount)}</strong><small>{Math.round(item.percentage)}%</small></div>)}</div>}
    </section>
  </div>;
}

function SettingsPage({ theme, setTheme, onExport, onImport, onClear, onToast, user, onLogout, localRecordCount, onMigrateLocal }) {
  const fileRef = useRef(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const openImport = () => fileRef.current?.click();
  const logout = async () => {
    setLoggingOut(true);
    try { await onLogout(); }
    catch (error) {
      onToast(`Could not sign out: ${error.message || 'Please try again.'}`);
      setLoggingOut(false);
    }
  };
  const handleFile = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try { await onImport(await file.text()); }
    catch (error) { onToast(error.message || 'Could not read this file.'); }
  };
  return <div className="page-stack">
    <div className="welcome-row"><div><span className="eyebrow">Make it yours</span><h1>Settings</h1><p>Privacy, appearance, and your finance data.</p></div></div>
    <section className="panel settings-panel">
      <div className="settings-section account-section"><div className="settings-heading"><div className="setting-icon"><Icon name="shield" size={19} /></div><div><h2>Account</h2><p>Signed in as {user?.email || 'your private account'}</p></div></div><button className="button button-secondary account-logout" onClick={logout} disabled={loggingOut}><Icon name="logout" size={17} />{loggingOut ? 'Signing out…' : 'Sign out'}</button></div>
      <div className="settings-section"><div className="settings-heading"><div className="setting-icon"><Icon name="sun" size={19} /></div><div><h2>Appearance</h2><p>Choose how My Finance looks on this device.</p></div></div>
        <div className="theme-options" role="group" aria-label="Theme preference">{['dark', 'light', 'system'].map(value => <button className={theme === value ? 'chosen' : ''} onClick={() => setTheme(value)} key={value}><Icon name={value === 'dark' ? 'moon' : value === 'light' ? 'sun' : 'settings'} size={17} />{value[0].toUpperCase() + value.slice(1)}{theme === value && <Icon name="check" size={15} />}</button>)}</div>
      </div>
      <div className="settings-section"><div className="settings-heading"><div className="setting-icon"><Icon name="download" size={19} /></div><div><h2>Transaction data</h2><p>Export a backup or import transactions from a JSON file.</p></div></div>
        <div className="settings-actions"><button className="button button-secondary" onClick={onExport}><Icon name="download" size={17} />Export backup</button><button className="button button-secondary" onClick={openImport}><Icon name="upload" size={17} />Import backup</button><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleFile} /></div>
        <p className="helper-copy">Import merges valid entries. IDs already in your account or repeated in the file are skipped.</p>
      </div>
      {localRecordCount > 0 && <div className="settings-section local-migration-section"><div className="settings-heading"><div className="setting-icon"><Icon name="download" size={19} /></div><div><h2>Device records</h2><p>{localRecordCount} existing local transaction{localRecordCount === 1 ? '' : 's'} remain on this device. Copy them into this account when ready.</p></div></div><button className="button button-secondary" onClick={onMigrateLocal}>Import local records</button></div>}
      <div className="settings-section danger-section"><div className="settings-heading"><div className="setting-icon danger-icon"><Icon name="trash" size={19} /></div><div><h2>Clear account transactions</h2><p>Remove every transaction saved in this Supabase account. Device records and theme settings stay on this device.</p></div></div><button className="button button-danger-outline" onClick={onClear}><Icon name="trash" size={17} />Clear account data</button></div>
    </section>
    <section className="panel settings-panel about-panel"><div className="settings-section"><div className="settings-heading"><div className="setting-icon"><Icon name="info" size={19} /></div><div><h2>About My Finance</h2><p>Version {APP_VERSION} · Currency display: PKR (₨)</p></div></div><p className="about-copy">A personal finance tracker for recording income and expenses, reviewing spending patterns, and keeping your data under your control.</p></div>
      <div className="settings-section privacy-section"><div className="settings-heading"><div className="setting-icon"><Icon name="shield" size={19} /></div><div><h2>Privacy</h2><p>Your account data is protected by database row-level security.</p></div></div><p className="about-copy">My Finance does not store passwords. Supabase Auth handles sign-in, and PostgreSQL policies limit financial records to the signed-in account. Your existing device records remain local until you choose to import them.</p></div>
    </section>
  </div>;
}

function TransactionForm({ initialData, initialType = 'expense', onSubmit, onClose }) {
  const editMode = Boolean(initialData);
  const [type, setType] = useState(initialData?.type || initialType);
  const [amount, setAmount] = useState(initialData ? String(initialData.amount) : '');
  const [category, setCategory] = useState(initialData?.category || EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(initialData?.date || todayString());
  const [description, setDescription] = useState(initialData?.description || '');
  const [errors, setErrors] = useState({});
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const changeType = value => { setType(value); setCategory((value === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0]); setErrors(current => ({ ...current, category: '' })); };
  const submit = event => {
    event.preventDefault();
    const parsed = Number(amount);
    const next = {};
    if (!amount.trim() || !Number.isFinite(parsed)) next.amount = 'Enter a valid amount.';
    else if (parsed <= 0) next.amount = 'Amount must be greater than ₨0.';
    if (!categories.includes(category)) next.category = 'Choose a category for this transaction type.';
    if (!isValidDateString(date)) next.date = 'Choose a valid date.';
    if (Object.keys(next).length) { setErrors(next); return; }
    onSubmit({
      id: initialData?.id || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type, amount: parsed, category, date, description: description.trim(),
      createdAt: initialData?.createdAt || Date.now()
    });
  };
  return <form className="transaction-form" onSubmit={submit} noValidate>
    <div className="modal-heading"><div><span className="eyebrow">{editMode ? 'Update a record' : 'Add to your activity'}</span><h2>{editMode ? 'Edit transaction' : 'New transaction'}</h2></div><button type="button" className="icon-button close-button" onClick={onClose} aria-label="Close"><Icon name="close" size={19} /></button></div>
    <div className="segmented type-toggle" role="group" aria-label="Transaction type"><button className={type === 'expense' ? 'selected expense' : ''} type="button" onClick={() => changeType('expense')}><Icon name="arrowUp" size={17} />Expense</button><button className={type === 'income' ? 'selected income' : ''} type="button" onClick={() => changeType('income')}><Icon name="arrowDown" size={17} />Income</button></div>
    <label className="form-field"><span>Amount <b>PKR (₨)</b></span><div className={`amount-input ${errors.amount ? 'has-error' : ''}`}><i>₨</i><input inputMode="decimal" type="number" min="0" step="any" value={amount} placeholder="0.00" onChange={event => { setAmount(event.target.value); setErrors(current => ({ ...current, amount: '' })); }} aria-invalid={Boolean(errors.amount)} /></div>{errors.amount && <small className="field-error">{errors.amount}</small>}</label>
    <div className="form-grid">
      <label className="form-field"><span>Category</span><select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}</select>{errors.category && <small className="field-error">{errors.category}</small>}</label>
      <label className="form-field"><span>Date</span><input type="date" value={date} max="9999-12-31" onChange={event => { setDate(event.target.value); setErrors(current => ({ ...current, date: '' })); }} />{errors.date && <small className="field-error">{errors.date}</small>}</label>
    </div>
    <label className="form-field"><span>Description <small>Optional</small></span><input type="text" value={description} maxLength={140} placeholder="What was this for?" onChange={event => setDescription(event.target.value)} /></label>
    <div className="modal-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancel</button><button className={`button ${type === 'income' ? 'button-primary' : 'button-expense'}`} type="submit">{editMode ? 'Save changes' : `Add ${type}`}</button></div>
  </form>;
}

function Dialog({ title, children, onClose, actions, size = 'normal', label }) {
  useEffect(() => {
    const handler = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  return <div className="dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={`dialog-card ${size}`} role="dialog" aria-modal="true" aria-label={label || title}>
      {title && <div className="confirm-heading"><span className="confirm-icon"><Icon name="info" size={21} /></span><h2>{title}</h2></div>}
      {children}{actions && <div className="modal-actions">{actions}</div>}
    </section>
  </div>;
}

function Toast({ message, onClose }) {
  useEffect(() => { if (!message) return; const timer = setTimeout(onClose, 3600); return () => clearTimeout(timer); }, [message, onClose]);
  return message ? <div className="toast" role="status"><span><Icon name="check" size={17} /></span>{message}<button onClick={onClose} aria-label="Dismiss notification"><Icon name="close" size={16} /></button></div> : null;
}

async function exportBackup(transactions) {
  const date = todayString();
  const fileName = `my-finance-${date}.json`;
  const contents = JSON.stringify({ app: 'My Finance', schemaVersion: 1, currency: 'PKR', exportedAt: new Date().toISOString(), transactions }, null, 2);
  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({ path: fileName, data: contents, directory: Directory.Cache, encoding: Encoding.UTF8, recursive: true });
    await Share.share({ title: 'My Finance backup', text: 'My Finance transaction backup', url: uri, dialogTitle: 'Save or share backup' });
    return;
  }
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function App() {
  const { user, theme, setTheme } = useAuth();
  const location = useLocationKey();
  const path = normalizePathname(location.split('?')[0]);
  const isRecoveryFlow = new URLSearchParams(location.split('?')[1] || '').get('flow') === 'recovery';
  if (!Capacitor.isNativePlatform() && isPublicSitePath(path) && !isRecoveryFlow) {
    return <PublicSite theme={theme} setTheme={setTheme} user={user} />;
  }
  return <FinanceApp />;
}

function FinanceApp() {
  const { client, user, signOut, theme, setTheme } = useAuth();
  const location = useLocationKey();
  const pathname = normalizePathname(location.split('?')[0]);
  const native = Capacitor.isNativePlatform();
  const [transactions, setTransactions] = useState([]);
  const [localTransactions, setLocalTransactions] = useState([]);
  const [localRecordsAvailable, setLocalRecordsAvailable] = useState(false);
  const [ready, setReady] = useState(false);
  const [activePage, setActivePage] = useState(() => screenFromPath(pathname));
  const resolvedTheme = useResolvedTheme(theme);
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialog, setDialog] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [toast, setToast] = useState('');
  const [storageError, setStorageError] = useState('');
  const [storageBlocked, setStorageBlocked] = useState(false);
  const totals = useMemo(() => calculateTotals(transactions), [transactions]);
  const closeDialog = useCallback(() => setDialog(null), []);
  const showToast = useCallback(message => setToast(message), []);
  const dismissToast = useCallback(() => setToast(''), []);

  useEffect(() => {
    let alive = true;
    Promise.all([
      loadUserTransactions(client, user.id).then(items => ({ items })).catch(error => ({ error })),
      loadTransactions()
    ]).then(([cloud, stored]) => {
      if (!alive) return;
      setTransactions(cloud.items || []);
      setLocalTransactions(stored.transactions);
      setLocalRecordsAvailable(stored.transactions.length > 0);
      if (cloud.error) {
        setStorageError(`Could not load account transactions: ${cloud.error.message || 'Check your connection and database setup.'}`);
        setStorageBlocked(true);
      }
      setReady(true);
    });
    return () => { alive = false; };
  }, [client, user.id]);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolvedTheme === 'dark' ? '#090b0a' : '#f5f5f2');
  }, [resolvedTheme]);

  useEffect(() => {
    if (!native) setActivePage(screenFromPath(pathname));
  }, [native, pathname]);

  const changeTheme = setTheme;
  const themeToggle = () => changeTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  const openEdit = transaction => setDialog({ type: 'edit', transaction });
  const openDelete = transaction => setDialog({ type: 'delete', transaction });
  const addTransaction = async transaction => {
    if (storageBlocked) { showToast('Account data is unavailable. Reconnect and reload before making changes.'); return; }
    try {
      await saveUserTransaction(client, user.id, transaction);
      setTransactions(current => [transaction, ...current]);
      setDialog(null);
      setStorageError('');
      showToast(`${transaction.type === 'income' ? 'Income' : 'Expense'} added.`);
    } catch (error) { showToast(`Could not save transaction: ${error.message || 'Check your connection and try again.'}`); }
  };
  const updateTransaction = async transaction => {
    if (storageBlocked) { showToast('Account data is unavailable. Reconnect and reload before making changes.'); return; }
    try {
      await saveUserTransaction(client, user.id, transaction);
      setTransactions(current => current.map(item => item.id === transaction.id ? transaction : item));
      setDialog(null);
      setStorageError('');
      showToast('Transaction updated.');
    } catch (error) { showToast(`Could not update transaction: ${error.message || 'Check your connection and try again.'}`); }
  };
  const deleteTransaction = async () => {
    if (storageBlocked) { showToast('Account data is unavailable. Reconnect and reload before making changes.'); setDialog(null); return; }
    try {
      await deleteUserTransaction(client, user.id, dialog.transaction.id);
      setTransactions(current => current.filter(item => item.id !== dialog.transaction.id));
      setDialog(null);
      setStorageError('');
      showToast('Transaction deleted.');
    } catch (error) { showToast(`Could not delete transaction: ${error.message || 'Check your connection and try again.'}`); }
  };
  const resetFilters = () => { setTypeFilter('all'); setCategoryFilter('all'); setSearchQuery(''); };
  const doExport = async () => {
    try { await exportBackup(transactions); showToast('Backup is ready.'); }
    catch (error) { showToast(`Export failed: ${error.message || 'Please try again.'}`); }
  };
  const receiveImport = async text => {
    if (storageBlocked) throw new Error('Account records could not be loaded. Reconnect and reload My Finance before importing.');
    let parsed;
    try { parsed = JSON.parse(text); }
    catch { throw new Error('This file is not valid JSON.'); }
    const result = parseTransactionImport(parsed);
    setPendingImport(result);
  };
  const confirmImport = async () => {
    if (!pendingImport || storageBlocked) return;
    const existingIds = new Set(transactions.map(item => item.id));
    const additions = pendingImport.transactions.filter(item => !existingIds.has(item.id));
    const skipped = pendingImport.invalid + pendingImport.duplicateIds + pendingImport.transactions.length - additions.length;
    try {
      await mergeUserTransactions(client, user.id, additions);
      setTransactions(await loadUserTransactions(client, user.id));
      setPendingImport(null);
      showToast(`Imported ${additions.length} transaction${additions.length === 1 ? '' : 's'}${skipped ? ` · skipped ${skipped}` : ''}.`);
    } catch (error) { showToast(`Import failed: ${error.message || 'Check your connection and try again.'}`); }
  };
  const confirmLocalMigration = async () => {
    if (storageBlocked) { showToast('Reconnect and reload My Finance before importing local records.'); return; }
    const existingIds = new Set(transactions.map(item => item.id));
    const additions = localTransactions.filter(item => !existingIds.has(item.id));
    try {
      await mergeUserTransactions(client, user.id, additions);
      setTransactions(await loadUserTransactions(client, user.id));
      setLocalRecordsAvailable(false);
      setDialog(null);
      showToast(additions.length ? `Copied ${additions.length} local transaction${additions.length === 1 ? '' : 's'} to your account. Device records remain in place.` : 'Those local transaction IDs are already in your account. Device records remain in place.');
    } catch (error) { showToast(`Could not import local records: ${error.message || 'Check your connection and try again.'}`); }
  };
  const clearData = async () => {
    if (storageBlocked) { showToast('Account data could not be loaded. Reconnect and reload before clearing it.'); return; }
    try {
      await clearUserTransactions(client, user.id);
      setTransactions([]);
      setStorageError('');
      setDialog(null);
      showToast('Your account transactions were cleared. Device records remain in place.');
    } catch (error) { setStorageError(`Could not clear account transactions: ${error.message}`); setDialog(null); }
  };

  useEffect(() => {
    if (!ready) return;
    const listener = NativeApp.addListener('backButton', () => {
      if (dialog || pendingImport) { setDialog(null); setPendingImport(null); return; }
      if (activePage !== 'home') { setActivePage('home'); return; }
      NativeApp.exitApp();
    });
    return () => { listener.then(handle => handle.remove()).catch(() => {}); };
  }, [activePage, dialog, pendingImport, ready]);

  const navigate = page => {
    if (page === 'add') { setDialog({ type: 'add' }); return; }
    if (native) setActivePage(page);
    else navigateTo(screenPath(page));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!ready) return <div className="loading-screen" role="status" aria-live="polite"><div className="brand-mark">₨</div><strong>My Finance</strong><span>Opening your private finance space…</span></div>;
  return <div className="app-shell">
    <AppHeader activePage={activePage} onThemeToggle={themeToggle} resolvedTheme={resolvedTheme} onAdd={() => setDialog({ type: 'add' })} />
    {storageError && <div className="storage-alert" role="alert"><Icon name="info" size={17} />{storageError}<button onClick={() => setStorageError('')} aria-label="Dismiss">×</button></div>}
    <main className="main-content" key={activePage}>
      {activePage === 'home' && <Dashboard transactions={transactions} totals={totals} onNavigate={navigate} onAdd={initialType => setDialog({ type: 'add', initialType })} onEdit={openEdit} onDelete={openDelete} />}
      {activePage === 'transactions' && <TransactionsPage transactions={transactions} onEdit={openEdit} onDelete={openDelete} typeFilter={typeFilter} setTypeFilter={setTypeFilter} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onReset={resetFilters} onAdd={() => setDialog({ type: 'add' })} />}
      {activePage === 'reports' && <ReportsPage transactions={transactions} totals={totals} />}
      {activePage === 'settings' && <SettingsPage theme={theme} setTheme={changeTheme} onExport={doExport} onImport={receiveImport} onClear={() => setDialog({ type: 'clear' })} onToast={showToast} user={user} onLogout={signOut} localRecordCount={localRecordsAvailable ? localTransactions.length : 0} onMigrateLocal={() => setDialog({ type: 'local-migration' })} />}
    </main>
    <footer className="app-footer">My Finance <span>·</span> Personal finance, private to your account</footer>
    <button className="fab" onClick={() => setDialog({ type: 'add' })} aria-label="Add transaction"><Icon name="plus" size={23} /></button>
    <BottomNav activePage={activePage} onNavigate={navigate} />

    {(dialog?.type === 'add' || dialog?.type === 'edit') && <Dialog onClose={closeDialog} size="form-dialog" label={dialog.type === 'edit' ? 'Edit transaction' : 'Add transaction'}><TransactionForm key={dialog.transaction?.id || dialog.initialType || 'new'} initialData={dialog.transaction || null} initialType={dialog.initialType || 'expense'} onSubmit={dialog.type === 'edit' ? updateTransaction : addTransaction} onClose={closeDialog} /></Dialog>}
    {dialog?.type === 'delete' && <Dialog title="Delete transaction?" onClose={closeDialog} actions={<><button className="button button-secondary" onClick={closeDialog}>Keep it</button><button className="button button-danger" onClick={deleteTransaction}>Delete transaction</button></>}><p className="confirm-copy">This will remove <strong>{dialog.transaction.description || dialog.transaction.category}</strong> ({dialog.transaction.type === 'income' ? '+' : '−'}{formatPKR(dialog.transaction.amount)}) from your saved records. This cannot be undone.</p></Dialog>}
    {dialog?.type === 'clear' && <Dialog title="Clear account transactions?" onClose={closeDialog} actions={<><button className="button button-secondary" onClick={closeDialog}>Cancel</button><button className="button button-danger" onClick={clearData}>Clear account data</button></>}><p className="confirm-copy">This permanently removes all {transactions.length} transaction{transactions.length === 1 ? '' : 's'} in your Supabase account. Existing device records and theme settings will remain on this device. Export a backup first if you want another copy.</p></Dialog>}
    {dialog?.type === 'local-migration' && <Dialog title="Import local transactions?" onClose={closeDialog} actions={<><button className="button button-secondary" onClick={closeDialog}>Not now</button><button className="button button-primary" onClick={confirmLocalMigration}>Copy to account</button></>}><p className="confirm-copy">Found <strong>{localTransactions.length}</strong> transaction{localTransactions.length === 1 ? '' : 's'} stored on this device. They will be copied to your account; the local records will not be deleted. IDs already in your account are skipped.</p></Dialog>}
    {pendingImport && <Dialog title="Review import" onClose={() => setPendingImport(null)} actions={<><button className="button button-secondary" onClick={() => setPendingImport(null)}>Cancel</button><button className="button button-primary" onClick={confirmImport}>Merge transactions</button></>}><p className="confirm-copy">Found <strong>{pendingImport.transactions.length}</strong> valid transaction{pendingImport.transactions.length === 1 ? '' : 's'}. They will be merged with your current data. Duplicate IDs are skipped{pendingImport.invalid + pendingImport.duplicateIds ? `; ${pendingImport.invalid + pendingImport.duplicateIds} invalid or repeated entries in this file will also be skipped` : ''}.</p></Dialog>}
    <Toast message={toast} onClose={dismissToast} />
  </div>;
}
