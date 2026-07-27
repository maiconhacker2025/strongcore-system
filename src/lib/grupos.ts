import { differenceInYears } from "date-fns";

export type GrupoKey = "crescer" | "jovem" | "outros";

export interface GrupoMeta {
  key: GrupoKey;
  nome: string;
  icone: string;
  cor: string;
  corBg: string;
  corTexto: string;
  corBorda: string;
  faixa: string;
  descricao: string;
}

export const GRUPOS: Record<GrupoKey, GrupoMeta> = {
  crescer: {
    key: "crescer",
    nome: "Espaço Crescer",
    icone: "🌱",
    cor: "#2563eb",
    corBg: "bg-blue-50",
    corTexto: "text-blue-700",
    corBorda: "border-blue-200",
    faixa: "10 a 13 anos",
    descricao:
      "Programa destinado ao desenvolvimento infantil, fortalecimento de vínculos, atividades educativas, esportivas, culturais e socioemocionais.",
  },
  jovem: {
    key: "jovem",
    nome: "Espaço Jovem",
    icone: "🚀",
    cor: "#ea580c",
    corBg: "bg-orange-50",
    corTexto: "text-orange-700",
    corBorda: "border-orange-200",
    faixa: "14 a 18 anos",
    descricao:
      "Programa voltado a adolescentes e jovens com foco em autonomia, cidadania, profissionalização, protagonismo juvenil e preparação para o futuro.",
  },
  outros: {
    key: "outros",
    nome: "Fora da faixa",
    icone: "•",
    cor: "#64748b",
    corBg: "bg-slate-100",
    corTexto: "text-slate-600",
    corBorda: "border-slate-200",
    faixa: "Fora de 10 a 18 anos",
    descricao: "Beneficiário fora da faixa etária dos programas Crescer e Jovem.",
  },
};

export function idadeDe(dataNascimento?: string | null): number | null {
  if (!dataNascimento) return null;
  const d = new Date(dataNascimento);
  if (Number.isNaN(d.getTime())) return null;
  return differenceInYears(new Date(), d);
}

export function grupoPorIdade(idade: number | null | undefined): GrupoKey {
  if (idade == null) return "outros";
  if (idade >= 10 && idade <= 13) return "crescer";
  if (idade >= 14 && idade <= 18) return "jovem";
  return "outros";
}

export function grupoDoBeneficiario(b: { data_nascimento?: string | null }): GrupoMeta {
  return GRUPOS[grupoPorIdade(idadeDe(b?.data_nascimento))];
}

export const GRUPO_OPTIONS = [
  { value: "ambos", label: "Ambos os grupos" },
  { value: "crescer", label: "🌱 Espaço Crescer" },
  { value: "jovem", label: "🚀 Espaço Jovem" },
];

export const DIAS_SEMANA = [
  { value: "seg", label: "Seg" },
  { value: "ter", label: "Ter" },
  { value: "qua", label: "Qua" },
  { value: "qui", label: "Qui" },
  { value: "sex", label: "Sex" },
  { value: "sab", label: "Sáb" },
];

export const DIA_INDEX: Record<string, number> = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };
