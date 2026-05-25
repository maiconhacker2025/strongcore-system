
DROP POLICY IF EXISTS "Public can view beneficiarios" ON public.beneficiarios;
DROP POLICY IF EXISTS "Public can insert beneficiarios" ON public.beneficiarios;
DROP POLICY IF EXISTS "Public can update beneficiarios" ON public.beneficiarios;
DROP POLICY IF EXISTS "Public can delete beneficiarios" ON public.beneficiarios;

CREATE POLICY "Authenticated can view beneficiarios"
ON public.beneficiarios FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert beneficiarios"
ON public.beneficiarios FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update beneficiarios"
ON public.beneficiarios FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete beneficiarios"
ON public.beneficiarios FOR DELETE TO authenticated USING (true);
