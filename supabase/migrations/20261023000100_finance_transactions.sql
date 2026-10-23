create table if not exists public.finance_transactions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null check (amount > 0),
  category text not null,
  transaction_date date not null,
  description text not null default '',
  created_at bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint finance_transactions_category_type_check check (
    (type = 'income' and category in ('Salary', 'Freelance', 'Business', 'Bonus', 'Gift', 'Other'))
    or
    (type = 'expense' and category in (
      'Food', 'Health', 'Travel', 'Petrol', 'Milk', 'Bills', 'Groceries',
      'Shopping', 'Education', 'Entertainment', 'Rent', 'Internet', 'Mobile',
      'Utilities', 'Other'
    ))
  )
);

create index if not exists finance_transactions_owner_date_idx
  on public.finance_transactions (user_id, transaction_date desc, created_at desc);

alter table public.finance_transactions enable row level security;

revoke all on table public.finance_transactions from anon, authenticated;
grant select, insert, update, delete on table public.finance_transactions to authenticated;

drop policy if exists finance_transactions_select_own on public.finance_transactions;
create policy finance_transactions_select_own
  on public.finance_transactions
  for select
  to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));

drop policy if exists finance_transactions_insert_own on public.finance_transactions;
create policy finance_transactions_insert_own
  on public.finance_transactions
  for insert
  to authenticated
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

drop policy if exists finance_transactions_update_own on public.finance_transactions;
create policy finance_transactions_update_own
  on public.finance_transactions
  for update
  to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()))
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

drop policy if exists finance_transactions_delete_own on public.finance_transactions;
create policy finance_transactions_delete_own
  on public.finance_transactions
  for delete
  to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));
