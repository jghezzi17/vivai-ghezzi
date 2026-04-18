-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Users Table (Extension of auth.users)
create table public.usersvivai (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  nome text,
  cognome text,
  ruolo text check (ruolo in ('admin', 'maestro', 'user')) default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- Ensure Row Level Security (RLS) is enabled but allow all for now for ease of dev
alter table public.usersvivai enable row level security;
create policy "Allow all operations for authenticated users" on public.usersvivai for all using (auth.role() = 'authenticated');

-- 2. Create Clienti Table
create table public.clienti (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  cognome text not null,
  codice_fiscale text,
  partita_iva text,
  email text,
  telefono text,
  indirizzo text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.clienti enable row level security;
create policy "Allow all operations for authenticated users" on public.clienti for all using (auth.role() = 'authenticated');

-- 3. Create Articoli Table
create table public.articoli (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  tipo text check (tipo in ('macchinario', 'materiale')) not null,
  quantita numeric not null default 0,
  unita_misura text check (unita_misura in ('ore', 'pz', 'kg')) not null,
  costo numeric not null default 0,
  aliquota_iva numeric not null default 22,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.articoli enable row level security;
create policy "Allow all operations for authenticated users" on public.articoli for all using (auth.role() = 'authenticated');

-- 4. Create Interventi Table
create table public.interventi (
  id uuid default uuid_generate_v4() primary key,
  cliente_id uuid references public.clienti(id) on delete set null,
  data date not null,
  note text,
  costo_totale numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.interventi enable row level security;
create policy "Allow all operations for authenticated users" on public.interventi for all using (auth.role() = 'authenticated');

-- 5. Create Intervento_Operai Table
create table public.intervento_operai (
  id uuid default uuid_generate_v4() primary key,
  intervento_id uuid references public.interventi(id) on delete cascade not null,
  operaio_id uuid references public.usersvivai(id) on delete cascade not null,
  ora_inizio time not null,
  ora_fine time not null,
  pausa_minuti int default 0
);
alter table public.intervento_operai enable row level security;
create policy "Allow all operations for authenticated users" on public.intervento_operai for all using (auth.role() = 'authenticated');

-- 6. Create Intervento_Articoli Table
create table public.intervento_articoli (
  id uuid default uuid_generate_v4() primary key,
  intervento_id uuid references public.interventi(id) on delete cascade not null,
  articolo_id uuid references public.articoli(id) on delete cascade not null,
  quantita_usata numeric not null
);
alter table public.intervento_articoli enable row level security;
create policy "Allow all operations for authenticated users" on public.intervento_articoli for all using (auth.role() = 'authenticated');

-- TRIGGER: Automatically create a usersvivai entry when a new user signs up in auth.users
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.usersvivai (id, email, nome, cognome, ruolo)
  values (new.id, new.email, '', '', 'user');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Optional: Initial Admin User (You need to register in Supabase first to get an auth.users row, 
-- then you can manually run this exact update to make your user an admin).
-- UPDATE public.usersvivai SET ruolo = 'admin' WHERE email = 'your-email@example.com';
