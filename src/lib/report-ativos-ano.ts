import * as XLSX from "xlsx-js-style";
import { supabase } from "@/integrations/supabase/client";

export type DocTipo = "CPF" | "RG" | "Certidão" | "Ausente";

export type AtivoAnoRow = {
  nome: string;
  documento: string;
  tipo: DocTipo;
  cpfInvalido: boolean;
  idade: number | null;
  grupo: string;
  genero: string;
  bairro: string;
  risco: string;
  escola: string;
  ingresso: string;
  situacao: string;
  duplicado: boolean;
};

export type AtivosAnoResult = {
  ano: number;
  rows: AtivoAnoRow[];
  anterior: { ano: number; nomes: Set<string> };
  totalBase: number;
};

const CHUNK = 1000;

const COLS =
  "nome, ativo, cpf, rg, num_termo, num_livro, num_folha, data_nascimento, genero, bairro, escola, classe_risco, data_ingresso_01, data_ingresso_02, data_ingresso_03, data_desligamento_01, data_desligamento_02, data_desligamento_03";

const yearOf = (v: any): number | null => {
  if (!v) return null;
  const y = Number(String(v).slice(0, 4));
  return Number.isFinite(y) && y > 1900 ? y : null;
};

const clean = (v: any) => {
  const s = v === null || v === undefined ? "" : String(v).trim();
  return s && s !== "-" && s !== "0" ? s : "";
};

const onlyDigits = (v: string) => v.replace(/\D/g, "");

/** Validação real de CPF (dígitos verificadores). */
export function cpfValido(raw: string): boolean {
  const c = onlyDigits(raw);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(c[i]) * (len + 1 - i);
    const d = (sum * 10) % 11;
    return d === 10 ? 0 : d;
  };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

const fmtCpf = (raw: string) => {
  const c = onlyDigits(raw);
  return c.length === 11 ? c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : raw;
};

/** CPF → RG → Certidão de nascimento → ausente */
export function documentoDe(b: any): { documento: string; tipo: DocTipo; cpfInvalido: boolean } {
  const cpf = clean(b.cpf);
  if (cpf) {
    const ok = cpfValido(cpf);
    return { documento: fmtCpf(cpf), tipo: "CPF", cpfInvalido: !ok };
  }
  const rg = clean(b.rg);
  if (rg) return { documento: rg, tipo: "RG", cpfInvalido: false };
  const termo = clean(b.num_termo);
  const livro = clean(b.num_livro);
  const folha = clean(b.num_folha);
  if (termo || livro || folha) {
    const parts = [
      termo && `Termo ${termo}`,
      livro && `Livro ${livro}`,
      folha && `Folha ${folha}`,
    ].filter(Boolean);
    return { documento: `Certidão — ${parts.join(" / ")}`, tipo: "Certidão", cpfInvalido: false };
  }
  return { documento: "Documento não informado", tipo: "Ausente", cpfInvalido: false };
}

function idadeEm(dob: any, ano: number): number | null {
  const y = yearOf(dob);
  if (!y) return null;
  const a = ano - y;
  return a >= 0 && a < 120 ? a : null;
}

function grupoDe(idade: number | null): string {
  if (idade == null) return "Sem data de nascimento";
  if (idade <= 9) return "Abaixo de 10";
  if (idade <= 13) return "Espaço Crescer (10-13)";
  if (idade <= 18) return "Espaço Jovem (14-18)";
  return "Acima de 18";
}

/**
 * Beneficiário estava ATIVO durante o ano informado.
 * Cada ingresso é pareado com o desligamento correspondente (01/02/03).
 */
