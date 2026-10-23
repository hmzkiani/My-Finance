import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearUserTransactions, cloudRowToTransaction, deleteUserTransaction,
  loadUserTransactions, mergeUserTransactions, saveUserTransaction,
  transactionToCloudRow
} from '../src/cloudData.js';

function fakeClient(response = { data: null, error: null }) {
  const calls = [];
  const query = {
    from(table) { calls.push(['from', table]); return this; },
    select(columns) { calls.push(['select', columns]); return this; },
    eq(column, value) { calls.push(['eq', column, value]); return this; },
    order(column, options) { calls.push(['order', column, options]); return this; },
    upsert(rows, options) { calls.push(['upsert', rows, options]); return this; },
    delete() { calls.push(['delete']); return this; },
    then(resolve, reject) { return Promise.resolve(response).then(resolve, reject); }
  };
  return { client: { from: table => query.from(table) }, calls };
}

const income = {
  id: 'tx-income-1', type: 'income', amount: 87500, category: 'Salary',
  date: '2026-10-12', description: 'October salary', createdAt: 1234
};

test('cloud record conversion preserves the existing transaction shape and account owner', () => {
  const row = transactionToCloudRow(income, 'account-a');
  assert.deepEqual(row, {
    id: income.id, user_id: 'account-a', type: 'income', amount: 87500,
    category: 'Salary', transaction_date: '2026-10-12',
    description: 'October salary', created_at: 1234
  });
  assert.deepEqual(cloudRowToTransaction(row), income);
  assert.throws(() => transactionToCloudRow(income, ''), /signed-in account/i);
});

test('account reads are scoped to the signed-in user and return normalized transactions', async () => {
  const { client, calls } = fakeClient({ data: [{
    id: 'tx-1', type: 'expense', amount: '450.50', category: 'Food',
    transaction_date: '2026-10-08', description: 'Lunch', created_at: 99
  }], error: null });
  const records = await loadUserTransactions(client, 'account-a');
  assert.deepEqual(records, [{ id: 'tx-1', type: 'expense', amount: 450.5, category: 'Food', date: '2026-10-08', description: 'Lunch', createdAt: 99 }]);
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'user_id' && call[2] === 'account-a'));
});

test('writes and merge imports always attach the current owner and do not overwrite duplicate IDs', async () => {
  const { client, calls } = fakeClient();
  await saveUserTransaction(client, 'account-a', income);
  await mergeUserTransactions(client, 'account-a', [income]);
  const writes = calls.filter(call => call[0] === 'upsert');
  assert.equal(writes[0][1].user_id, 'account-a');
  assert.equal(writes[0][2].onConflict, 'user_id,id');
  assert.equal(writes[1][1][0].user_id, 'account-a');
  assert.equal(writes[1][2].ignoreDuplicates, true);
});

test('delete and clear operations constrain all affected rows to the current owner', async () => {
  const { client, calls } = fakeClient();
  await deleteUserTransaction(client, 'account-a', 'tx-1');
  const deleteCalls = calls.filter(call => call[0] === 'eq');
  assert.deepEqual(deleteCalls.slice(0, 2), [['eq', 'user_id', 'account-a'], ['eq', 'id', 'tx-1']]);

  calls.length = 0;
  await clearUserTransactions(client, 'account-a');
  assert.deepEqual(calls.filter(call => call[0] === 'eq'), [['eq', 'user_id', 'account-a']]);
});
