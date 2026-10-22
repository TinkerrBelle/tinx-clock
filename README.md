# Things Clock

Shift, hours and pay tracker. Next.js + Supabase.

1. Create a Supabase project, then run `supabase/schema.sql` in the SQL Editor.
2. Copy `.env.example` to `.env.local` and fill in the Project URL and anon key (Project Settings > API).
3. `npm install` then `npm run dev` and open http://localhost:3000
4. Deploy to Vercel: add the same two env vars, then add your Vercel URL under Supabase > Authentication > URL Configuration.
