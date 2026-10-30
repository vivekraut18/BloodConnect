ALTER TABLE public.blood_requests
  ADD COLUMN IF NOT EXISTS required_by TIMESTAMPTZ;

ALTER TABLE public.blood_requests
  ADD COLUMN IF NOT EXISTS hospital_address TEXT;
