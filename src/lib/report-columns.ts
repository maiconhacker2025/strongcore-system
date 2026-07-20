// Catálogo completo de colunas disponíveis para os relatórios.
// Usado pelo seletor de colunas (Colunas...) na página /relatorios.

export type ColumnDef = { key: string; label: string };
export type ColumnGroup = { title: string; columns: ColumnDef[] };

export const COLUMN_GROUPS: ColumnGroup[] = [
  {
    title: "Identificação",
    columns: [
      { key: "codigo", label: "Código" },
      { key: "nome", label: "Nome" },
      { key: "cpf", label: "CPF" },
      { key: "rg", label: "RG" },
      { key: "data_nascimento", label: "Nascimento" },
      { key: "idade", label: "Idade" },
      { key: "genero", label: "Gênero" },
      { key: "classe_risco", label: "Classe de risco" },
      { key: "ativo", label: "Status (Ativo/Inativo)" },
    ],
  },
  {
    title: "Certidão de nascimento",
    columns: [
      { key: "num_termo", label: "Nº termo" },
      { key: "num_livro", label: "Nº livro" },
      { key: "num_folha", label: "Nº folha" },
      { key: "circunscricao", label: "Cartório / Circunscrição" },
      { key: "distrito", label: "Distrito" },
    ],
  },
  {
    title: "Contato",
    columns: [
      { key: "whatsapp", label: "WhatsApp" },
      { key: "celular", label: "Celular" },
      { key: "residencial", label: "Residencial" },
      { key: "email", label: "E-mail" },
      { key: "tel_emergencia_01", label: "Emergência 01" },
      { key: "tel_emergencia_02", label: "Emergência 02" },
    ],
  },
  {
    title: "Endereço",
    columns: [
      { key: "rua", label: "Rua" },
      { key: "bairro", label: "Bairro" },
      { key: "cep", label: "CEP" },
      { key: "estado", label: "UF" },
      { key: "pais", label: "País" },
    ],
  },
  {
    title: "Escolaridade",
    columns: [
      { key: "escola", label: "Escola" },
      { key: "escolaridade", label: "Escolaridade" },
      { key: "turno", label: "Turno" },
      { key: "ano_anterior", label: "Ano anterior" },
      { key: "possui_dificuldades", label: "Dificuldades" },
    ],
  },
  {
    title: "Movimentação",
    columns: [
      { key: "data_ingresso_01", label: "Ingresso 01" },
      { key: "data_desligamento_01", label: "Desligamento 01" },
      { key: "data_ingresso_02", label: "Ingresso 02" },
      { key: "data_desligamento_02", label: "Desligamento 02" },
      { key: "data_ingresso_03", label: "Ingresso 03" },
      { key: "data_desligamento_03", label: "Desligamento 03" },
      { key: "assistente_social", label: "Assist. Social" },
      { key: "psicologa", label: "Psicóloga" },
    ],
  },
  {
    title: "Família",
    columns: [
      { key: "responsavel", label: "Responsável" },
      { key: "nome_responsavel", label: "Nome do responsável" },
      { key: "tel_responsavel", label: "Tel. responsável" },
      { key: "mora_com", label: "Mora com" },
      { key: "numero_irmaos", label: "Nº irmãos" },
      { key: "nome_mae", label: "Nome da mãe" },
      { key: "nasc_mae", label: "Nasc. mãe" },
      { key: "profissao_mae", label: "Profissão mãe" },
      { key: "trabalha_mae", label: "Mãe trabalha?" },
      { key: "nome_pai", label: "Nome do pai" },
      { key: "nasc_pai", label: "Nasc. pai" },
      { key: "profissao_pai", label: "Profissão pai" },
      { key: "escolaridade_pai", label: "Escolaridade pai" },
      { key: "trabalha_pai", label: "Pai trabalha?" },
    ],
  },
  {
    title: "Saúde",
    columns: [
      { key: "alergia", label: "Alergia" },
      { key: "medicacao", label: "Medicação" },
      { key: "nome_medico", label: "Nome do médico" },
      { key: "tel_medico", label: "Tel. médico" },
    ],
  },
  {
    title: "Socioeconômico",
    columns: [
      { key: "renda", label: "Renda" },
      { key: "possui_beneficios", label: "Benefícios" },
      { key: "reside_em", label: "Reside em" },
      { key: "residencia", label: "Tipo residência" },
      { key: "numero_comodos", label: "Nº cômodos" },
      { key: "possui_banheiro", label: "Banheiro" },
      { key: "energia_eletrica", label: "Energia elétrica" },
      { key: "agua", label: "Água" },
      { key: "esgoto", label: "Esgoto" },
      { key: "lixo", label: "Coleta de lixo" },
      { key: "transporte_coletivo", label: "Transporte" },
      { key: "internet", label: "Internet" },
    ],
  },
  {
    title: "Itens da casa",
    columns: [
      { key: "possui_geladeira", label: "Geladeira" },
      { key: "fogao", label: "Fogão" },
      { key: "freezer", label: "Freezer" },
      { key: "micro_ondas", label: "Micro-ondas" },
      { key: "filtro", label: "Filtro de água" },
      { key: "maq_lavar", label: "Máq. de lavar" },
      { key: "tv", label: "TV" },
      { key: "som", label: "Som" },
      { key: "computador", label: "Computador" },
      { key: "ar_condicionado", label: "Ar-condicionado" },
      { key: "ventilador", label: "Ventilador" },
      { key: "cama_casal", label: "Cama de casal" },
      { key: "cama_filhos", label: "Cama dos filhos" },
      { key: "guarda_roupas", label: "Guarda-roupas" },
      { key: "armario_cozinha", label: "Armário cozinha" },
      { key: "moveis_estofados", label: "Móveis estofados" },
      { key: "louca_geral", label: "Louça" },
      { key: "roupa_cama", label: "Roupa de cama" },
      { key: "tenis_atividades", label: "Tênis atividades" },
    ],
  },
  {
    title: "Outros",
    columns: [
      { key: "observacoes", label: "Observações" },
    ],
  },
];

export const COLUMN_LABELS: Record<string, string> = COLUMN_GROUPS.reduce((acc, g) => {
  g.columns.forEach((c) => { acc[c.key] = c.label; });
  return acc;
}, {} as Record<string, string>);

// Presets rápidos para casos frequentes
export const COLUMN_PRESETS: { id: string; name: string; description: string; columns: string[] }[] = [
  {
    id: "ativos-docs",
    name: "Ativos com CPF e RG",
    description: "Nome, CPF, RG, nascimento e contato",
    columns: ["nome", "cpf", "rg", "data_nascimento", "idade", "celular", "responsavel"],
  },
  {
    id: "contato-rapido",
    name: "Contato rápido",
    description: "Para ligar ou mandar WhatsApp",
    columns: ["nome", "responsavel", "celular", "whatsapp", "bairro"],
  },
  {
    id: "escolar",
    name: "Escolar",
    description: "Escola, turno, escolaridade",
    columns: ["nome", "idade", "escola", "escolaridade", "turno", "bairro"],
  },
  {
    id: "saude",
    name: "Saúde",
    description: "Alergia, medicação e contato",
    columns: ["nome", "idade", "alergia", "medicacao", "nome_medico", "tel_medico", "responsavel", "celular"],
  },
  {
    id: "minimo",
    name: "Lista simples (nome)",
    description: "Apenas o nome, em ordem alfabética",
    columns: ["nome"],
  },
];
