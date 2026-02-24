import { createClient } from '@supabase/supabase-js';

// Hardcoded for debugging/verification purposes
const supabaseUrl = 'https://ifnjgmvcatrbiuhwsgkh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbmpnbXZjYXRyYml1aHdzZ2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDE0NTUsImV4cCI6MjA4NjMxNzQ1NX0.EyR29NIXvJTZk0VEACuu1lVz1gdkx-9AA6ZGF7w_4Ic';

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}

console.log('Initializing Supabase Client with URL:', supabaseUrl);
console.log('Using Hardcoded Key for Verification');

export const supabase = createClient(supabaseUrl, supabaseKey);
