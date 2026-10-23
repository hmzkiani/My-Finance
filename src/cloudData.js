import { sortTransactions } from './data.js';
import { normalizeTransaction } from './storage.js';

const TRANSACTION_COLUMNS = 'id,type,amount,category,transaction_date,description,created_at';

export function transactionToCloudRow(transaction, userId) {
  if (!userId) throw new Error('A signed-in account is required to save transactions.');
  return {
    id: transaction.id,
    user_id: userId,
    type: transaction.type,
    amount: transaction.amount,
    category: transaction.category,
    transaction_date: transaction.date,
    description: transaction.description || '',
    created_at: Number(transaction.createdAt) || Date.now()
  };
}

export function cloudRowToTransaction(row) {
  return normalizeTransaction({
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    category: row.category,
    date: String(row.transaction_date).slice(0, 10),
    description: row.description,
    createdAt: Number(row.created_at)
  });
}

export async function loadUserTransactions(client, userId) {
  if (!client || !userId) throw new Error('A signed-in account is required to load transactions.');
  const { data, error } = await client
    .from('finance_transactions')
    .select(TRANSACTION_COLUMNS)
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return sortTransactions((data || []).map(cloudRowToTransaction).filter(Boolean));
}

export async function saveUserTransaction(client, userId, transaction) {
  if (!client || !userId) throw new Error('A signed-in account is required to save transactions.');
  const { error } = await client
    .from('finance_transactions')
    .upsert(transactionToCloudRow(transaction, userId), { onConflict: 'user_id,id' });
  if (error) throw error;
}

export async function mergeUserTransactions(client, userId, transactions) {
  if (!client || !userId) throw new Error('A signed-in account is required to import transactions.');
  if (!transactions.length) return;
  const rows = transactions.map(transaction => transactionToCloudRow(transaction, userId));
  const { error } = await client
    .from('finance_transactions')
    .upsert(rows, { onConflict: 'user_id,id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function deleteUserTransaction(client, userId, transactionId) {
  if (!client || !userId) throw new Error('A signed-in account is required to delete transactions.');
  const { error } = await client
    .from('finance_transactions')
    .delete()
    .eq('user_id', userId)
    .eq('id', transactionId);
  if (error) throw error;
}

export async function clearUserTransactions(client, userId) {
  if (!client || !userId) throw new Error('A signed-in account is required to clear transactions.');
  const { error } = await client
    .from('finance_transactions')
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
}
