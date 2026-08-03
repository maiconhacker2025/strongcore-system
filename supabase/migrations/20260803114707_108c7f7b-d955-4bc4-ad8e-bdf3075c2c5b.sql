CREATE TABLE public.listas_presenca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes integer NOT NULL,
  ano integer NOT NULL,
  projeto text,
  turma_id uuid REFERENCES public.turmas(id) ON DELETE SET NULL,
  turma text,
  turno text,
  educador text,
  unidade text,
  filtros jsonb NOT NULL DEFAULT '{}'::jsonb,
  participantes jsonb NOT NULL DEFAULT '[]'::jsonb,
  marcacoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_alunos integer NOT NULL DEFAULT 0,
  autor text,
  dispositivo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listas_presenca TO authenticated;
GRANT ALL ON public.listas_presenca TO service_role;
ALTER TABLE public.listas_presenca ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage listas_presenca" ON public.listas_presenca FOR ALL TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE TRIGGER trg_listas_presenca_updated BEFORE UPDATE ON public.listas_presenca FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_listas_presenca_periodo ON public.listas_presenca (ano DESC, mes DESC);

CREATE TABLE public.presenca_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id uuid REFERENCES public.listas_presenca(id) ON DELETE CASCADE,
  acao text NOT NULL,
  descricao text NOT NULL,
  detalhes jsonb,
  autor text,
  dispositivo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.presenca_logs TO authenticated;
GRANT ALL ON public.presenca_logs TO service_role;
ALTER TABLE public.presenca_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read presenca_logs" ON public.presenca_logs FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "staff insert presenca_logs" ON public.presenca_logs FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));
CREATE INDEX idx_presenca_logs_lista ON public.presenca_logs (lista_id, created_at DESC);