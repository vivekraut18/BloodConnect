-- BloodConnect 2.0 — Phase 2C RLS and initial blood-bank data

-- Status changes are still restricted by the API's transition and role checks.
-- These policies ensure the SSR client cannot bypass those ownership boundaries.
DROP POLICY IF EXISTS "blood_requests_update_authorized" ON public.blood_requests;
CREATE POLICY "blood_requests_update_authorized" ON public.blood_requests
  FOR UPDATE
  USING (
    auth.uid() = requester_id
    OR EXISTS (
      SELECT 1
      FROM public.profiles actor
      WHERE actor.id = auth.uid()
        AND (
          actor.role = 'admin'
          OR (
            actor.role = 'hospital'
            AND lower(trim(actor.name)) = lower(trim(blood_requests.hospital))
          )
        )
    )
  )
  WITH CHECK (
    auth.uid() = requester_id
    OR EXISTS (
      SELECT 1
      FROM public.profiles actor
      WHERE actor.id = auth.uid()
        AND (
          actor.role = 'admin'
          OR (
            actor.role = 'hospital'
            AND lower(trim(actor.name)) = lower(trim(blood_requests.hospital))
          )
        )
    )
  );

-- Seed data belongs in the database migration rather than a public API request.
DO $$
DECLARE
  bank_id UUID;
BEGIN
  INSERT INTO public.blood_banks
    (name, address, city, contact, phone, operating_hours, is_verified)
  SELECT
    seed.name, seed.address, seed.city, seed.contact, seed.phone,
    seed.operating_hours, true
  FROM (VALUES
    ('Apollo Hospital Blood Bank', 'Andheri East, Off Western Express Highway', 'Mumbai', '+91 22 2826 3000', '+91 22 2826 3000', '24/7 Service'),
    ('Lilavati Hospital & Research Centre', 'A-791, Bandra Reclamation, Bandra West', 'Mumbai', '+91 22 2675 1000', '+91 22 2675 1000', '24/7 Service'),
    ('AIIMS Main Blood Bank', 'Ansari Nagar, Ring Road', 'Delhi', '+91 11 2658 8500', '+91 11 2658 8500', '24/7 Service'),
    ('Indian Red Cross Society Blood Centre', '1 Red Cross Road', 'Delhi', '+91 11 2371 6441', '+91 11 2371 6441', '8:00 AM - 8:00 PM')
  ) AS seed(name, address, city, contact, phone, operating_hours)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.blood_banks existing WHERE existing.name = seed.name
  );

  FOR bank_id IN
    SELECT id
    FROM public.blood_banks
    WHERE name IN (
      'Apollo Hospital Blood Bank',
      'Lilavati Hospital & Research Centre',
      'AIIMS Main Blood Bank',
      'Indian Red Cross Society Blood Centre'
    )
  LOOP
    INSERT INTO public.blood_inventory (blood_bank_id, blood_group, units, status)
    SELECT bank_id, groups.blood_group, groups.units,
      CASE
        WHEN groups.units > 5 THEN 'available'::inventory_status
        WHEN groups.units > 0 THEN 'low'::inventory_status
        ELSE 'out_of_stock'::inventory_status
      END
    FROM (VALUES
      ('A+', 14), ('A-', 3), ('B+', 22), ('B-', 5),
      ('AB+', 8), ('AB-', 1), ('O+', 18), ('O-', 2)
    ) AS groups(blood_group, units)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.blood_inventory existing
      WHERE existing.blood_bank_id = bank_id
        AND existing.blood_group = groups.blood_group
    );
  END LOOP;
END $$;
