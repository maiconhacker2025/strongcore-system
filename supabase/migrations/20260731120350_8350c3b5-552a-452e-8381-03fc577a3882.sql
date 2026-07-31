-- 1. roles infra
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','staff')
  )
$$;

-- keep the existing shared access account working
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, r.role
FROM auth.users u
CROSS JOIN (VALUES ('admin'::public.app_role), ('staff'::public.app_role)) AS r(role)
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. beneficiarios
DROP POLICY IF EXISTS "Authenticated can view beneficiarios" ON public.beneficiarios;
DROP POLICY IF EXISTS "Authenticated can insert beneficiarios" ON public.beneficiarios;
DROP POLICY IF EXISTS "Authenticated can update beneficiarios" ON public.beneficiarios;
DROP POLICY IF EXISTS "Authenticated can delete beneficiarios" ON public.beneficiarios;
CREATE POLICY "staff manage beneficiarios" ON public.beneficiarios
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 3. beneficiario_eventos
DROP POLICY IF EXISTS "auth manage eventos" ON public.beneficiario_eventos;
CREATE POLICY "staff manage beneficiario_eventos" ON public.beneficiario_eventos
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 4. beneficiario_arquivos
DROP POLICY IF EXISTS "auth manage arquivos" ON public.beneficiario_arquivos;
CREATE POLICY "staff manage beneficiario_arquivos" ON public.beneficiario_arquivos
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 5. report_logs (own rows only, staff)
DROP POLICY IF EXISTS "auth read logs" ON public.report_logs;
DROP POLICY IF EXISTS "auth insert logs" ON public.report_logs;
DROP POLICY IF EXISTS "auth delete logs" ON public.report_logs;
CREATE POLICY "staff read own logs" ON public.report_logs
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "staff insert own logs" ON public.report_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "staff delete own logs" ON public.report_logs
  FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()) AND (user_id IS NULL OR user_id = auth.uid()));

-- 6. report_settings (staff read, admin write)
DROP POLICY IF EXISTS "auth read settings" ON public.report_settings;
DROP POLICY IF EXISTS "auth insert settings" ON public.report_settings;
DROP POLICY IF EXISTS "auth update settings" ON public.report_settings;
CREATE POLICY "staff read settings" ON public.report_settings
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin insert settings" ON public.report_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update settings" ON public.report_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. report_views
DROP POLICY IF EXISTS "auth read views" ON public.report_views;
DROP POLICY IF EXISTS "auth insert views" ON public.report_views;
DROP POLICY IF EXISTS "auth update views" ON public.report_views;
DROP POLICY IF EXISTS "auth delete views" ON public.report_views;
CREATE POLICY "staff manage report_views" ON public.report_views
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 8. storage bucket: staff only
DROP POLICY IF EXISTS "auth read arquivos bucket" ON storage.objects;
DROP POLICY IF EXISTS "auth insert arquivos bucket" ON storage.objects;
DROP POLICY IF EXISTS "auth update arquivos bucket" ON storage.objects;
DROP POLICY IF EXISTS "auth delete arquivos bucket" ON storage.objects;
CREATE POLICY "staff read arquivos bucket" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'beneficiario-arquivos' AND public.is_staff(auth.uid()));
CREATE POLICY "staff insert arquivos bucket" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'beneficiario-arquivos' AND public.is_staff(auth.uid()));
CREATE POLICY "staff update arquivos bucket" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'beneficiario-arquivos' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'beneficiario-arquivos' AND public.is_staff(auth.uid()));
CREATE POLICY "staff delete arquivos bucket" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'beneficiario-arquivos' AND public.is_staff(auth.uid()));