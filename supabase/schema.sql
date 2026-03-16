-- ============================================
-- BudgetPilot Database Schema
-- Run this in your Supabase SQL editor
-- ============================================

-- Profiles table (auto-created on user signup)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Budgets table (company-level budgets)
create table if not exists public.budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  base_amount numeric(15,2) not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.budgets enable row level security;
create policy "Users can manage own budgets" on public.budgets for all using (auth.uid() = user_id);

-- Categories table (spending categories within a budget)
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  budget_id uuid references public.budgets on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  budget_amount numeric(15,2) not null default 0,
  color text not null default '#6366f1',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.categories enable row level security;
create policy "Users can manage own categories" on public.categories for all using (auth.uid() = user_id);

-- Change orders (budget adjustments at company or category level)
create table if not exists public.change_orders (
  id uuid default gen_random_uuid() primary key,
  budget_id uuid references public.budgets on delete cascade,
  category_id uuid references public.categories on delete cascade,
  user_id uuid references auth.users on delete cascade not null,
  description text not null,
  amount numeric(15,2) not null,
  order_date date not null,
  file_url text,
  file_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.change_orders enable row level security;
create policy "Users can manage own change_orders" on public.change_orders for all using (auth.uid() = user_id);

-- Invoices table
create table if not exists public.invoices (
  id uuid default gen_random_uuid() primary key,
  budget_id uuid references public.budgets on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  invoice_date date not null,
  file_url text,
  file_name text,
  total_amount numeric(15,2) not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.invoices enable row level security;
create policy "Users can manage own invoices" on public.invoices for all using (auth.uid() = user_id);

-- Invoice items (line items within an invoice)
create table if not exists public.invoice_items (
  id uuid default gen_random_uuid() primary key,
  invoice_id uuid references public.invoices on delete cascade not null,
  category_id uuid references public.categories on delete set null,
  user_id uuid references auth.users on delete cascade not null,
  description text not null,
  amount numeric(15,2) not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.invoice_items enable row level security;
create policy "Users can manage own invoice_items" on public.invoice_items for all using (auth.uid() = user_id);

-- Budget approvals (monthly approved amounts per category)
create table if not exists public.budget_approvals (
  id uuid default gen_random_uuid() primary key,
  budget_id uuid references public.budgets on delete cascade not null,
  category_id uuid references public.categories on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  amount numeric(15,2) not null,
  description text,
  approval_month integer not null check (approval_month between 1 and 12),
  approval_year integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.budget_approvals enable row level security;
create policy "Users can manage own budget_approvals" on public.budget_approvals for all using (auth.uid() = user_id);

-- ============================================
-- Storage Buckets (create in Supabase Dashboard > Storage)
-- ============================================
-- 1. avatars         (public)  - for user profile pictures
-- 2. invoice-files   (public)  - for invoice attachments
-- 3. change-order-files (public) - for change order attachments

-- ============================================
-- Trigger: auto-create profile on user signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
