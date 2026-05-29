import { createBrowserClient } from "@supabase/ssr";

// Add these to .env.local once you have the project credentials:
//   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
//
// SQL to run once in the Supabase SQL editor:
//
//   -- 1. Profiles table
//   create table public.profiles (
//     id             uuid references auth.users on delete cascade primary key,
//     created_at     timestamptz default now() not null,
//     username       text unique,
//     intent         text check (intent in ('submitter', 'reviewer', 'both')),
//     bio            text,
//     github_url     text,
//     wallet_address text
//   );
//
//   -- 2. Row-level security
//   alter table public.profiles enable row level security;
//
//   create policy "Anyone can read profiles"
//     on public.profiles for select using (true);
//
//   create policy "Owner can update profile"
//     on public.profiles for update using (auth.uid() = id);
//
//   -- 3. Trigger — creates the profile row automatically on sign-up
//   --    (runs as service role so it bypasses RLS; no INSERT policy needed)
//   create or replace function public.handle_new_user()
//   returns trigger as $$
//   begin
//     insert into public.profiles (id, username, intent)
//     values (
//       new.id,
//       new.raw_user_meta_data->>'username',
//       new.raw_user_meta_data->>'intent'
//     );
//     return new;
//   end;
//   $$ language plpgsql security definer;
//
//   create or replace trigger on_auth_user_created
//     after insert on auth.users
//     for each row execute procedure public.handle_new_user();

const supabaseUrl      = process.env.NEXT_PUBLIC_SUPABASE_URL      ?? "";
const supabaseAnonKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
