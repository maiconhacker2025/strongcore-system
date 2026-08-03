import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/atividades";
import { idadeDe, grupoPorIdade } from "@/lib/grupos";

/* ===================== Status ===================== */

export type PresencaStatus = "presente" | "justificado" | "falta" | "nao_compareceu";

export const PRESENCA_STATUS: {
  value: PresencaStatus; label: string; short: string; emoji: string;
  cls: string; hex: string; fill: string;
}[] = [
  { value: "presente", label: "Presente", short: "P", emoji: "🟢", cls: "bg-emerald-100 text-emerald-700 border-emerald-300", hex: "#047857", fill: "D1FAE5" },
  { value: "justificado", label: "Justificado", short: "J", emoji: "🟡", cls: "bg-amber-100 text-amber-700 border-amber-300", hex: "#b45309", fill: "FEF3C7" },
  { value: "falta", label: "Falta", short: "F", emoji: "🔴", cls: "bg-rose-100 text-rose-700 border-rose-300", hex: "#be123c", fill: "FFE4E6" },
  { value: "nao_compareceu", label: "Não compareceu", short: "N", emoji: "⚪", cls: "bg-slate-100 text-slate-500 border-slate-300", hex: "#64748b", fill: "F1F5F9" },
];

export const statusMeta = (v?: string) =>
  PRESENCA_STATUS.find((s) => s.value === v) ?? PRESENCA_STATUS[0];

const CICLO: PresencaStatus[] = ["presente", "falta", "justificado", "nao_compareceu"];
export const proximoStatus = (v?: string): PresencaStatus => {
  const i = CICLO.indexOf((v as PresencaStatus) ?? "presente");
  return CICLO[(i + 1) % CICLO.length];
};

/* ===================== Período ===================== */

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export type Periodo = { mes: number; ano: number; key: string; label: string };

/** Todos os meses de Agosto/2025 até o mês atual (mais recente primeiro). */
export function periodosDisponiveis(hoje = new Date()): Periodo[] {
  const out: Periodo[] = [];
  let y = 2025, m = 8;
  const ly = hoje.getFullYear(), lm = hoje.getMonth() + 1;
  while (y < ly || (y === ly && m <= lm)) {
    out.push({ mes: m, ano: y, key: `${y}-${String(m).padStart(2, "0")}`, label: `${MESES[m - 1]}/${y}` });
    m++; if (m > 12) { m = 1; y++; }
  }
  return out.reverse();
}

/** Dias úteis (seg a sex) do mês. */
export function diasUteis(mes: number, ano: number): number[] {
  const out: number[] = [];
  const last = new Date(ano, mes, 0).getDate();
  for (let d = 1; d <= last; d++) {
    const wd = new Date(ano, mes - 1, d).getDay();
    if (wd >= 1 && wd <= 5) out.push(d);
  }
  return out;
}

export const diaSemanaCurto = (d: number, mes: number, ano: number) =>
  ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][new Date(ano, mes - 1, d).getDay()];

/* ===================== Tipos ===================== */

export interface Participante {
  id: string;
  nome: string;
  cpf?: string | null;
  data_nascimento?: string | null;
  responsavel?: string | null;
  telefone?: string | null;
  turma?: string | null;
  idade?: number | null;
}

export type Marcacoes = Record<string, Record<string, PresencaStatus>>;

