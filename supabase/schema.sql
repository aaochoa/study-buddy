-- PostgreSQL Schema for Study Buddy database

-- 1. Create the guides table (One User can have Many Guides)
create table if not exists public.guides (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    filename text not null,
    content text not null,
    size integer not null,
    mtime timestamp with time zone default timezone('utc'::text, now()) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, filename)
);

-- 2. Create the problems table (Global catalog of coding problems)
create table if not exists public.problems (
    id text primary key,
    title text not null,
    difficulty text not null,
    description text not null,
    languages jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create the coding_challenges table (One User can have Many Coding Challenges/Solutions)
create table if not exists public.coding_challenges (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    problem_id text references public.problems(id) on delete cascade not null,
    language text not null,
    code text not null,
    completed boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, problem_id, language)
);

-- Enable Row Level Security (RLS) for all tables
alter table public.guides enable row level security;
alter table public.problems enable row level security;
alter table public.coding_challenges enable row level security;

-- RLS Policies for guides table
create policy "Users can view their own guides"
    on public.guides for select
    using (auth.uid() = user_id);

create policy "Users can insert their own guides"
    on public.guides for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own guides"
    on public.guides for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own guides"
    on public.guides for delete
    using (auth.uid() = user_id);

-- RLS Policies for problems table (Global table accessible to all authenticated users)
create policy "Users can view all problems"
    on public.problems for select
    using (auth.role() = 'authenticated');

create policy "Users can insert problems"
    on public.problems for insert
    with check (auth.role() = 'authenticated');

create policy "Users can update problems"
    on public.problems for update
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');

create policy "Users can delete problems"
    on public.problems for delete
    using (auth.role() = 'authenticated');

-- RLS Policies for coding_challenges table
create policy "Users can view their own coding challenges"
    on public.coding_challenges for select
    using (auth.uid() = user_id);

create policy "Users can insert their own coding challenges"
    on public.coding_challenges for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own coding challenges"
    on public.coding_challenges for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own coding challenges"
    on public.coding_challenges for delete
    using (auth.uid() = user_id);

