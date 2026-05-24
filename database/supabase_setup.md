# Supabase setup (SQL)
Chạy toàn bộ SQL dưới đây trong Supabase SQL Editor (theo thứ tự).

```sql
-- Extensions
create extension if not exists "pgcrypto";

-- Enums (optional)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'user');
  end if;
  if not exists (select 1 from pg_type where typname = 'user_status') then
    create type public.user_status as enum ('active', 'inactive', 'banned');
  end if;
  if not exists (select 1 from pg_type where typname = 'listing_status') then
    create type public.listing_status as enum ('available', 'sold');
  end if;
end$$;

-- Profiles (mirror of auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  avatar_url text,
  role public.user_role not null default 'user',
  status public.user_status not null default 'active',
  listing_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Catalog
create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  description text
);

create table if not exists public.books (
  id bigint generated always as identity primary key,
  title text not null,
  author text not null,
  language text not null default 'und',
  isbn text unique,
  description text,
  category_id bigint references public.categories(id) on delete set null
);

-- Listings
create table if not exists public.listings (
  id bigint generated always as identity primary key,
  book_id bigint not null references public.books(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  price numeric(10,2) not null,
  condition text not null,
  status public.listing_status not null default 'available',
  sold_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_listings_book_id on public.listings(book_id);
create index if not exists idx_listings_seller_id on public.listings(seller_id);
create index if not exists idx_listings_is_active on public.listings(is_active);

create table if not exists public.listing_images (
  id bigint generated always as identity primary key,
  listing_id bigint not null references public.listings(id) on delete cascade,
  url text not null
);

create index if not exists idx_listing_images_listing_id on public.listing_images(listing_id);

-- Messages
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  listing_id bigint references public.listings(id) on delete set null,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_sender_id on public.messages(sender_id);
create index if not exists idx_messages_receiver_id on public.messages(receiver_id);

-- Helpers
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.status = 'active'
  );
$$;

create or replace function public.is_not_banned()
returns boolean
language sql
stable
as $$
  select coalesce(
    (select p.status <> 'banned' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Trigger: create profile row when auth user created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Trigger: set sold_at when status turns sold
create or replace function public.set_sold_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'sold' and (old.status is distinct from new.status) then
    new.sold_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_sold_at on public.listings;
create trigger trg_set_sold_at
before update on public.listings
for each row execute procedure public.set_sold_at();

-- Trigger: listing_count on profiles
create or replace function public.inc_listing_count()
returns trigger
language plpgsql
as $$
begin
  update public.profiles
  set listing_count = listing_count + 1
  where id = new.seller_id;
  return new;
end;
$$;

create or replace function public.dec_listing_count()
returns trigger
language plpgsql
as $$
begin
  update public.profiles
  set listing_count = greatest(listing_count - 1, 0)
  where id = old.seller_id;
  return old;
end;
$$;

drop trigger if exists trg_inc_listing_count on public.listings;
create trigger trg_inc_listing_count
after insert on public.listings
for each row execute procedure public.inc_listing_count();

drop trigger if exists trg_dec_listing_count on public.listings;
create trigger trg_dec_listing_count
after delete on public.listings
for each row execute procedure public.dec_listing_count();

-- RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.books enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.messages enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
on public.profiles
for all
using (public.is_admin())
with check (public.is_admin());

-- categories/books: public read, admin write
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read"
on public.categories
for select
using (true);

drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write"
on public.categories
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "books_public_read" on public.books;
create policy "books_public_read"
on public.books
for select
using (true);

drop policy if exists "books_admin_write" on public.books;
create policy "books_admin_write"
on public.books
for all
using (public.is_admin())
with check (public.is_admin());

-- listings: public can read active, owners can manage own, admin can manage all
drop policy if exists "listings_public_read_active" on public.listings;
create policy "listings_public_read_active"
on public.listings
for select
using (is_active = true);

drop policy if exists "listings_owner_read" on public.listings;
create policy "listings_owner_read"
on public.listings
for select
using (seller_id = auth.uid());

drop policy if exists "listings_owner_write" on public.listings;
create policy "listings_owner_write"
on public.listings
for all
using (seller_id = auth.uid() and public.is_not_banned())
with check (seller_id = auth.uid() and public.is_not_banned());

drop policy if exists "listings_admin_all" on public.listings;
create policy "listings_admin_all"
on public.listings
for all
using (public.is_admin())
with check (public.is_admin());

-- listing_images: public can read images of active listings, owners/admin can manage
drop policy if exists "listing_images_public_read_active" on public.listing_images;
create policy "listing_images_public_read_active"
on public.listing_images
for select
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_images.listing_id and l.is_active = true
  )
);

drop policy if exists "listing_images_owner_write" on public.listing_images;
create policy "listing_images_owner_write"
on public.listing_images
for all
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_images.listing_id
      and l.seller_id = auth.uid()
  ) and public.is_not_banned()
)
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_images.listing_id
      and l.seller_id = auth.uid()
  ) and public.is_not_banned()
);

drop policy if exists "listing_images_admin_all" on public.listing_images;
create policy "listing_images_admin_all"
on public.listing_images
for all
using (public.is_admin())
with check (public.is_admin());

-- messages: only sender/receiver can read/write their messages (admin can read)
drop policy if exists "messages_member_read" on public.messages;
create policy "messages_member_read"
on public.messages
for select
using (sender_id = auth.uid() or receiver_id = auth.uid() or public.is_admin());

drop policy if exists "messages_member_insert" on public.messages;
create policy "messages_member_insert"
on public.messages
for insert
with check (sender_id = auth.uid() and public.is_not_banned());

drop policy if exists "messages_member_update" on public.messages;
create policy "messages_member_update"
on public.messages
for update
using ((sender_id = auth.uid() or receiver_id = auth.uid()) and public.is_not_banned())
with check ((sender_id = auth.uid() or receiver_id = auth.uid()) and public.is_not_banned());

-- Storage bucket (optional)
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- NOTE:
-- Trên Supabase hosted, table storage.objects thường không thuộc owner của role đang chạy SQL Editor,
-- nên câu lệnh ALTER/POLICY có thể báo lỗi "must be owner of table objects".
-- Nếu gặp lỗi đó: tạo policies trong Dashboard (Storage -> Policies) thay vì chạy SQL.

drop policy if exists "storage_public_read_listing_images" on storage.objects;
create policy "storage_public_read_listing_images"
on storage.objects
for select
using (bucket_id = 'listing-images');

drop policy if exists "storage_user_write_listing_images" on storage.objects;
create policy "storage_user_write_listing_images"
on storage.objects
for all
using (bucket_id = 'listing-images' and owner = auth.uid() and public.is_not_banned())
with check (bucket_id = 'listing-images' and owner = auth.uid() and public.is_not_banned());
```

## Gợi ý seed admin
- Tạo user trong Supabase Auth (UI) rồi chạy:
```sql
update public.profiles
set role = 'admin'
where id = '<USER_UUID>';
```
