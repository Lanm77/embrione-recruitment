-- Embrione Recruitment demo: run in Supabase SQL Editor.
-- This script can run even if you already created the members table.
-- The supplied credentials must be configured as a Supabase Auth user
-- in Dashboard > Authentication > Users > Add user (see README).

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null,
  position text not null,
  srn text not null unique,
  email text not null,
  linkedin_url text,
  github_url text,
  branch text not null,
  semester integer not null check (semester between 1 and 8),
  bio text check (char_length(bio) <= 200),
  photo_url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.members enable row level security;

-- Any visitor may add a pending registration, but not approve themselves.
drop policy if exists "Public registration" on public.members;
drop policy if exists "Allow public insert" on public.members;
create policy "Public registration"
on public.members for insert to anon, authenticated
with check (status = 'pending');

-- Only approved profiles are publicly readable.
drop policy if exists "Public approved members" on public.members;
drop policy if exists "Allow public read" on public.members;
create policy "Public approved members"
on public.members for select to anon, authenticated
using (status = 'approved');

-- Do not allow untrusted public clients to moderate members.
drop policy if exists "Allow admin updates" on public.members;
drop policy if exists "Allow admin deletes" on public.members;
drop policy if exists "Admin read all" on public.members;
drop policy if exists "Admin moderate" on public.members;
create policy "Admin read all" on public.members for select to authenticated
using ((select auth.jwt() ->> 'email') = 'admin@embrione.pes.edu');
create policy "Admin moderate" on public.members for update to authenticated
using ((select auth.jwt() ->> 'email') = 'admin@embrione.pes.edu')
with check ((select auth.jwt() ->> 'email') = 'admin@embrione.pes.edu');

-- Browser WebP uploads. This assumes you created a PUBLIC
-- Storage bucket named member-photos in the Supabase dashboard.
drop policy if exists "Public webp uploads" on storage.objects;
create policy "Public webp uploads" on storage.objects
for insert to anon, authenticated
with check (
  bucket_id = 'member-photos'
  and lower(storage.extension(name)) = 'webp'
);

-- Demo starter profiles, visible in /team immediately.
-- Names, SRNs and bios below are fictional.
insert into public.members
  (name, domain, position, srn, email, branch, semester, bio, photo_url, status)
values
  ('Ethan brooks', 'Web Development', 'Head', 'PES1UG25CS901', 'aarav.demo@example.com', 'CSE', 3, 'Building thoughtful web experiences.', 'https://api.dicebear.com/9.x/initials/svg?seed=Aarav%20Mehta', 'approved'),
  ('Josh Bradley', 'Design', 'Core Member', 'PES1UG25CS902', 'nisha.demo@example.com', 'AIML', 3, 'Designing clear and accessible interfaces.', 'https://api.dicebear.com/9.x/initials/svg?seed=Nisha%20Rao', 'approved'),
  ('Amogh Kashyap', 'Logistics', 'Member', 'PES1UG25CS903', 'kiran.demo@example.com', 'ECE', 2, 'Keeping events organized and on track.', 'https://api.dicebear.com/9.x/initials/svg?seed=Kiran%20Shah', 'approved'),
  ('Zhang Xinyi', 'Social Media', 'Vice-Head', 'PES1UG25CS904', 'maya.demo@example.com', 'CSE', 4, 'Connecting students through creative stories.', 'https://api.dicebear.com/9.x/initials/svg?seed=Maya%20Iyer', 'approved'),
  ('Dimitri Koslov', 'Operations', 'Core Member', 'PES1UG25CS905', 'dev.demo@example.com', 'EEE', 4, 'Turning good plans into great events.', 'https://api.dicebear.com/9.x/initials/svg?seed=Dev%20Patel', 'approved')
on conflict (srn) do nothing;
