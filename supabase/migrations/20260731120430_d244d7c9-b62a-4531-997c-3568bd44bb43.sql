DO $$
DECLARE t text; p record;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'oficinas','turmas','aulas','frequencias','matriculas','avaliacoes',
    'certificados','eventos','evento_participantes','projetos',
    'projeto_participantes','atividade_historico'
  ]) LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))',
      'staff manage ' || t, t
    );
  END LOOP;
END $$;