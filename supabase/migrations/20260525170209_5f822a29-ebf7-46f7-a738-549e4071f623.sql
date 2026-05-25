DROP POLICY IF EXISTS "Authenticated users can view beneficiarios" ON public.beneficiarios;
DROP POLICY IF EXISTS "Authenticated users can insert beneficiarios" ON public.beneficiarios;
DROP POLICY IF EXISTS "Authenticated users can update beneficiarios" ON public.beneficiarios;
DROP POLICY IF EXISTS "Authenticated users can delete beneficiarios" ON public.beneficiarios;

CREATE POLICY "Public can view beneficiarios" ON public.beneficiarios FOR SELECT USING (true);
CREATE POLICY "Public can insert beneficiarios" ON public.beneficiarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update beneficiarios" ON public.beneficiarios FOR UPDATE USING (true);
CREATE POLICY "Public can delete beneficiarios" ON public.beneficiarios FOR DELETE USING (true);