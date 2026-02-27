-- Create note_sections table
CREATE TABLE public.note_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    zone TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create note_pages table
CREATE TABLE public.note_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES public.note_sections(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Nieuwe Pagina',
    content TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add updated_at trigger for note_pages
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = EXCLUDED.updated_at; -- No wait, simpler: NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_note_pages_updated_at
    BEFORE UPDATE ON public.note_pages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.note_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_pages ENABLE ROW LEVEL SECURITY;

-- Create Policies (Global access within the same zone for now)
-- Allow all authenticated users to read sections
CREATE POLICY "Enable read access for all users" ON public.note_sections
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert sections
CREATE POLICY "Enable insert access for all users" ON public.note_sections
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to update sections
CREATE POLICY "Enable update access for all users" ON public.note_sections
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow all authenticated users to delete sections
CREATE POLICY "Enable delete access for all users" ON public.note_sections
    FOR DELETE USING (auth.role() = 'authenticated');


-- Allow all authenticated users to read pages
CREATE POLICY "Enable read access for all users" ON public.note_pages
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert pages
CREATE POLICY "Enable insert access for all users" ON public.note_pages
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to update pages
CREATE POLICY "Enable update access for all users" ON public.note_pages
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow all authenticated users to delete pages
CREATE POLICY "Enable delete access for all users" ON public.note_pages
    FOR DELETE USING (auth.role() = 'authenticated');