export function ativoNoAno(b: any, ano: number): boolean {
  const pares: Array<[number | null, number | null]> = [
    [yearOf(b.data_ingresso_01), yearOf(b.data_desligamento_01)],
    [yearOf(b.data_ingresso_02), yearOf(b.data_desligamento_02)],
    [yearOf(b.data_ingresso_03), yearOf(b.data_desligamento_03)],
  ];

  const periodos = pares.filter(([i]) => i !== null) as Array<[number, number | null]>;
  if (periodos.length === 0) return !!b.ativo;

  return periodos.some(([ini, fim]) => {
    if (ini > ano) return false;
    const fimEfetivo = fim ?? (b.ativo ? Number.POSITIVE_INFINITY : ini);
    return fimEfetivo >= ano;
  });
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

function situacaoNoAno(b: any, ano: number): string {
  const ing = [b.data_ingresso_01, b.data_ingresso_02, b.data_ingresso_03].map(yearOf);
  const des = [b.data_desligamento_01, b.data_desligamento_02, b.data_desligamento_03].map(yearOf);
  if (ing.some((y) => y === ano)) return des.some((y) => y === ano) ? "Ingresso e saída no ano" : "Ingressou no ano";
  if (des.some((y) => y === ano)) return "Desligado no ano";
  return b.ativo ? "Permanência (ativo)" : "Permanência no ano";
}

/** Busca paginada — suporta milhares de registros. */
export async function fetchAtivosAno(ano: number): Promise<AtivosAnoResult> {
  const all: any[] = [];
  for (let from = 0; ; from += CHUNK) {
    const { data, error } = await supabase
      .from("beneficiarios")
      .select(COLS)
      .order("nome", { ascending: true })
      .range(from, from + CHUNK - 1);
    if (error) throw error;
    const batch = data ?? [];
    all.push(...batch);
    if (batch.length < CHUNK) break;
  }

  const brutos = all.filter((b) => ativoNoAno(b, ano));

  // duplicidades por nome normalizado
  const contagem = new Map<string, number>();
  brutos.forEach((b) => {
    const k = norm(clean(b.nome));
    if (k) contagem.set(k, (contagem.get(k) ?? 0) + 1);
  });

  const rows: AtivoAnoRow[] = brutos
    .map((b) => {
      const doc = documentoDe(b);
      const idade = idadeEm(b.data_nascimento, ano);
      const ingressos = [b.data_ingresso_01, b.data_ingresso_02, b.data_ingresso_03]
        .map(yearOf)
        .filter((y): y is number => y !== null && y <= ano);
      const nome = clean(b.nome) || "—";
      return {
        nome,
        documento: doc.documento,
        tipo: doc.tipo,
        cpfInvalido: doc.cpfInvalido,
        idade,
        grupo: grupoDe(idade),
        genero: clean(b.genero) || "Não informado",
        bairro: clean(b.bairro) || "Não informado",
        risco: clean(b.classe_risco) || "Não informado",
        escola: clean(b.escola) || "Não informado",
        ingresso: ingressos.length ? String(Math.max(...ingressos)) : "—",
        situacao: situacaoNoAno(b, ano),
        duplicado: (contagem.get(norm(nome)) ?? 0) > 1,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));

  const anteriorNomes = new Set(
    all.filter((b) => ativoNoAno(b, ano - 1)).map((b) => norm(clean(b.nome))),
  );

  return { ano, rows, anterior: { ano: ano - 1, nomes: anteriorNomes }, totalBase: all.length };
}

export type Auditoria = {
  semDocumento: AtivoAnoRow[];
  cpfInvalido: AtivoAnoRow[];
  duplicados: AtivoAnoRow[];
  semNascimento: AtivoAnoRow[];
  novos: AtivoAnoRow[];
  score: number;
};

export function auditar(res: AtivosAnoResult): Auditoria {
  const { rows, anterior } = res;
  const semDocumento = rows.filter((r) => r.tipo === "Ausente");
  const cpfInvalido = rows.filter((r) => r.cpfInvalido);
  const duplicados = rows.filter((r) => r.duplicado);
  const semNascimento = rows.filter((r) => r.idade == null);
  const novos = rows.filter((r) => !anterior.nomes.has(norm(r.nome)));
  const problemas = new Set(
    [...semDocumento, ...cpfInvalido, ...duplicados, ...semNascimento].map((r) => r.nome),
  ).size;
  const score = rows.length ? Math.round(((rows.length - problemas) / rows.length) * 100) : 100;
  return { semDocumento, cpfInvalido, duplicados, semNascimento, novos, score };
}

/* ------------------------------ Excel ------------------------------ */

const DARK = "1F3864";
const ZEBRA = "F2F2F2";
const WARN = "FFF2CC";
const THIN = { style: "thin", color: { rgb: "BFBFBF" } } as const;
const BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN } as any;
const FONT = "Arial";

const titleStyle = {
  font: { name: FONT, sz: 15, bold: true, color: { rgb: DARK } },
  alignment: { horizontal: "center", vertical: "center" },
};
const headStyle = {
  font: { name: FONT, sz: 11, bold: true, color: { rgb: "FFFFFF" } },
  fill: { patternType: "solid", fgColor: { rgb: DARK } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: BORDERS,
};

function styleSheet(
  ws: XLSX.WorkSheet,
  opts: {
    headerRow: number;
    nRows: number;
    nCols: number;
    widths: number[];
    highlight?: (i: number) => boolean;
    center?: number[];
  },
) {
  const { headerRow, nRows, nCols, widths, highlight, center = [] } = opts;
  const at = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });
  const set = (r: number, c: number, s: any) => {
    const a = at(r, c);
    if (!ws[a]) ws[a] = { t: "s", v: "" };
    ws[a].s = s;
  };

  for (let c = 0; c < nCols; c++) set(headerRow, c, headStyle);

  const first = headerRow + 1;
  for (let i = 0; i < nRows; i++) {
    const r = first + i;
    const flagged = highlight?.(i);
    const bg = flagged ? WARN : i % 2 === 1 ? ZEBRA : null;
    for (let c = 0; c < nCols; c++) {
      set(r, c, {
        font: { name: FONT, sz: 10, bold: !!flagged && c === 0 },
        border: BORDERS,
        ...(bg ? { fill: { patternType: "solid", fgColor: { rgb: bg } } } : {}),
        alignment: {
          horizontal: c === 0 || center.includes(c) ? "center" : "left",
          vertical: "center",
        },
      });
    }
  }

  ws["!cols"] = widths.map((wch) => ({ wch }));
  ws["!rows"] = [{ hpt: 26 }];
  ws["!freeze"] = { xSplit: 0, ySplit: first } as any;
  (ws as any)["!autofilter"] = {
    ref: `${XLSX.utils.encode_cell({ r: headerRow, c: 0 })}:${XLSX.utils.encode_cell({
      r: Math.max(first + nRows - 1, headerRow),
      c: nCols - 1,
    })}`,
  };
  return ws;
}

