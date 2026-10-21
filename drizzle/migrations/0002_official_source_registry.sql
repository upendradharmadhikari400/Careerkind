CREATE TABLE public.source_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  title text NOT NULL,
  authority text NOT NULL,
  category text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  content text,
  fetched_at timestamptz,
  verified_at timestamptz,
  status text NOT NULL DEFAULT 'registered',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.source_records TO authenticated;
GRANT ALL ON public.source_records TO service_role;

ALTER TABLE public.source_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read official sources"
ON public.source_records FOR SELECT TO authenticated USING (true);

INSERT INTO public.source_records (url, title, authority, category, keywords) VALUES
('https://jeemain.nta.ac.in', 'JEE Main — official portal', 'National Testing Agency (NTA)', 'entrance_exam', ARRAY['jee','jee main','engineering entrance','b.tech','btech','nit','iiit']),
('https://jeeadv.ac.in', 'JEE Advanced — official portal', 'IIT (organising institute)', 'entrance_exam', ARRAY['jee advanced','iit','iit admission']),
('https://neet.nta.nic.in', 'NEET (UG) — official portal', 'National Testing Agency (NTA)', 'entrance_exam', ARRAY['neet','medical entrance','mbbs','bds','aiims']),
('https://cuet.samarth.ac.in', 'CUET (UG) — official portal', 'National Testing Agency (NTA)', 'entrance_exam', ARRAY['cuet','central university','delhi university','du admission','bhu']),
('https://consortiumofnlus.ac.in', 'CLAT — official portal', 'Consortium of National Law Universities', 'entrance_exam', ARRAY['clat','law','nlu','ba llb','llb']),
('https://www.nata.in', 'NATA — official portal', 'Council of Architecture', 'entrance_exam', ARRAY['nata','architecture','b.arch']),
('https://www.nift.ac.in', 'NIFT — official website', 'National Institute of Fashion Technology', 'institution', ARRAY['nift','fashion','design']),
('https://josaa.nic.in', 'JoSAA — joint seat allocation', 'JoSAA (IIT/NIT counselling)', 'counselling', ARRAY['josaa','seat allocation','iit counselling','nit counselling','cutoff','cut-off','opening rank','closing rank']),
('https://mcc.nic.in', 'MCC — medical counselling', 'Medical Counselling Committee', 'counselling', ARRAY['mcc','medical counselling','mbbs counselling','neet counselling']),
('https://www.ugc.gov.in', 'UGC — University Grants Commission', 'University Grants Commission', 'regulator', ARRAY['ugc','university recognition','deemed university','fake university']),
('https://www.aicte-india.org', 'AICTE — technical education regulator', 'All India Council for Technical Education', 'regulator', ARRAY['aicte','technical approval','engineering college approval']),
('https://scholarships.gov.in', 'National Scholarship Portal', 'Government of India', 'scholarship', ARRAY['scholarship','national scholarship','nsp','financial aid']),
('https://satsuite.collegeboard.org/sat', 'SAT — official portal', 'College Board', 'entrance_exam', ARRAY['sat','us admission','undergraduate abroad','college board']),
('https://www.ielts.org', 'IELTS — official portal', 'IELTS (British Council / IDP / Cambridge)', 'entrance_exam', ARRAY['ielts','english test','study abroad english']),
('https://www.ets.org/toefl.html', 'TOEFL — official portal', 'ETS', 'entrance_exam', ARRAY['toefl','ets','english proficiency']),
('https://www.studyinindia.gov.in', 'Study in India — official portal', 'Ministry of Education, Government of India', 'scholarship', ARRAY['study in india','government scholarship']),
('https://www.cbse.gov.in', 'CBSE — official website', 'Central Board of Secondary Education', 'board', ARRAY['cbse','board exam','class 12','class 10']);