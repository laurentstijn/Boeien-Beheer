import { createClient } from '@supabase/supabase-js';

/**
 * Admin Supabase client — uses service role key to bypass RLS.
 * Only import this in SERVER-side code (actions.ts, route.ts).
 * Never expose this to the browser.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    || 'https://ifnjgmvcatrbiuhwsgkh.supabase.co';

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
    console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set — admin client falling back to anon key (RLS applies)');
}

export const supabaseAdmin = createClient(
    supabaseUrl,
    serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    { auth: { persistSession: false, autoRefreshToken: false } }
);
