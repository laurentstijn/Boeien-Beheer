import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
    try {
        const sql = `
-- Create note_sections table
CREATE TABLE IF NOT EXISTS public.note_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    zone TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create note_pages table
CREATE TABLE IF NOT EXISTS public.note_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES public.note_sections(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Nieuwe Pagina',
    content TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add updated_at trigger for note_pages
CREATE OR REPLACE FUNCTION update_note_pages_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_note_pages_updated_at ON public.note_pages;
CREATE TRIGGER update_note_pages_updated_at
    BEFORE UPDATE ON public.note_pages
    FOR EACH ROW
    EXECUTE FUNCTION update_note_pages_updated_at_column();

-- Enable RLS
ALTER TABLE public.note_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_pages ENABLE ROW LEVEL SECURITY;

-- Note sections policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.note_sections;
CREATE POLICY "Enable read access for all users" ON public.note_sections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON public.note_sections;
CREATE POLICY "Enable insert access for all users" ON public.note_sections FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON public.note_sections;
CREATE POLICY "Enable update access for all users" ON public.note_sections FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON public.note_sections;
CREATE POLICY "Enable delete access for all users" ON public.note_sections FOR DELETE USING (true);

-- Note pages policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.note_pages;
CREATE POLICY "Enable read access for all users" ON public.note_pages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON public.note_pages;
CREATE POLICY "Enable insert access for all users" ON public.note_pages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON public.note_pages;
CREATE POLICY "Enable update access for all users" ON public.note_pages FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON public.note_pages;
CREATE POLICY "Enable delete access for all users" ON public.note_pages FOR DELETE USING (true);
        `;

        const { error } = await supabase.rpc('run_sql', { sql_query: sql });
        if (error) return NextResponse.json({ success: false, error: error.message });

        return NextResponse.json({ success: true, message: 'Notes tables created successfully' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message });
    }
}
