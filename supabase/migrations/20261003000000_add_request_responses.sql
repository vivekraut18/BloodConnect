-- BloodConnect 2.0 — Add Request Responses Table and RLS Policies

CREATE TABLE IF NOT EXISTS public.request_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  donor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'declined', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, donor_id)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_request_responses_request_id ON public.request_responses(request_id);
CREATE INDEX IF NOT EXISTS idx_request_responses_donor_id ON public.request_responses(donor_id);
CREATE INDEX IF NOT EXISTS idx_request_responses_status ON public.request_responses(status);

-- Enable RLS
ALTER TABLE public.request_responses ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT
-- Donors see their own responses; requesters see responses to their requests; hospitals and admins see all responses
DROP POLICY IF EXISTS "request_responses_select_policy" ON public.request_responses;
CREATE POLICY "request_responses_select_policy" ON public.request_responses
  FOR SELECT
  USING (
    auth.uid() = donor_id
    OR EXISTS (
      SELECT 1 FROM public.blood_requests r
      WHERE r.id = request_id AND r.requester_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('hospital', 'admin')
    )
  );

-- Policy: INSERT
-- Authenticated donors can insert their own response
DROP POLICY IF EXISTS "request_responses_insert_policy" ON public.request_responses;
CREATE POLICY "request_responses_insert_policy" ON public.request_responses
  FOR INSERT
  WITH CHECK (
    auth.uid() = donor_id
  );

-- Policy: UPDATE
-- Donors can update their own response; hospitals and admins can update response status
DROP POLICY IF EXISTS "request_responses_update_policy" ON public.request_responses;
CREATE POLICY "request_responses_update_policy" ON public.request_responses
  FOR UPDATE
  USING (
    auth.uid() = donor_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('hospital', 'admin')
    )
  )
  WITH CHECK (
    auth.uid() = donor_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('hospital', 'admin')
    )
  );

-- Policy: DELETE
-- Donors can delete their own response; admins can delete any response
DROP POLICY IF EXISTS "request_responses_delete_policy" ON public.request_responses;
CREATE POLICY "request_responses_delete_policy" ON public.request_responses
  FOR DELETE
  USING (
    auth.uid() = donor_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
