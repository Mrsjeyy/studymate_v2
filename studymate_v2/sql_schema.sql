create table if not exists public.study_sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.study_sets(id) on delete cascade,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);
