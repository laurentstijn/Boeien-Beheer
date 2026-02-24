-- ==========================================
-- MIGRATIE: Zeeschelde vs. Zeetijger (Zones)
-- ==========================================
-- BEVAT: 
-- 1. Toevoegen van de 'zone' kolom aan alle tabellen
-- 2. Het standaard invullen van de test-data naar 'zone_zeeschelde'
-- 3. Het beveiligen van de rijen middels RLS policies
-- ==========================================

-- 1. Voeg 'zone' kolom toe (indien het nog niet bestaat)
ALTER TABLE IF EXISTS public.deployed_buoys ADD COLUMN IF NOT EXISTS zone text DEFAULT 'zone_zeeschelde';
ALTER TABLE IF EXISTS public.assets ADD COLUMN IF NOT EXISTS zone text DEFAULT 'zone_zeeschelde';
ALTER TABLE IF EXISTS public.maintenance_logs ADD COLUMN IF NOT EXISTS zone text DEFAULT 'zone_zeeschelde';
ALTER TABLE IF EXISTS public.planning_entries ADD COLUMN IF NOT EXISTS zone text DEFAULT 'zone_zeeschelde';

-- 2. Zorg dat alle historische (bestaande) data 'zone_zeeschelde' krijgt
UPDATE public.deployed_buoys SET zone = 'zone_zeeschelde' WHERE zone IS NULL;
UPDATE public.assets SET zone = 'zone_zeeschelde' WHERE zone IS NULL;
UPDATE public.maintenance_logs SET zone = 'zone_zeeschelde' WHERE zone IS NULL;
UPDATE public.planning_entries SET zone = 'zone_zeeschelde' WHERE zone IS NULL;

-- ==========================================
-- 3. HULPFUNCTIES VOOR AUTHENTICATIE JWT
-- ==========================================
-- We halen de 'zone' en 'role' (admin) direct uit de login-token (JWT metadata) van de gebruiker.

CREATE OR REPLACE FUNCTION public.get_auth_zone()
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->'user_metadata'->>'zone', '')::text;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT COALESCE((current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role') = 'admin', false);
$$;

-- Stel 'zone_zeeschelde' of JWT-zone als standaard in voor nieuwe inserts (indien niet manueel meegegeven)
ALTER TABLE public.deployed_buoys ALTER COLUMN zone SET DEFAULT COALESCE(public.get_auth_zone(), 'zone_zeeschelde');
ALTER TABLE public.assets ALTER COLUMN zone SET DEFAULT COALESCE(public.get_auth_zone(), 'zone_zeeschelde');
ALTER TABLE public.maintenance_logs ALTER COLUMN zone SET DEFAULT COALESCE(public.get_auth_zone(), 'zone_zeeschelde');
ALTER TABLE public.planning_entries ALTER COLUMN zone SET DEFAULT COALESCE(public.get_auth_zone(), 'zone_zeeschelde');


-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS) INSCHAKELEN
-- ==========================================
ALTER TABLE public.deployed_buoys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_entries ENABLE ROW LEVEL SECURITY;

-- OPGELET: We activeren géén RLS op `items` (de algemene database cataloog zoals "JET 2000").
-- Iedere ingelogde gebruiker mag deze standaard lezen (maar niet zomaar editen, daarvoor is service_role nodig).
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Iedereen mag items lezen" ON public.items FOR SELECT USING (true);


-- ==========================================
-- 5. BEVEILIGINGSBELEID (POLICIES) AANMAKEN
-- ==========================================

-- Voor DEPLOYED BUOYS (Boeien)
DROP POLICY IF EXISTS "Zone isolation or admin override for buoys" ON public.deployed_buoys;
CREATE POLICY "Zone isolation or admin override for buoys" 
  ON public.deployed_buoys
  FOR ALL
  USING (
    public.is_admin() OR public.get_auth_zone() = zone
  )
  WITH CHECK (
    public.is_admin() OR public.get_auth_zone() = zone
  );

-- Voor ASSETS (Voorraad / Kettingen / Stenen)
DROP POLICY IF EXISTS "Zone isolation or admin override for assets" ON public.assets;
CREATE POLICY "Zone isolation or admin override for assets" 
  ON public.assets
  FOR ALL
  USING (
    public.is_admin() OR public.get_auth_zone() = zone
  )
  WITH CHECK (
    public.is_admin() OR public.get_auth_zone() = zone
  );

-- Voor MAINTENANCE LOGS (Onderhoudsrapporten)
DROP POLICY IF EXISTS "Zone isolation or admin override for maintenance" ON public.maintenance_logs;
CREATE POLICY "Zone isolation or admin override for maintenance" 
  ON public.maintenance_logs
  FOR ALL
  USING (
    public.is_admin() OR public.get_auth_zone() = zone
  )
  WITH CHECK (
    public.is_admin() OR public.get_auth_zone() = zone
  );

-- Voor PLANNING ENTRIES (Kalender)
DROP POLICY IF EXISTS "Zone isolation or admin override for planning" ON public.planning_entries;
CREATE POLICY "Zone isolation or admin override for planning" 
  ON public.planning_entries
  FOR ALL
  USING (
    public.is_admin() OR public.get_auth_zone() = zone
  )
  WITH CHECK (
    public.is_admin() OR public.get_auth_zone() = zone
  );

-- EINDE MIGRATIE