function metaHeader(titulo: string, linhas: string[], nCols: number) {
  const pad = (a: any[]) => [...a, ...Array(Math.max(0, nCols - a.length)).fill(null)];
  return [pad([titulo]), ...linhas.map((l) => pad([l])), pad([])];
}

function applyMeta(ws: XLSX.WorkSheet, nMeta: number, nCols: number) {
  const at = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });
  ws["!merges"] = [
    ...(ws["!merges"] ?? []),
    ...Array.from({ length: nMeta }, (_, r) => ({
      s: { r, c: 0 },
      e: { r, c: nCols - 1 },
    })),
  ];
  if (ws[at(0, 0)]) ws[at(0, 0)].s = titleStyle;
  for (let r = 1; r < nMeta; r++) {
    if (!ws[at(r, 0)]) continue;
    ws[at(r, 0)].s = {
      font: { name: FONT, sz: 10, color: { rgb: "404040" } },
      alignment: { horizontal: "center" },
    };
  }
}

function tally(rows: AtivoAnoRow[], key: keyof AtivoAnoRow) {
  const m = new Map<string, number>();
  rows.forEach((r) => {
    const v = String(r[key] ?? "Não informado");
    m.set(v, (m.get(v) ?? 0) + 1);
  });
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}

export function buildAtivosAnoWorkbook(res: AtivosAnoResult) {
  const { ano, rows } = res;
  const aud = auditar(res);
  const now = new Date();
  const meta = [
    `Data: ${now.toLocaleDateString("pt-BR")} — Hora: ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    `Total de beneficiários ativos em ${ano}: ${rows.length}  |  Base cadastral: ${res.totalBase}`,
    `Índice de completude documental: ${aud.score}%  |  Pendências: ${aud.semDocumento.length} sem documento, ${aud.cpfInvalido.length} CPF inválido, ${aud.duplicados.length} possível duplicidade`,
  ];
  const wb = XLSX.utils.book_new();

  /* --- Aba 1: lista oficial --- */
  const H1 = ["Nº", "Nome Completo", "Documento", "Tipo", "Idade", "Grupo", "Situação no ano"];
  const aoa1 = [
    ...metaHeader(`RELATÓRIO DE BENEFICIÁRIOS ATIVOS — ${ano}`, meta, H1.length),
    H1,
    ...rows.map((r, i) => [i + 1, r.nome, r.documento, r.tipo, r.idade ?? "—", r.grupo, r.situacao]),
    [],
    ["Sistema de Gestão de Beneficiários — Espaço Progredir"],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(aoa1);
  const nMeta = meta.length + 2;
  styleSheet(ws1, {
    headerRow: nMeta,
    nRows: rows.length,
    nCols: H1.length,
    widths: [6, 40, 30, 12, 8, 24, 22],
    center: [3, 4, 6],
    highlight: (i) => rows[i].tipo === "Ausente" || rows[i].cpfInvalido || rows[i].duplicado,
  });
  applyMeta(ws1, nMeta, H1.length);
  const footer = nMeta + rows.length + 2;
  const fa = XLSX.utils.encode_cell({ r: footer, c: 0 });
  if (ws1[fa]) {
    ws1[fa].s = {
      font: { name: FONT, sz: 9, italic: true, color: { rgb: "737373" } },
      alignment: { horizontal: "center" },
    };
    ws1["!merges"] = [...(ws1["!merges"] ?? []), { s: { r: footer, c: 0 }, e: { r: footer, c: H1.length - 1 } }];
  }
  XLSX.utils.book_append_sheet(wb, ws1, `Ativos ${ano}`);

  /* --- Aba 2: resumo executivo --- */
  const blocos: Array<[string, Array<[string, number]>]> = [
    ["Por grupo etário", tally(rows, "grupo")],
    ["Por gênero", tally(rows, "genero")],
    ["Por classe de risco", tally(rows, "risco")],
    ["Por tipo de documento", tally(rows, "tipo")],
    ["Por situação no ano", tally(rows, "situacao")],
    ["Top bairros", tally(rows, "bairro").slice(0, 15)],
    ["Top escolas", tally(rows, "escola").slice(0, 15)],
  ];
  const aoa2: any[][] = [
    ...metaHeader(`RESUMO EXECUTIVO — ATIVOS ${ano}`, meta, 3),
    ["Indicador", "Quantidade", "% do total"],
  ];
  const hr2 = aoa2.length - 1;
  const marks: number[] = [];
  blocos.forEach(([nome, itens]) => {
    marks.push(aoa2.length - hr2 - 1);
    aoa2.push([nome.toUpperCase(), null, null]);
    itens.forEach(([k, v]) =>
      aoa2.push([k, v, rows.length ? `${((v / rows.length) * 100).toFixed(1)}%` : "0%"]),
    );
  });
  const ws2 = XLSX.utils.aoa_to_sheet(aoa2);
  styleSheet(ws2, {
    headerRow: hr2,
    nRows: aoa2.length - hr2 - 1,
    nCols: 3,
    widths: [42, 14, 12],
    center: [1, 2],
    highlight: (i) => marks.includes(i),
  });
  // rótulos de bloco alinhados à esquerda
  marks.forEach((i) => {
    const a = XLSX.utils.encode_cell({ r: hr2 + 1 + i, c: 0 });
    if (ws2[a]) ws2[a].s = { ...(ws2[a].s ?? {}), alignment: { horizontal: "left" }, font: { name: FONT, sz: 10, bold: true, color: { rgb: DARK } } };
  });
  applyMeta(ws2, nMeta, 3);
  XLSX.utils.book_append_sheet(wb, ws2, "Resumo");

  /* --- Aba 3: pendências --- */
  const pend = [
    ...aud.semDocumento.map((r) => ["Sem documento", r]),
    ...aud.cpfInvalido.map((r) => ["CPF inválido", r]),
    ...aud.duplicados.map((r) => ["Possível duplicidade", r]),
    ...aud.semNascimento.map((r) => ["Sem data de nascimento", r]),
  ] as Array<[string, AtivoAnoRow]>;
  const H3 = ["Nº", "Pendência", "Nome Completo", "Documento atual", "Bairro", "Situação no ano"];
  const aoa3 = [
    ...metaHeader(`PENDÊNCIAS CADASTRAIS — ATIVOS ${ano}`, meta, H3.length),
    H3,
    ...(pend.length
      ? pend.map(([tipo, r], i) => [i + 1, tipo, r.nome, r.documento, r.bairro, r.situacao])
      : [[1, "Nenhuma pendência encontrada", "—", "—", "—", "—"]]),
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(aoa3);
  styleSheet(ws3, {
    headerRow: nMeta,
    nRows: Math.max(pend.length, 1),
    nCols: H3.length,
    widths: [6, 26, 40, 30, 22, 22],
    center: [1, 5],
    highlight: () => pend.length > 0,
  });
  applyMeta(ws3, nMeta, H3.length);
  XLSX.utils.book_append_sheet(wb, ws3, "Pendências");

  /* --- Aba 4: comparativo com o ano anterior --- */
  const H4 = ["Nº", "Nome Completo", "Documento", "Entrada em relação a " + res.anterior.ano];
  const aoa4 = [
    ...metaHeader(`NOVOS EM ${ano} (não constavam em ${res.anterior.ano})`, meta, H4.length),
    H4,
    ...(aud.novos.length
      ? aud.novos.map((r, i) => [i + 1, r.nome, r.documento, r.situacao])
      : [[1, "Nenhum novo beneficiário", "—", "—"]]),
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(aoa4);
  styleSheet(ws4, {
    headerRow: nMeta,
    nRows: Math.max(aud.novos.length, 1),
    nCols: H4.length,
    widths: [6, 40, 30, 26],
    center: [3],
  });
  applyMeta(ws4, nMeta, H4.length);
  XLSX.utils.book_append_sheet(wb, ws4, `Novos ${ano}`);

  return wb;
}

function download(blobParts: BlobPart[], type: string, filename: string) {
  const blob = new Blob(blobParts, { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 800);
}

export async function exportAtivosAnoXlsx(ano: number, pre?: AtivosAnoResult) {
  const res = pre ?? (await fetchAtivosAno(ano));
  const wb = buildAtivosAnoWorkbook(res);
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
  download(
    [buf],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    `Beneficiarios_Ativos_${ano}.xlsx`,
  );
  return res.rows.length;
}

/** CSV simples (Nº, Nome, Documento) para colar em sistemas da prefeitura. */
export function exportAtivosAnoCsv(res: AtivosAnoResult) {
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    ["Nº", "Nome Completo", "Documento", "Tipo"].map(esc).join(";"),
    ...res.rows.map((r, i) => [String(i + 1), r.nome, r.documento, r.tipo].map(esc).join(";")),
  ];
  download(["\uFEFF" + lines.join("\r\n")], "text/csv;charset=utf-8", `Beneficiarios_Ativos_${res.ano}.csv`);
  return res.rows.length;
}

export async function copyAtivosAnoLista(res: AtivosAnoResult) {
  const txt = res.rows.map((r, i) => `${i + 1}. ${r.nome} — ${r.documento}`).join("\n");
  await navigator.clipboard.writeText(txt);
  return res.rows.length;
}
