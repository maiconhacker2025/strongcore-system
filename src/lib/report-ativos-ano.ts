import * as XLSX from "xlsx-js-style";
import { supabase } from "@/integrations/supabase/client";

export type AtivoAnoRow = { nome: string; documento: string };

const CHUNK = 1000;

const COLS =
  "nome, ativo, cpf, rg, num_termo, num_livro, num_folha, data_ingresso_01, data_ingresso_02, data_ingresso_03, data_desligamento_01, data_desligamento_02, data_desligamento_03";

const yearOf = (v: any): number | null => {
  if (!v) return null;
  const y = Number(String(v).slice(0, 4));
  return Number.isFinite(y) && y > 1900 ? y : null;
};

const clean = (v: any) => {
  const s = v === null || v === undefined ? "" : String(v).trim();
  return s && s !== "-" && s !== "0" ? s : "";
};

/** CPF → RG → Certidão de nascimento → "Documento não informado" */
export function documentoDe(b: any): string {
  const cpf = clean(b.cpf);
  if (cpf) return cpf;
  const rg = clean(b.rg);
  if (rg) return rg;
  const termo = clean(b.num_termo);
  const livro = clean(b.num_livro);
  const folha = clean(b.num_folha);
  if (termo || livro || folha) {
    const parts = [
      termo && `Termo ${termo}`,
      livro && `Livro ${livro}`,
      folha && `Folha ${folha}`,
    ].filter(Boolean);
    return `Certidão — ${parts.join(" / ")}`;
  }
  return "Documento não informado";
}

/**
 * Beneficiário estava ATIVO durante o ano informado.
 * Cada ingresso é pareado com o desligamento correspondente (01/02/03),
 * formando períodos. O beneficiário conta no ano se algum período cobre o ano.
 * - Período sem desligamento: aberto apenas se o cadastro está ativo;
 *   caso contrário vale somente o ano do ingresso.
 * - Sem nenhuma data de ingresso: só entra se o cadastro está ativo.
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


/** Busca paginada — suporta milhares de registros. */
export async function fetchAtivosAno(ano: number): Promise<AtivoAnoRow[]> {
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

  return all
    .filter((b) => ativoNoAno(b, ano))
    .map((b) => ({ nome: clean(b.nome) || "—", documento: documentoDe(b) }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
}

const DARK = "1F3864";
const ZEBRA = "F2F2F2";
const THIN = { style: "thin", color: { rgb: "BFBFBF" } } as const;
const BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN } as any;
const FONT = "Arial";

export function buildAtivosAnoWorkbook(ano: number, rows: AtivoAnoRow[]) {
  const now = new Date();
  const data = now.toLocaleDateString("pt-BR");
  const hora = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const aoa: any[][] = [
    [`RELATÓRIO DE BENEFICIÁRIOS ATIVOS - ${ano}`, null, null],
    [`Data: ${data}`, null, null],
    [`Hora: ${hora}`, null, null],
    [`Total de Beneficiários: ${rows.length}`, null, null],
    [],
    ["Nº", "Nome Completo", "Documento"],
    ...rows.map((r, i) => [i + 1, r.nome, r.documento]),
    [],
    ["Sistema de Gestão de Beneficiários — Espaço Progredir", null, null],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const headerRow = 5; // 0-indexed
  const firstData = headerRow + 1;
  const lastData = headerRow + rows.length;
  const footerRow = lastData + 2;

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } },
    { s: { r: footerRow, c: 0 }, e: { r: footerRow, c: 2 } },
  ];

  const at = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });
  const setStyle = (r: number, c: number, s: any) => {
    const a = at(r, c);
    if (!ws[a]) ws[a] = { t: "s", v: "" };
    ws[a].s = s;
  };

  // Title + meta
  setStyle(0, 0, {
    font: { name: FONT, sz: 15, bold: true, color: { rgb: DARK } },
    alignment: { horizontal: "center", vertical: "center" },
  });
  [1, 2, 3].forEach((r) =>
    setStyle(r, 0, {
      font: { name: FONT, sz: 10, bold: r === 3, color: { rgb: "404040" } },
      alignment: { horizontal: "center" },
    }),
  );

  // Header
  ["Nº", "Nome Completo", "Documento"].forEach((_, c) =>
    setStyle(headerRow, c, {
      font: { name: FONT, sz: 11, bold: true, color: { rgb: "FFFFFF" } },
      fill: { patternType: "solid", fgColor: { rgb: DARK } },
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDERS,
    }),
  );

  // Body — zebra + borders
  let maxNome = "Nome Completo".length;
  let maxDoc = "Documento".length;
  for (let r = firstData; r <= lastData; r++) {
    const zebra = (r - firstData) % 2 === 1;
    const fill = zebra ? { fill: { patternType: "solid", fgColor: { rgb: ZEBRA } } } : {};
    const base = { font: { name: FONT, sz: 10 }, border: BORDERS, ...fill };
    setStyle(r, 0, { ...base, alignment: { horizontal: "center" } });
    setStyle(r, 1, { ...base, alignment: { horizontal: "left", vertical: "center" } });
    setStyle(r, 2, { ...base, alignment: { horizontal: "center", vertical: "center" } });
    const row = rows[r - firstData];
    if (row) {
      maxNome = Math.max(maxNome, row.nome.length);
      maxDoc = Math.max(maxDoc, row.documento.length);
    }
  }

  // Footer
  setStyle(footerRow, 0, {
    font: { name: FONT, sz: 9, italic: true, color: { rgb: "737373" } },
    alignment: { horizontal: "center" },
  });

  ws["!cols"] = [
    { wch: 6 },
    { wch: Math.min(60, Math.max(24, maxNome + 4)) },
    { wch: Math.min(46, Math.max(18, maxDoc + 4)) },
  ];
  ws["!rows"] = [{ hpt: 26 }];
  ws["!freeze"] = { xSplit: 0, ySplit: firstData } as any;
  (ws as any)["!autofilter"] = { ref: `A${headerRow + 1}:C${Math.max(lastData + 1, headerRow + 1)}` };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Ativos ${ano}`);
  return wb;
}

export async function exportAtivosAnoXlsx(ano: number, preRows?: AtivoAnoRow[]) {
  const rows = preRows ?? (await fetchAtivosAno(ano));
  const wb = buildAtivosAnoWorkbook(ano, rows);
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Beneficiarios_Ativos_${ano}.xlsx`;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 800);
  return rows.length;
}