export interface ListaPresenca {
  id?: string;
  mes: number;
  ano: number;
  projeto?: string | null;
  turma_id?: string | null;
  turma?: string | null;
  turno?: string | null;
  educador?: string | null;
  unidade?: string | null;
  filtros: Record<string, any>;
  participantes: Participante[];
  marcacoes: Marcacoes;
  total_alunos: number;
  autor?: string | null;
  dispositivo?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const TURNOS = ["Manhã", "Tarde", "Integral", "Noite"];
export const FAIXAS = [
  { value: "todas", label: "Todas as idades" },
  { value: "crescer", label: "🌱 Espaço Crescer (10-13)" },
  { value: "jovem", label: "🚀 Espaço Jovem (14-18)" },
];

/* ===================== Dados ===================== */

export const dispositivo = () =>
  typeof navigator === "undefined" ? "servidor" : `${navigator.platform || "web"} · ${navigator.userAgent.slice(0, 90)}`;

export async function registrarLogPresenca(entry: {
  lista_id?: string | null; acao: string; descricao: string; detalhes?: unknown; autor?: string | null;
}) {
  try {
    await supabase.from("presenca_logs").insert({
      lista_id: entry.lista_id ?? null,
      acao: entry.acao,
      descricao: entry.descricao,
      detalhes: (entry.detalhes ?? null) as any,
      autor: entry.autor ?? "Equipe Progredir",
      dispositivo: dispositivo(),
    } as any);
  } catch { /* auditoria nunca quebra a operação */ }
}

export interface FiltrosGeracao {
  turmaId?: string;
  projetoId?: string;
  faixa?: string;
  unidade?: string;
  turno?: string;
}

const soDigitos = (s?: string | null) => (s ?? "").replace(/\D/g, "");
const fmtCpf = (s?: string | null) => {
  const d = soDigitos(s);
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : (s || "");
};

export const fmtData = (v?: string | null) => {
  if (!v) return "";
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

/** Busca beneficiários ativos aplicando os filtros escolhidos, em ordem alfabética. */
export async function montarParticipantes(f: FiltrosGeracao): Promise<Participante[]> {
  const [benef, matriculas, turmas, projParts] = await Promise.all([
    fetchAll<any>(
      "beneficiarios",
      "id,nome,cpf,rg,num_termo,data_nascimento,ativo,responsavel,nome_responsavel,tel_responsavel,whatsapp,celular,turno,bairro",
      "nome",
    ),
    f.turmaId ? fetchAll<any>("matriculas", "id,beneficiario_id,turma_id,status") : Promise.resolve([]),
    fetchAll<any>("turmas", "id,nome"),
    f.projetoId ? fetchAll<any>("projeto_participantes", "projeto_id,beneficiario_id") : Promise.resolve([]),
  ]);

  const turmaNome = new Map<string, string>(turmas.map((t: any) => [t.id, t.nome]));
  const turmaDe = new Map<string, string>();
  for (const m of matriculas as any[]) {
    if (m.status === "cancelada") continue;
    turmaDe.set(m.beneficiario_id, m.turma_id);
  }
  const noProjeto = new Set((projParts as any[]).map((p) => p.beneficiario_id));

  return benef
    .filter((b: any) => b.ativo)
    .filter((b: any) => (f.turmaId ? turmaDe.get(b.id) === f.turmaId : true))
    .filter((b: any) => (f.projetoId ? noProjeto.has(b.id) : true))
    .filter((b: any) => {
      if (!f.faixa || f.faixa === "todas") return true;
      return grupoPorIdade(idadeDe(b.data_nascimento)) === f.faixa;
    })
    .filter((b: any) => (f.turno && f.turno !== "todos" ? b.turno === f.turno : true))
    .filter((b: any) => (f.unidade && f.unidade !== "todas" ? b.bairro === f.unidade : true))
    .map((b: any) => ({
      id: b.id,
      nome: b.nome,
      cpf: fmtCpf(b.cpf) || (b.rg ? `RG ${b.rg}` : b.num_termo ? `Cert. ${b.num_termo}` : ""),
      data_nascimento: b.data_nascimento,
      responsavel: b.nome_responsavel || b.responsavel || "",
      telefone: b.tel_responsavel || b.whatsapp || b.celular || "",
      turma: turmaDe.get(b.id) ? turmaNome.get(turmaDe.get(b.id)!) ?? "" : "",
      idade: idadeDe(b.data_nascimento),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Todos presentes por padrão. */
export function marcacoesIniciais(parts: Participante[], mes: number, ano: number): Marcacoes {
  const dias = diasUteis(mes, ano);
  const out: Marcacoes = {};
  for (const p of parts) {
    out[p.id] = {};
    for (const d of dias) out[p.id][String(d)] = "presente";
  }
  return out;
}

export function estatisticas(parts: Participante[], marc: Marcacoes, dias: number[]) {
  let presente = 0, falta = 0, justificado = 0, nao = 0;
  for (const p of parts) {
    for (const d of dias) {
      const s = marc[p.id]?.[String(d)] ?? "presente";
      if (s === "presente") presente++;
      else if (s === "falta") falta++;
      else if (s === "justificado") justificado++;
      else nao++;
    }
  }
  const total = presente + falta + justificado + nao;
  return {
    beneficiarios: parts.length,
    presente, falta, justificado, nao, total,
    frequencia: total ? Math.round(((presente + justificado) / total) * 100) : 0,
  };
}

export async function salvarLista(l: ListaPresenca): Promise<string> {
  const payload = {
    mes: l.mes, ano: l.ano, projeto: l.projeto ?? null, turma_id: l.turma_id ?? null,
    turma: l.turma ?? null, turno: l.turno ?? null, educador: l.educador ?? null,
    unidade: l.unidade ?? null, filtros: l.filtros as any, participantes: l.participantes as any,
    marcacoes: l.marcacoes as any, total_alunos: l.participantes.length,
    autor: l.autor ?? "Equipe Progredir", dispositivo: dispositivo(),
  };
  if (l.id) {
    const { error } = await supabase.from("listas_presenca").update(payload as any).eq("id", l.id);
    if (error) throw error;
    await registrarLogPresenca({ lista_id: l.id, acao: "atualizou", descricao: `Lista ${MESES[l.mes - 1]}/${l.ano} atualizada (${l.participantes.length} alunos).` });
    return l.id;
  }
  const { data, error } = await supabase.from("listas_presenca").insert(payload as any).select("id").single();
  if (error) throw error;
  await registrarLogPresenca({ lista_id: (data as any).id, acao: "gerou", descricao: `Lista ${MESES[l.mes - 1]}/${l.ano} gerada com ${l.participantes.length} alunos.` });
  return (data as any).id;
}

export async function listarHistorico() {
  const { data, error } = await supabase
    .from("listas_presenca")
    .select("id,mes,ano,projeto,turma,turno,educador,unidade,total_alunos,autor,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function carregarLista(id: string): Promise<ListaPresenca> {
  const { data, error } = await supabase.from("listas_presenca").select("*").eq("id", id).single();
  if (error) throw error;
  return data as any as ListaPresenca;
}

export async function excluirLista(id: string) {
  const { error } = await supabase.from("listas_presenca").delete().eq("id", id);
  if (error) throw error;
}

export async function logsDaLista(id: string) {
  const { data, error } = await supabase
    .from("presenca_logs").select("*").eq("lista_id", id)
    .order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []) as any[];
}
