import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, STORAGE_KEY, THEME_KEY, isValidDateString } from './data.js';

let transactionWriteQueue = Promise.resolve();

function localGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function localSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* native Preferences remains authoritative */ }
}

async function getValue(key) {
  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key });
    if (value !== null) return value;
  }
  return localGet(key);
}

async function setValue(key, value) {
  if (Capacitor.isNativePlatform()) await Preferences.set({ key, value });
  localSet(key, value);
}

export function normalizeTransaction(raw, fallbackIndex = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const type = raw.type;
  const amount = Number(raw.amount);
  const category = typeof raw.category === 'string' ? raw.category.trim() : '';
  const categories = type === 'income' ? INCOME_CATEGORIES : type === 'expense' ? EXPENSE_CATEGORIES : [];
  const date = typeof raw.date === 'string' ? raw.date : '';
  const validDate = isValidDateString(date);
  if (!categories.length || !Number.isFinite(amount) || amount <= 0 || !categories.includes(category) || !validDate) return null;
  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `tx-import-${Date.now()}-${fallbackIndex}`,
    type,
    amount,
    category,
    date,
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
    createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now() + fallbackIndex
  };
}

export function parseTransactionImport(parsed) {
  const source = Array.isArray(parsed) ? parsed : parsed?.transactions;
  if (!Array.isArray(source)) throw new Error('This file does not contain a transaction list.');
  const transactions = [];
  const seen = new Set();
  let invalid = 0;
  let duplicateIds = 0;
  source.forEach((row, index) => {
    const tx = normalizeTransaction(row, index);
    if (!tx) { invalid += 1; return; }
    if (seen.has(tx.id)) { duplicateIds += 1; return; }
    seen.add(tx.id);
    transactions.push(tx);
  });
  if (source.length && !transactions.length) throw new Error('No valid transactions were found. Check types, categories, dates, and positive amounts.');
  return { transactions, invalid, duplicateIds };
}

export async function loadTransactions() {
  try {
    const stored = await getValue(STORAGE_KEY);
    if (!stored) return { transactions: [], migrated: false };
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return { transactions: [], error: 'Saved transaction data could not be read.' };
    const transactions = [];
    parsed.forEach((row, index) => {
      const tx = normalizeTransaction(row, index);
      if (tx) transactions.push(tx);
    });
    return { transactions, migrated: true };
  } catch (error) {
    return { transactions: [], error: `Could not load saved transactions: ${error.message}` };
  }
}

export async function saveTransactions(transactions) {
  const payload = JSON.stringify(transactions);
  const nextWrite = transactionWriteQueue.catch(() => {}).then(() => setValue(STORAGE_KEY, payload));
  transactionWriteQueue = nextWrite;
  await nextWrite;
}

export async function loadTheme() {
  try { return (await getValue(THEME_KEY)) || 'dark'; } catch { return 'dark'; }
}

export async function saveTheme(theme) {
  await setValue(THEME_KEY, theme);
}

export async function clearStoredData() {
  if (Capacitor.isNativePlatform()) {
    await Preferences.remove({ key: STORAGE_KEY });
    await Preferences.remove({ key: THEME_KEY });
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(THEME_KEY);
  } catch { /* handled by native storage removal */ }
}
