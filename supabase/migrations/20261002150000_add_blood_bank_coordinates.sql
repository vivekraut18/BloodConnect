-- ============================================================================
-- BloodConnect 2.0 — Add geo-coordinates to blood_banks
-- Enables location-based nearby facility search
-- ============================================================================

-- 1. Add latitude/longitude columns (nullable — not all banks may have coords yet)
ALTER TABLE public.blood_banks
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 2. Index for coordinate-based queries
CREATE INDEX IF NOT EXISTS idx_blood_banks_coords
  ON public.blood_banks (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 3. Update existing seed banks with real-world coordinates
UPDATE public.blood_banks SET latitude = 19.1197, longitude = 72.8680
  WHERE name = 'Apollo Hospital Blood Bank' AND latitude IS NULL;

UPDATE public.blood_banks SET latitude = 19.0509, longitude = 72.8266
  WHERE name = 'Lilavati Hospital & Research Centre' AND latitude IS NULL;

UPDATE public.blood_banks SET latitude = 28.5672, longitude = 77.2100
  WHERE name = 'AIIMS Main Blood Bank' AND latitude IS NULL;

UPDATE public.blood_banks SET latitude = 28.6257, longitude = 77.2340
  WHERE name = 'Indian Red Cross Society Blood Centre' AND latitude IS NULL;
