export const EXPENSE_CATEGORIES = [
  'Food', 'Health', 'Travel', 'Petrol', 'Milk', 'Bills', 'Groceries',
  'Shopping', 'Education', 'Entertainment', 'Rent', 'Internet', 'Mobile',
  'Utilities', 'Other'
];

export const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Business', 'Bonus', 'Gift', 'Other'
];

export const CATEGORY_ICONS = {
  Salary: 'briefcase', Freelance: 'laptop', Business: 'building', Bonus: 'award',
  Gift: 'gift', Food: 'utensils', Health: 'heart', Travel: 'plane', Petrol: 'fuel',
  Milk: 'coffee', Bills: 'receipt', Groceries: 'basket', Shopping: 'bag',
  Education: 'book', Entertainment: 'film', Rent: 'home', Internet: 'wifi',
  Mobile: 'phone', Utilities: 'bolt', Other: 'tag'
};

export const ALL_CATEGORIES = [...new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])];

export const STORAGE_KEY = 'my_finance_transactions_v1';
export const THEME_KEY = 'my_finance_theme_v1';
export const APP_VERSION = '1.0.0';

export function formatPKR(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₨0';
  const formatted = Math.abs(amount).toLocaleString('en-PK', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
  return `${amount < 0 ? '−' : ''}₨${formatted}`;
}

export function formatDate(value, options = {}) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', ...options
  });
}

export function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function isValidDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(`${value}T12:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed.getFullYear() === year && parsed.getMonth() + 1 === month && parsed.getDate() === day;
}

export function sortTransactions(items) {
  return [...items].sort((a, b) => {
    const dateDelta = new Date(`${b.date}T00:00:00`).getTime() - new Date(`${a.date}T00:00:00`).getTime();
    return dateDelta || (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
  });
}

export function calculateTotals(transactions) {
  return transactions.reduce((totals, tx) => {
    const amount = Number(tx.amount) || 0;
    if (tx.type === 'income') totals.income += amount;
    if (tx.type === 'expense') totals.expenses += amount;
    return totals;
  }, { income: 0, expenses: 0 });
}

export function calculateSavingsRate(income, expenses) {
  const totalIncome = Number(income) || 0;
  if (totalIncome <= 0) return 0;
  return Math.max(0, Math.round(((totalIncome - (Number(expenses) || 0)) / totalIncome) * 100));
}

export function filterTransactions(transactions, typeFilter = 'all', categoryFilter = 'all', searchQuery = '') {
  const query = searchQuery.trim().toLocaleLowerCase();
  return sortTransactions(transactions).filter(tx => {
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
    return !query || `${tx.description || ''} ${tx.category || ''}`.toLocaleLowerCase().includes(query);
  });
}

export function expenseBreakdown(transactions) {
  const totals = new Map();
  transactions.filter(tx => tx.type === 'expense').forEach(tx => {
    totals.set(tx.category, (totals.get(tx.category) || 0) + (Number(tx.amount) || 0));
  });
  const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount, percentage: total ? amount / total * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

export function monthlyExpenses(transactions) {
  const months = new Map();
  transactions.filter(tx => tx.type === 'expense').forEach(tx => {
    const date = new Date(`${tx.date}T00:00:00`);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const month = months.get(key) || { key, label: date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), amount: 0 };
    month.amount += Number(tx.amount) || 0;
    months.set(key, month);
  });
  return [...months.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(-6);
}
