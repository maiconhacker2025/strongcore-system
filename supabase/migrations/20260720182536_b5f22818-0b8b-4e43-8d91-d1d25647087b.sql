
-- Eventos (linha do tempo)
CREATE TABLE public.beneficiario_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_id uuid NOT NULL REFERENCES public.beneficiarios(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  tipo text NOT NULL DEFAULT 'observacao',
  titulo text NOT NULL,
  descricao text,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beneficiario_eventos TO authenticated;
GRANT ALL ON public.beneficiario_eventos TO service_role;
ALTER TABLE public.beneficiario_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage eventos" ON public.beneficiario_eventos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_eventos_benef ON public.beneficiario_eventos(beneficiario_id, data DESC);
CREATE TRIGGER trg_eventos_updated BEFORE UPDATE ON public.beneficiario_eventos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Arquivos anexados
CREATE TABLE public.beneficiario_arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_id uuid NOT NULL REFERENCES public.beneficiarios(id) ON DELETE CASCADE,
  nome text NOT NULL,
  categoria text NOT NULL DEFAULT 'documento', -- 'foto' | 'documento'
  path text NOT NULL,
  mime text,
  tamanho bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beneficiario_arquivos TO authenticated;
GRANT ALL ON public.beneficiario_arquivos TO service_role;
ALTER TABLE public.beneficiario_arquivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage arquivos" ON public.beneficiario_arquivos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_arquivos_benef ON public.beneficiario_arquivos(beneficiario_id, created_at DESC);

-- Policies para o bucket 'beneficiario-arquivos' (criado via tool separada)
CREATE POLICY "auth read arquivos bucket" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'beneficiario-arquivos');
CREATE POLICY "auth insert arquivos bucket" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'beneficiario-arquivos');
CREATE POLICY "auth update arquivos bucket" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'beneficiario-arquivos');
CREATE POLICY "auth delete arquivos bucket" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'beneficiario-arquivos');
