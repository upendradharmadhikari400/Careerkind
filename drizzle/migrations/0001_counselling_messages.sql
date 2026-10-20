CREATE TABLE public.counselling_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.counselling_messages TO authenticated;
GRANT ALL ON public.counselling_messages TO service_role;
ALTER TABLE public.counselling_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages read" ON public.counselling_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own messages insert" ON public.counselling_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX counselling_messages_user_idx ON public.counselling_messages(user_id, created_at);