import { supabase } from "@/integrations/supabase/client";

export const STATUS_FREQUENCIA = [
  { value: "presente", label: "Presente", short: "P", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "falta", label: "Falta", short: "F", cls: "bg-rose-100 text-rose-700 border-rose-200" },
  { value: "justificada", label: "Falta justificada", short: "FJ", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "atraso", label: "Atraso", short: "A", cls: "bg-sky-100 text-sky-700 border-sky-200" },
  { value: "saiu_cedo", label: "Saiu mais cedo", short: "SC", cls: "bg-violet-100 text-violet-700 border-violet-200" },
];

export const statusFreqMeta = (v: string) =>
  STATUS_FREQUENCIA.find((s) => s.value === v) ?? STATUS_FREQUENCIA[0];

export const CRITERIOS_AVALIACAO = [
  { key: "desenvolvimento", label: "Desenvolvimento" },
  { key: "participacao", label: "Participação" },
  { key: "comportamento", label: "Comportamento" },
  { key: "socializacao", label: "Socialização" },
  { key: "interacao", label: "Interação" },
  { key: "disciplina", label: "Disciplina" },
  { key: "pontualidade", label: "Pontualidade" },
  { key: "comprometimento", label: "Comprometimento" },
  { key: "coordenacao_motora", label: "Coordenação motora" },
  { key: "criatividade", label: "Criatividade" },
  { key: "comunicacao", label: "Comunicação" },
  { key: "trabalho_equipe", label: "Trabalho em equipe" },
] as const;

export const TIPOS_EVENTO = [
  "Passeio", "Campeonato", "Festa", "Feira", "Palestra",
  "Curso", "Excursão", "Campanha", "Reunião", "Data comemorativa",
];

export const OFICINAS_SUGERIDAS = [
  "Futebol", "Capoeira", "Dança", "Música", "Violão", "Teatro", "Artes", "Pintura",
  "Informática", "Robótica", "Xadrez", "Reforço Escolar", "Leitura", "Culinária",
  "Educação Financeira", "Horta", "Esporte", "Jogos Educativos", "Artesanato",
  "Podcast", "Fotografia", "Empreendedorismo",
];

/** Registro permanente de auditoria — nunca apaga informação. */
export async function registrarHistorico(entry: {
  entidade: string;
  entidade_id?: string | null;
  beneficiario_id?: string | null;
  acao: string;
  descricao: string;
  detalhes?: unknown;
  autor?: string | null;
}) {
  try {
    await supabase.from("atividade_historico").insert({
      entidade: entry.entidade,
      entidade_id: entry.entidade_id ?? null,
      beneficiario_id: entry.beneficiario_id ?? null,
      acao: entry.acao,
      descricao: entry.descricao,
      detalhes: (entry.detalhes ?? null) as any,
      autor: entry.autor ?? "Sistema",
    } as any);
  } catch {
    /* auditoria nunca deve quebrar a operação principal */
  }
}

export async function fetchAll<T = any>(table: string, select = "*", order?: string): Promise<T[]> {
  const rows: T[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    let q = supabase.from(table as any).select(select).range(from, from + size - 1);
    if (order) q = q.order(order, { ascending: true });
    const { data, error } = await q;
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...(data as any as T[]));
    if (data.length < size) break;
  }
  return rows;
}

export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
