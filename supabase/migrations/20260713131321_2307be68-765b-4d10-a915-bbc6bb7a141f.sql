
CREATE TABLE public.report_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_id text,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_views TO authenticated;
GRANT ALL ON public.report_views TO service_role;
ALTER TABLE public.report_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read views" ON public.report_views FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert views" ON public.report_views FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update views" ON public.report_views FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete views" ON public.report_views FOR DELETE TO authenticated USING (true);
CREATE INDEX report_views_created_at_idx ON public.report_views (created_at DESC);
