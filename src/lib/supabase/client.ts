import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase client for use in Client Components ('use client').
 * Uses the public anon key only — RLS policies enforce all access control.
 *
 * Deliberately NOT parameterized with the hand-written Database type:
 * our types/database.types.ts has no `Relationships` metadata (that only
 * comes from `supabase gen types`), and without it the query builder's
 * generic parsing of embedded/joined `select()` strings used throughout
 * the admin dashboard can produce unhelpful/incorrect inferred types.
 * Row shapes are still available from src/types/database.types.ts and
 * used explicitly where it matters.
 */
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
