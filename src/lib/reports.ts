import { supabase } from "@/integrations/supabase/client";
import type { FullReport } from "./reports-export";

export type ReportFilters = {
  status?: "todos" | "ativos" | "inativos";
  risco?: string;                 // "Alto" | "Médio" | "Baixo"
  genero?: string;
  escolaridade?: string;
  bairro?: string;
  escola?: string;
  turno?: string;
  ingressoAno?: string;           // "2024"
  desligamentoAno?: string;
  idadeMin?: string;
  idadeMax?: string;
  medicacao?: boolean;
  alergia?: boolean;
  aniversarioMes?: string;        // "1".."12"
};

export type ReportTemplate = {
  id: string;
  name: string;
  description: string;
  category: "geral" | "escolar" | "saude" | "familia" | "movimento";
  icon: string;
  columns: string[];
  build: (filters: ReportFilters) => Promise<FullReport>;
};

const COLS_BASIC = ["codigo", "nome", "data_nascimento", "idade", "genero", "classe_risco", "ativo"];
const COLS_ESCOLAR = ["nome", "idade", "escolaridade", "turno", "escola", "bairro", "responsavel", "celular"];
const COLS_CONTATO = ["nome", "idade", "responsavel", "celular", "whatsapp", "email", "bairro"];
const COLS_SAUDE = ["nome", "idade", "alergia", "medicacao", "observacoes", "responsavel", "celular"];
const COLS_FULL = [
  "codigo", "nome", "data_nascimento", "idade", "genero", "classe_risco", "ativo",
  "escolaridade", "turno", "escola", "bairro", "responsavel", "celular", "whatsapp",
];

async function fetchAll(): Promise<any[]> {
  // Fetch in chunks to bypass PostgREST 1000 default
  const all: any[] = [];
  let from = 0;
  const size = 1000;
  while (true) {
    const { data, error } = await supabase.from("beneficiarios").select("*").range(from, from + size - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < size) break;
    from += size;
  }
  return all;
}

function ageFrom(dob: any): number | null {
  if (!dob) return null;
  const d = new Date(String(dob));
  if (isNaN(d.getTime())) return null;
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a;
}

function applyClientFilters(rows: any[], f: ReportFilters): any[] {
  return rows.filter((r) => {
    if (f.status === "ativos" && !r.ativo) return false;
    if (f.status === "inativos" && r.ativo) return false;
    if (f.risco && r.classe_risco !== f.risco) return false;
    if (f.genero && r.genero !== f.genero) return false;
    if (f.escolaridade && r.escolaridade !== f.escolaridade) return false;
    if (f.bairro && !(r.bairro ?? "").toLowerCase().includes(f.bairro.toLowerCase())) return false;
    if (f.escola && !(r.escola ?? "").toLowerCase().includes(f.escola.toLowerCase())) return false;
    if (f.turno && r.turno !== f.turno) return false;
    if (f.ingressoAno) {
      const y = f.ingressoAno;
      const has = [r.data_ingresso_01, r.data_ingresso_02, r.data_ingresso_03]
        .some((d) => d && String(d).startsWith(y));
      if (!has) return false;
    }
    if (f.desligamentoAno) {
      const y = f.desligamentoAno;
      const has = [r.data_desligamento_01, r.data_desligamento_02, r.data_desligamento_03]
        .some((d) => d && String(d).startsWith(y));
      if (!has) return false;
    }
    if (f.medicacao && !r.medicacao) return false;
    if (f.alergia && !r.alergia) return false;
    if (f.aniversarioMes) {
      if (!r.data_nascimento) return false;
      const m = new Date(String(r.data_nascimento)).getMonth() + 1;
      if (String(m) !== f.aniversarioMes) return false;
    }
    const age = ageFrom(r.data_nascimento);
    if (f.idadeMin && (age == null || age < Number(f.idadeMin))) return false;
    if (f.idadeMax && (age == null || age > Number(f.idadeMax))) return false;
    return true;
  });
}

function describeFilters(f: ReportFilters): string[] {
  const out: string[] = [];
  if (f.status && f.status !== "todos") out.push(`Status: ${f.status === "ativos" ? "Ativos" : "Inativos"}`);
  if (f.risco) out.push(`Classe de risco: ${f.risco}`);
  if (f.genero) out.push(`Gênero: ${f.genero}`);
  if (f.escolaridade) out.push(`Escolaridade: ${f.escolaridade}`);
  if (f.turno) out.push(`Turno: ${f.turno}`);
  if (f.bairro) out.push(`Bairro contém: ${f.bairro}`);
  if (f.escola) out.push(`Escola contém: ${f.escola}`);
  if (f.ingressoAno) out.push(`Ano de ingresso: ${f.ingressoAno}`);
  if (f.desligamentoAno) out.push(`Ano de desligamento: ${f.desligamentoAno}`);
  if (f.idadeMin) out.push(`Idade mínima: ${f.idadeMin}`);
  if (f.idadeMax) out.push(`Idade máxima: ${f.idadeMax}`);
  if (f.medicacao) out.push("Em uso de medicação");
  if (f.alergia) out.push("Com alergia registrada");
  if (f.aniversarioMes) {
    const m = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    out.push(`Aniversariantes de ${m[Number(f.aniversarioMes) - 1]}`);
  }
  return out;
}

