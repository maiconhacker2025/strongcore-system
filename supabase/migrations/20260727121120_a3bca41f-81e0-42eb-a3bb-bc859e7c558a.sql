
-- ============ OFICINAS ============
CREATE TABLE public.oficinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  objetivos text,
  educador text,
  auxiliar text,
  sala text,
  capacidade integer,
  dias_semana text[] NOT NULL DEFAULT '{}',
  horario_inicio text,
  horario_fim text,
  idade_min integer,
  idade_max integer,
  grupo text NOT NULL DEFAULT 'ambos',
  status text NOT NULL DEFAULT 'ativa',
  cor text NOT NULL DEFAULT '#0f766e',
  icone text,
  imagem_url text,
  materiais text,
  carga_horaria numeric,
  numero_encontros integer,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oficinas TO authenticated;
GRANT ALL ON public.oficinas TO service_role;
ALTER TABLE public.oficinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage oficinas" ON public.oficinas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_oficinas_updated BEFORE UPDATE ON public.oficinas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ TURMAS ============
CREATE TABLE public.turmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oficina_id uuid NOT NULL REFERENCES public.oficinas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  professor text,
  auxiliar text,
  sala text,
  dias_semana text[] NOT NULL DEFAULT '{}',
  horario_inicio text,
  horario_fim text,
  limite_alunos integer,
  status text NOT NULL DEFAULT 'ativa',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.turmas TO authenticated;
GRANT ALL ON public.turmas TO service_role;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage turmas" ON public.turmas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_turmas_updated BEFORE UPDATE ON public.turmas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_turmas_oficina ON public.turmas(oficina_id);

-- ============ MATRICULAS ============
CREATE TABLE public.matriculas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_id uuid NOT NULL REFERENCES public.beneficiarios(id) ON DELETE CASCADE,
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  data_matricula date NOT NULL DEFAULT CURRENT_DATE,
  data_saida date,
  status text NOT NULL DEFAULT 'ativa',
  lista_espera boolean NOT NULL DEFAULT false,
  autorizacao_assinada boolean NOT NULL DEFAULT false,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (beneficiario_id, turma_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matriculas TO authenticated;
GRANT ALL ON public.matriculas TO service_role;
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage matriculas" ON public.matriculas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_matriculas_updated BEFORE UPDATE ON public.matriculas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_matriculas_benef ON public.matriculas(beneficiario_id);
CREATE INDEX idx_matriculas_turma ON public.matriculas(turma_id);

-- ============ AULAS ============
CREATE TABLE public.aulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  horario_inicio text,
  horario_fim text,
  conteudo text,
  educador text,
  assinatura text,
  observacoes text,
  fotos text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (turma_id, data)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aulas TO authenticated;
GRANT ALL ON public.aulas TO service_role;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage aulas" ON public.aulas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_aulas_updated BEFORE UPDATE ON public.aulas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_aulas_turma ON public.aulas(turma_id);

-- ============ FREQUENCIAS ============
CREATE TABLE public.frequencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id uuid NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  beneficiario_id uuid NOT NULL REFERENCES public.beneficiarios(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'presente',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aula_id, beneficiario_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.frequencias TO authenticated;
GRANT ALL ON public.frequencias TO service_role;
ALTER TABLE public.frequencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage frequencias" ON public.frequencias FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_frequencias_updated BEFORE UPDATE ON public.frequencias FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_freq_benef ON public.frequencias(beneficiario_id);
CREATE INDEX idx_freq_aula ON public.frequencias(aula_id);

-- ============ EVENTOS ============
CREATE TABLE public.eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'evento',
  descricao text,
  data date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  horario text,
  local text,
  responsavel text,
  cor text NOT NULL DEFAULT '#f59e0b',
  relatorio text,
  fotos text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventos TO authenticated;
GRANT ALL ON public.eventos TO service_role;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage eventos_at" ON public.eventos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_eventos_updated BEFORE UPDATE ON public.eventos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.evento_participantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  beneficiario_id uuid NOT NULL REFERENCES public.beneficiarios(id) ON DELETE CASCADE,
  presente boolean NOT NULL DEFAULT false,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evento_id, beneficiario_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evento_participantes TO authenticated;
GRANT ALL ON public.evento_participantes TO service_role;
ALTER TABLE public.evento_participantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage evento_part" ON public.evento_participantes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ PROJETOS ============
CREATE TABLE public.projetos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  objetivos text,
  coordenador text,
  equipe text,
  cronograma text,
  metas text,
  indicadores text,
  resultados text,
  data_inicio date,
  data_fim date,
  status text NOT NULL DEFAULT 'ativo',
  cor text NOT NULL DEFAULT '#0ea5e9',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projetos TO authenticated;
GRANT ALL ON public.projetos TO service_role;
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage projetos" ON public.projetos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_projetos_updated BEFORE UPDATE ON public.projetos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.projeto_participantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  beneficiario_id uuid NOT NULL REFERENCES public.beneficiarios(id) ON DELETE CASCADE,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (projeto_id, beneficiario_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projeto_participantes TO authenticated;
GRANT ALL ON public.projeto_participantes TO service_role;
ALTER TABLE public.projeto_participantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage projeto_part" ON public.projeto_participantes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ AVALIACOES ============
CREATE TABLE public.avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_id uuid NOT NULL REFERENCES public.beneficiarios(id) ON DELETE CASCADE,
  turma_id uuid REFERENCES public.turmas(id) ON DELETE SET NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  educador text,
  desenvolvimento integer,
  participacao integer,
  comportamento integer,
  socializacao integer,
  interacao integer,
  disciplina integer,
  pontualidade integer,
  comprometimento integer,
  coordenacao_motora integer,
  criatividade integer,
  comunicacao integer,
  trabalho_equipe integer,
  observacoes text,
  plano_evolucao text,
  proxima_avaliacao date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacoes TO authenticated;
GRANT ALL ON public.avaliacoes TO service_role;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage avaliacoes" ON public.avaliacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_avaliacoes_updated BEFORE UPDATE ON public.avaliacoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_avaliacoes_benef ON public.avaliacoes(beneficiario_id);

-- ============ CERTIFICADOS ============
CREATE TABLE public.certificados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_id uuid NOT NULL REFERENCES public.beneficiarios(id) ON DELETE CASCADE,
  oficina_id uuid REFERENCES public.oficinas(id) ON DELETE SET NULL,
  turma_id uuid REFERENCES public.turmas(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  carga_horaria numeric,
  periodo_inicio date,
  periodo_fim date,
  assinante text,
  codigo text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  emitido_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (codigo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificados TO authenticated;
GRANT ALL ON public.certificados TO service_role;
ALTER TABLE public.certificados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage certificados" ON public.certificados FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_certificados_benef ON public.certificados(beneficiario_id);

-- ============ HISTORICO ============
CREATE TABLE public.atividade_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade text NOT NULL,
  entidade_id uuid,
  beneficiario_id uuid REFERENCES public.beneficiarios(id) ON DELETE CASCADE,
  acao text NOT NULL,
  descricao text NOT NULL,
  detalhes jsonb,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.atividade_historico TO authenticated;
GRANT ALL ON public.atividade_historico TO service_role;
ALTER TABLE public.atividade_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read historico" ON public.atividade_historico FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert historico" ON public.atividade_historico FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_hist_benef ON public.atividade_historico(beneficiario_id);
CREATE INDEX idx_hist_created ON public.atividade_historico(created_at DESC);
