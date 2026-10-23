CREATE TABLE public.counselling_access (
 user_id uuid PRIMARY KEY,
 verified_paid_at timestamptz NOT NULL,
 payment_reference text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.counselling_access TO authenticated;
GRANT ALL ON public.counselling_access TO service_role;
ALTER TABLE public.counselling_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own verified counselling access" ON public.counselling_access FOR SELECT TO authenticated USING (auth.uid() = user_id);
COMMENT ON TABLE public.counselling_access IS 'Trusted payment verification only may write access. New questions expire 28 days after verified_paid_at; history and reports do not expire. No row retains existing free early access until payment integration is enabled.';