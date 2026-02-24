-- Enable PostGIS for location support (optional, but recommended for maps)
create extension if not exists postgis;

-- 1. ITEMS (Inventory)
create table items (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  category text not null, -- 'Ketting', 'Steen', 'Lamp', etc.
  stock_quantity integer default 0,
  min_stock_level integer default 5,
  specs jsonb default '{}'::jsonb, -- Specifics like { "length": "25m", "color": "Blue" }
  metadata jsonb default '{}'::jsonb -- FLEXIBLE FIELD: Add anything here later
);

-- 1b. ASSETS (Individual Items tracking)
create table assets (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  item_id uuid references items(id) on delete cascade,
  status text default 'in_stock', -- 'in_stock', 'deployed', 'maintenance', 'lost'
  location text, -- Warehouse location or 'Deployed at ...'
  metadata jsonb default '{}'::jsonb -- Specifics for this exact unit (e.g. serial number, next inspection)
);

-- 2. BUOY CONFIGURATIONS (Types of Buoys)
create table buoy_configurations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null, -- e.g., 'JET 2000'
  image_url text,
  metadata jsonb default '{}'::jsonb -- FLEXIBLE FIELD
);

-- 3. BUOY COMPONENTS (The "Recipe" for a buoy)
create table buoy_components (
  id uuid default gen_random_uuid() primary key,
  buoy_config_id uuid references buoy_configurations(id) on delete cascade,
  item_id uuid references items(id) on delete cascade,
  quantity integer default 1,
  metadata jsonb default '{}'::jsonb -- FLEXIBLE FIELD
);

-- 4. DEPLOYED BUOYS (Instances in the water)
create table deployed_buoys (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  buoy_config_id uuid references buoy_configurations(id),
  name text not null, -- e.g., 'Z-Boei oosterweel'
  location point, -- Simple point (x, y) = (lat, lng). Use geography(Point) if using PostGIS.
  deployment_date date default CURRENT_DATE,
  status text default 'OK',
  notes text,
  metadata jsonb default '{}'::jsonb -- FLEXIBLE FIELD
);

-- 5. MAINTENANCE LOGS
create table maintenance_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deployed_buoy_id uuid references deployed_buoys(id) on delete cascade,
  service_date date default CURRENT_DATE,
  description text,
  technician text,
  metadata jsonb default '{}'::jsonb -- FLEXIBLE FIELD
);
