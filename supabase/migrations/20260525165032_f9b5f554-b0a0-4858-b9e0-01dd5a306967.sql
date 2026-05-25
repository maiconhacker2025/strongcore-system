
CREATE TABLE public.beneficiarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo INTEGER,
  nome TEXT NOT NULL,
  data_ingresso_01 DATE, data_ingresso_02 DATE, data_ingresso_03 DATE,
  data_desligamento_01 DATE, data_desligamento_02 DATE, data_desligamento_03 DATE,
  ativo BOOLEAN NOT NULL DEFAULT false,
  assistente_social TEXT, psicologa TEXT,
  cpf TEXT, rg TEXT, data_nascimento DATE, genero TEXT, classe_risco TEXT,
  whatsapp TEXT, residencial TEXT, celular TEXT,
  rua TEXT, bairro TEXT, estado TEXT, cep TEXT, pais TEXT,
  escolaridade TEXT, turno TEXT, escola TEXT, ano_anterior TEXT, possui_dificuldades TEXT,
  responsavel TEXT, nome_responsavel TEXT, email TEXT, tel_responsavel TEXT,
  nome_mae TEXT, nasc_mae DATE, profissao_mae TEXT, trabalha_mae TEXT,
  nome_pai TEXT, nasc_pai DATE, escolaridade_pai TEXT, profissao_pai TEXT, trabalha_pai TEXT,
  numero_irmaos INTEGER, mora_com TEXT,
  tel_emergencia_01 TEXT, tel_emergencia_02 TEXT,
  nome_medico TEXT, tel_medico TEXT,
  alergia BOOLEAN DEFAULT false, medicacao BOOLEAN DEFAULT false,
  observacoes TEXT, possui_beneficios TEXT, renda TEXT,
  reside_em TEXT, residencia TEXT, energia_eletrica TEXT, esgoto TEXT, agua TEXT, lixo TEXT,
  transporte_coletivo TEXT, fogao TEXT, freezer TEXT, som TEXT, maq_lavar TEXT, tv TEXT,
  micro_ondas TEXT, filtro TEXT, computador TEXT, internet TEXT, ar_condicionado TEXT, ventilador TEXT,
  cama_filhos TEXT, cama_casal TEXT, armario_cozinha TEXT, guarda_roupas TEXT,
  moveis_estofados TEXT, louca_geral TEXT, roupa_cama TEXT, tenis_atividades TEXT,
  possui_geladeira TEXT, numero_comodos TEXT, possui_banheiro TEXT,
  circunscricao TEXT, num_livro TEXT, num_folha TEXT, num_termo TEXT, distrito TEXT,
  nome_mae_2 TEXT, data_nasc_mae_2 TEXT, trabalha_mae_2 TEXT, escolaridade_mae_2 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_beneficiarios_nome ON public.beneficiarios (nome);
CREATE INDEX idx_beneficiarios_ativo ON public.beneficiarios (ativo);
CREATE INDEX idx_beneficiarios_codigo ON public.beneficiarios (codigo);

ALTER TABLE public.beneficiarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view beneficiarios"
  ON public.beneficiarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert beneficiarios"
  ON public.beneficiarios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update beneficiarios"
  ON public.beneficiarios FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete beneficiarios"
  ON public.beneficiarios FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_beneficiarios_updated
  BEFORE UPDATE ON public.beneficiarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