function groupBy(rows: any[], key: string): { key: string; label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const v = (r[key] ?? "Não informado") || "Não informado";
    map.set(String(v), (map.get(String(v)) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([k, c]) => ({ key: k, label: k, count: c }))
    .sort((a, b) => b.count - a.count);
}

function ageBuckets(rows: any[]) {
  const buckets: Record<string, number> = { "0-6": 0, "7-10": 0, "11-14": 0, "15-17": 0, "18+": 0, "Sem data": 0 };
  for (const r of rows) {
    const a = ageFrom(r.data_nascimento);
    if (a == null) buckets["Sem data"]++;
    else if (a <= 6) buckets["0-6"]++;
    else if (a <= 10) buckets["7-10"]++;
    else if (a <= 14) buckets["11-14"]++;
    else if (a <= 17) buckets["15-17"]++;
    else buckets["18+"]++;
  }
  return Object.entries(buckets).map(([k, v]) => ({ key: k, label: k, count: v }));
}

async function baseReport(
  title: string,
  filters: ReportFilters,
  columns: string[],
  extra?: (rows: any[]) => Partial<FullReport>
): Promise<FullReport> {
  const all = await fetchAll();
  const rows = applyClientFilters(all, filters);
  const ativos = rows.filter((r) => r.ativo).length;
  const risco = rows.filter((r) => r.classe_risco === "Alto").length;
  const idades = rows.map((r) => ageFrom(r.data_nascimento)).filter((x) => x != null) as number[];
  const media = idades.length ? Math.round(idades.reduce((a, b) => a + b, 0) / idades.length) : 0;

  const base: FullReport = {
    title,
    subtitle: `${rows.length} beneficiário(s) atendem aos critérios`,
    filters: describeFilters(filters),
    kpis: [
      { label: "Total", value: rows.length },
      { label: "Ativos", value: ativos },
      { label: "Risco alto", value: risco },
      { label: "Idade média", value: idades.length ? `${media} anos` : "—" },
    ],
    columns,
    rows: rows.sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR")),
  };
  return { ...base, ...(extra?.(rows) ?? {}) };
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "panorama",
    name: "Panorama geral",
    description: "Lista completa com KPIs e distribuição por escolaridade, risco e bairro",
    category: "geral", icon: "layout-dashboard",
    columns: COLS_FULL,
    build: (f) => baseReport("Panorama geral dos beneficiários", f, COLS_FULL, (rows) => ({
      groupBy: groupBy(rows, "escolaridade").slice(0, 15),
    })),
  },
  {
    id: "ativos",
    name: "Beneficiários ativos",
    description: "Todos os beneficiários com cadastro ativo",
    category: "geral", icon: "user-check",
    columns: COLS_ESCOLAR,
    build: (f) => baseReport("Beneficiários ativos", { ...f, status: "ativos" }, COLS_ESCOLAR),
  },
  {
    id: "inativos",
    name: "Beneficiários inativos",
    description: "Beneficiários desligados ou inativos",
    category: "geral", icon: "user-minus",
    columns: [...COLS_BASIC, "data_desligamento_01"],
    build: (f) => baseReport("Beneficiários inativos", { ...f, status: "inativos" }, [...COLS_BASIC, "data_desligamento_01"]),
  },
  {
    id: "por-escolaridade",
    name: "Por escolaridade",
    description: "Agrupados por nível escolar com totais",
    category: "escolar", icon: "graduation-cap",
    columns: COLS_ESCOLAR,
    build: (f) => baseReport("Distribuição por escolaridade", f, COLS_ESCOLAR, (rows) => ({
      groupBy: groupBy(rows, "escolaridade"),
    })),
  },
  {
    id: "por-escola",
    name: "Por escola",
    description: "Quantos beneficiários em cada escola",
    category: "escolar", icon: "school",
    columns: COLS_ESCOLAR,
    build: (f) => baseReport("Distribuição por escola", f, COLS_ESCOLAR, (rows) => ({
      groupBy: groupBy(rows, "escola"),
    })),
  },
  {
    id: "por-turno",
    name: "Por turno",
    description: "Manhã, tarde, noite",
    category: "escolar", icon: "clock",
    columns: COLS_ESCOLAR,
    build: (f) => baseReport("Distribuição por turno", f, COLS_ESCOLAR, (rows) => ({
      groupBy: groupBy(rows, "turno"),
    })),
  },
  {
    id: "por-bairro",
    name: "Por bairro",
    description: "Onde nossos beneficiários moram",
    category: "geral", icon: "map-pin",
    columns: [...COLS_BASIC, "bairro"],
    build: (f) => baseReport("Distribuição por bairro", f, [...COLS_BASIC, "bairro"], (rows) => ({
      groupBy: groupBy(rows, "bairro").slice(0, 30),
    })),
  },
  {
    id: "por-risco",
    name: "Por classe de risco",
    description: "Alto, médio, baixo — com lista de risco alto",
    category: "geral", icon: "shield-alert",
    columns: [...COLS_BASIC, "bairro", "responsavel", "celular"],
    build: (f) => baseReport("Classe de risco social", f, [...COLS_BASIC, "bairro", "responsavel", "celular"], (rows) => ({
      groupBy: groupBy(rows, "classe_risco"),
    })),
  },
  {
    id: "por-genero",
    name: "Por gênero",
    description: "Distribuição por gênero",
    category: "geral", icon: "users",
    columns: COLS_BASIC,
    build: (f) => baseReport("Distribuição por gênero", f, COLS_BASIC, (rows) => ({
      groupBy: groupBy(rows, "genero"),
    })),
  },
  {
    id: "faixa-etaria",
    name: "Por faixa etária",
    description: "Agrupados em faixas: 0-6, 7-10, 11-14, 15-17, 18+",
    category: "geral", icon: "cake",
    columns: COLS_BASIC,
    build: (f) => baseReport("Distribuição por faixa etária", f, COLS_BASIC, (rows) => ({
      groupBy: ageBuckets(rows),
    })),
  },
  {
    id: "aniversariantes",
    name: "Aniversariantes do mês",
    description: "Quem faz aniversário no mês selecionado",
    category: "geral", icon: "party-popper",
    columns: ["nome", "data_nascimento", "idade", "escola", "responsavel", "celular"],
    build: (f) => {
      const mes = f.aniversarioMes ?? String(new Date().getMonth() + 1);
      return baseReport("Aniversariantes do mês",
        { ...f, aniversarioMes: mes },
        ["nome", "data_nascimento", "idade", "escola", "responsavel", "celular"]);
    },
  },
  {
    id: "ingressos",
    name: "Ingressos por ano",
    description: "Quem entrou no projeto no ano selecionado",
    category: "movimento", icon: "log-in",
    columns: [...COLS_BASIC, "data_ingresso_01", "escola"],
    build: (f) => {
      const ano = f.ingressoAno ?? String(new Date().getFullYear());
      return baseReport(`Ingressos em ${ano}`,
        { ...f, ingressoAno: ano },
        [...COLS_BASIC, "data_ingresso_01", "escola"]);
    },
  },
  {
    id: "desligamentos",
    name: "Desligamentos por ano",
    description: "Quem foi desligado no ano selecionado",
    category: "movimento", icon: "log-out",
    columns: [...COLS_BASIC, "data_desligamento_01", "escola"],
    build: (f) => {
      const ano = f.desligamentoAno ?? String(new Date().getFullYear());
      return baseReport(`Desligamentos em ${ano}`,
        { ...f, desligamentoAno: ano },
        [...COLS_BASIC, "data_desligamento_01", "escola"]);
    },
  },
  {
    id: "medicacao",
    name: "Em uso de medicação",
    description: "Beneficiários que fazem uso contínuo de medicação",
    category: "saude", icon: "pill",
    columns: COLS_SAUDE,
    build: (f) => baseReport("Beneficiários em uso de medicação", { ...f, medicacao: true }, COLS_SAUDE),
  },
  {
    id: "alergia",
    name: "Com alergia",
    description: "Beneficiários com alergia registrada",
    category: "saude", icon: "alert-triangle",
    columns: COLS_SAUDE,
    build: (f) => baseReport("Beneficiários com alergia", { ...f, alergia: true }, COLS_SAUDE),
  },
  {
    id: "contatos",
    name: "Lista de contatos",
    description: "Contatos dos responsáveis para comunicação",
    category: "familia", icon: "phone",
    columns: COLS_CONTATO,
    build: (f) => baseReport("Lista de contatos dos responsáveis", f, COLS_CONTATO),
  },
];

export function getTemplate(id: string) {
  return REPORT_TEMPLATES.find((t) => t.id === id);
}
