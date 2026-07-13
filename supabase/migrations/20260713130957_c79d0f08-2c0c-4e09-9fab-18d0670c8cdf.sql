
CREATE TABLE public.report_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ai_enabled boolean NOT NULL DEFAULT true,
  ai_daily_limit integer NOT NULL DEFAULT 50,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.report_settings TO authenticated;
GRANT ALL ON public.report_settings TO service_role;
ALTER TABLE public.report_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read settings" ON public.report_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth update settings" ON public.report_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth insert settings" ON public.report_settings FOR INSERT TO authenticated WITH CHECK (true);
INSERT INTO public.report_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.report_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('template','ai')),
  title text NOT NULL,
  question text,
  filters jsonb,
  row_count integer,
  export_format text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.report_logs TO authenticated;
GRANT ALL ON public.report_logs TO service_role;
ALTER TABLE public.report_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read logs" ON public.report_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert logs" ON public.report_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth delete logs" ON public.report_logs FOR DELETE TO authenticated USING (true);
CREATE INDEX report_logs_created_at_idx ON public.report_logs (created_at DESC);
CREATE INDEX report_logs_kind_created_idx ON public.report_logs (kind, created_at DESC);
