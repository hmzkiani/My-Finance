import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, calculateSavingsRate, calculateTotals,
  expenseBreakdown, filterTransactions, formatPKR, isValidDateString,
  monthlyExpenses, sortTransactions
} from '../src/data.js';
import { normalizeTransaction, parseTransactionImport } from '../src/storage.js';

const tx = (id, type, amount, category, date, createdAt = 0, description = '') => ({ id, type, amount, category, date, createdAt, description });

test('retains all original income and expense categories', () => {
  assert.deepEqual(EXPENSE_CATEGORIES, ['Food', 'Health', 'Travel', 'Petrol', 'Milk', 'Bills', 'Groceries', 'Shopping', 'Education', 'Entertainment', 'Rent', 'Internet', 'Mobile', 'Utilities', 'Other']);
  assert.deepEqual(INCOME_CATEGORIES, ['Salary', 'Freelance', 'Business', 'Bonus', 'Gift', 'Other']);
});

test('formats grouped PKR and preserves a negative balance sign', () => {
  assert.equal(formatPKR(150000), '₨150,000');
  assert.equal(formatPKR(-1250.5), '−₨1,250.5');
  assert.equal(formatPKR(Number.NaN), '₨0');
});

test('calculates all-time income, expenses, balance, and expense shares', () => {
  const entries = [tx('a', 'income', 40000, 'Salary', '2026-10-01'), tx('b', 'expense', 3000, 'Food', '2026-10-02'), tx('c', 'expense', 1000, 'Bills', '2026-10-03')];
  assert.deepEqual(calculateTotals(entries), { income: 40000, expenses: 4000 });
  assert.equal(calculateTotals(entries).income - calculateTotals(entries).expenses, 36000);
  assert.deepEqual(expenseBreakdown(entries).map(item => [item.category, item.percentage]), [['Food', 75], ['Bills', 25]]);
  assert.equal(calculateSavingsRate(40000, 4000), 90);
  assert.equal(calculateSavingsRate(40000, 50000), 0);
  assert.equal(calculateSavingsRate(0, 5000), 0);
});

test('sorts by date then creation time, newest first', () => {
  const ordered = sortTransactions([tx('old', 'expense', 1, 'Food', '2026-10-02', 10), tx('same-late', 'expense', 1, 'Food', '2026-10-03', 20), tx('same-early', 'expense', 1, 'Food', '2026-10-03', 5)]);
  assert.deepEqual(ordered.map(item => item.id), ['same-late', 'same-early', 'old']);
});

test('searches descriptions and categories and filters type and category', () => {
  const entries = [tx('a', 'income', 100, 'Salary', '2026-10-01', 1, 'Monthly pay'), tx('b', 'expense', 50, 'Food', '2026-10-02', 1, 'Lunch'), tx('c', 'expense', 10, 'Bills', '2026-10-03', 1, 'Internet bill')];
  assert.deepEqual(filterTransactions(entries, 'all', 'all', '').map(item => item.id), ['c', 'b', 'a']);
  assert.deepEqual(filterTransactions(entries, 'expense', 'all', 'lunch').map(item => item.id), ['b']);
  assert.deepEqual(filterTransactions(entries, 'all', 'Salary', 'pay').map(item => item.id), ['a']);
});

test('monthly expenses include only the six newest month buckets', () => {
  const entries = Array.from({ length: 7 }, (_, index) => tx(String(index), 'expense', index + 1, 'Food', `2026-${String(index + 1).padStart(2, '0')}-10`));
  assert.deepEqual(monthlyExpenses(entries).map(month => month.key), ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07']);
  assert.equal(monthlyExpenses(entries).at(-1).amount, 7);
});

test('validates real calendar dates and preserves compatible legacy transaction shapes', () => {
  assert.equal(isValidDateString('2026-02-28'), true);
  assert.equal(isValidDateString('2026-02-31'), false);
  assert.equal(normalizeTransaction(tx('legacy-1', 'expense', '250', 'Food', '2026-10-03')).amount, 250);
  assert.equal(normalizeTransaction(tx('bad-amount', 'expense', 0, 'Food', '2026-10-03')), null);
  assert.equal(normalizeTransaction(tx('bad-category', 'income', 500, 'Food', '2026-10-03')), null);
});

test('validates imports and skips invalid records and duplicate IDs', () => {
  const result = parseTransactionImport({ transactions: [
    tx('keep', 'income', 100, 'Salary', '2026-10-01'),
    tx('keep', 'expense', 5, 'Food', '2026-10-02'),
    tx('invalid', 'expense', -4, 'Food', '2026-10-02'),
    tx('bad-date', 'expense', 5, 'Food', '2026-02-31')
  ] });
  assert.equal(result.transactions.length, 1);
  assert.equal(result.duplicateIds, 1);
  assert.equal(result.invalid, 2);
});
