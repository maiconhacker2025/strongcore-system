import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LAST_BACKUP_KEY = "beneficiarios:last_backup_at";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function getLastBackupAt(): Date | null {
  const v = localStorage.getItem(LAST_BACKUP_KEY);
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export function markBackupDone() {
  localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
}

export function isBackupOverdue(): boolean {
  const last = getLastBackupAt();
  if (!last) return true;
  return Date.now() - last.getTime() > WEEK_MS;
}

export function daysSinceBackup(): number | null {
  const last = getLastBackupAt();
  if (!last) return null;
  return Math.floor((Date.now() - last.getTime()) / (24 * 3600 * 1000));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

// Todas as tabelas do sistema incluídas no backup completo
export const BACKUP_TABLES = [
  "beneficiarios",
  "beneficiario_arquivos",
  "beneficiario_eventos",
  "oficinas",
  "turmas",
  "matriculas",
  "aulas",
  "frequencias",
  "listas_presenca",
  "presenca_logs",
  "avaliacoes",
  "certificados",
  "eventos",
  "evento_participantes",
  "projetos",
  "projeto_participantes",
  "atividade_historico",
  "report_views",
  "report_settings",
  "report_logs",
] as const;

async function fetchTable(table: string) {
  const all: any[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await (supabase as any)
      .from(table)
      .select("*")
      .range(from, from + pageSize - 1);
    if (error) {
      console.warn(`[backup] ${table}: ${error.message}`);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function fetchAll() {
  const all: any[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("beneficiarios")
      .select("*")
      .order("nome", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function flattenRow(row: any) {
  const out: any = {};
  for (const [k, v] of Object.entries(row ?? {})) {
    out[k] = v && typeof v === "object" ? JSON.stringify(v) : v;
  }
  return out;
}

/** Backup completo do sistema: 1 planilha por tabela + JSON bruto restaurável. */
export async function backupSistemaCompleto(): Promise<Record<string, number>> {
  const dump: Record<string, any[]> = {};
  const counts: Record<string, number> = {};

  for (const t of BACKUP_TABLES) {
    const rows = await fetchTable(t);
    dump[t] = rows;
    counts[t] = rows.length;
  }

  const wb = XLSX.utils.book_new();

  const resumo: any[][] = [
    ["Backup completo do sistema — Espaço Progredir"],
    ["Gerado em", new Date().toLocaleString("pt-BR")],
    [],
    ["Tabela", "Registros"],
    ...BACKUP_TABLES.map((t) => [t, counts[t] ?? 0]),
    [],
    ["TOTAL", Object.values(counts).reduce((a, b) => a + b, 0)],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
  wsResumo["!cols"] = [{ wch: 30 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  for (const t of BACKUP_TABLES) {
    const rows = dump[t] ?? [];
    if (!rows.length) continue;
    const ws = XLSX.utils.json_to_sheet(rows.map(flattenRow));
    ws["!cols"] = Object.keys(flattenRow(rows[0])).map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, t.slice(0, 31));
  }

  const ab = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([ab], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `backup-sistema-completo-${timestamp()}.xlsx`
  );

  // JSON bruto (restauração fiel, inclui campos JSON aninhados)
  downloadBlob(
    new Blob([JSON.stringify({ gerado_em: new Date().toISOString(), tabelas: dump }, null, 2)], {
      type: "application/json",
    }),
    `backup-sistema-completo-${timestamp()}.json`
  );

  return counts;
}

function cellText(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  return s.length > 220 ? s.slice(0, 217) + "..." : s;
}

function prettyCol(c: string) {
  return c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

/** Backup geral do sistema em PDF: todas as tabelas, todos os registros, todas as colunas. */
export async function backupPdfSistemaCompleto(): Promise<Record<string, number>> {
  const dump: Record<string, any[]> = {};
  const counts: Record<string, number> = {};

  for (const t of BACKUP_TABLES) {
    const rows = await fetchTable(t);
    dump[t] = rows;
    counts[t] = rows.length;
  }

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Capa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(6, 59, 56);
  doc.text("Backup Geral do Sistema", 40, 90);
  doc.setFontSize(14);
  doc.setTextColor(120);
  doc.setFont("helvetica", "normal");
  doc.text("Espaço Progredir · Sistema de Beneficiários", 40, 116);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 40, 138);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  autoTable(doc, {
    startY: 170,
    head: [["#", "Tabela", "Registros", "Colunas"]],
    body: BACKUP_TABLES.map((t, i) => [
      i + 1,
      t,
      counts[t] ?? 0,
      dump[t]?.length ? Object.keys(dump[t][0]).length : 0,
    ]),
    foot: [["", "TOTAL", total, ""]],
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [6, 59, 56], textColor: 255 },
    footStyles: { fillColor: [245, 158, 11], textColor: [6, 59, 56], fontStyle: "bold" },
    margin: { left: 40, right: 40 },
  });

  const COLS_PER_BLOCK = 7;

  for (const t of BACKUP_TABLES) {
    const rows = dump[t] ?? [];
    doc.addPage("a4", "landscape");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(6, 59, 56);
    doc.text(prettyCol(t), 40, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(130);
    doc.text(`${rows.length} registro(s)`, 40, 66);

    if (!rows.length) continue;

    const columns = Array.from(
      rows.reduce((set: Set<string>, r) => {
        Object.keys(r ?? {}).forEach((k) => set.add(k));
        return set;
      }, new Set<string>())
    );

    let y = 84;
    for (let i = 0; i < columns.length; i += COLS_PER_BLOCK) {
      const block = columns.slice(i, i + COLS_PER_BLOCK);
      autoTable(doc, {
        startY: y,
        head: [["#", ...block.map(prettyCol)]],
        body: rows.map((r, idx) => [idx + 1, ...block.map((c) => cellText(r?.[c]))]),
        styles: { fontSize: 6.5, cellPadding: 2, overflow: "linebreak", valign: "top" },
        headStyles: { fillColor: [13, 148, 136], textColor: 255, fontSize: 6.5 },
        alternateRowStyles: { fillColor: [244, 250, 249] },
        columnStyles: { 0: { cellWidth: 22, halign: "right" } },
        margin: { left: 40, right: 40, top: 40 },
        tableWidth: "auto",
      });
      y = (doc as any).lastAutoTable.finalY + 18;
      if (y > H - 120 && i + COLS_PER_BLOCK < columns.length) {
        doc.addPage("a4", "landscape");
        y = 50;
      }
    }
  }

  // Rodapé com paginação
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Backup Geral · Espaço Progredir", 40, H - 20);
    doc.text(`Página ${p} de ${pages}`, W - 100, H - 20);
  }

  doc.save(`backup-geral-sistema-${timestamp()}.pdf`);
  return counts;
}




function todayBR() {
  return new Date().toLocaleDateString("pt-BR");
}

function timestamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function backupExcel(): Promise<number> {
  const rows = await fetchAll();
  if (rows.length === 0) {
    toast.warning("Nenhum beneficiário cadastrado para fazer backup.");
    return 0;
  }

  const wb = XLSX.utils.book_new();

  // Resumo
  const ativos = rows.filter((r) => r.ativo).length;
  const inativos = rows.length - ativos;
  const resumo = [
    ["Backup completo — Sistema Beneficiários"],
    ["Gerado em", todayBR()],
    [],
    ["Total de registros", rows.length],
    ["Ativos", ativos],
    ["Inativos", inativos],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
  wsResumo["!cols"] = [{ wch: 28 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  // Tudo
  const wsAll = XLSX.utils.json_to_sheet(rows);
  wsAll["!cols"] = Object.keys(rows[0]).map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, wsAll, "Beneficiários");

  // Apenas ativos
  const onlyAtivos = rows.filter((r) => r.ativo);
  if (onlyAtivos.length) {
    const wsAt = XLSX.utils.json_to_sheet(onlyAtivos);
    XLSX.utils.book_append_sheet(wb, wsAt, "Ativos");
  }

  const ab = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([ab], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `backup-beneficiarios-${timestamp()}.xlsx`
  );
  return rows.length;
}

export async function backupPdf(): Promise<number> {
  const rows = await fetchAll();
  if (rows.length === 0) {
    toast.warning("Nenhum beneficiário cadastrado para fazer backup.");
    return 0;
  }

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Backup — Sistema Beneficiários", 40, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Gerado em ${todayBR()} · ${rows.length} registro(s)`, 40, 70);

  const ativos = rows.filter((r) => r.ativo).length;
  const altoRisco = rows.filter((r) => r.classe_risco === "Alto").length;
  doc.setTextColor(40);
  doc.setFontSize(11);
  doc.text(`Ativos: ${ativos}   ·   Inativos: ${rows.length - ativos}   ·   Risco alto: ${altoRisco}`, 40, 90);

  const cols = ["Código", "Nome", "Idade", "Escola", "Bairro", "Risco", "Contato", "Status"];
  const body = rows.map((r) => {
    const idade = r.data_nascimento
      ? String(Math.floor((Date.now() - new Date(r.data_nascimento).getTime()) / (365.25 * 24 * 3600 * 1000))) + "a"
      : "—";
    return [
      r.codigo ?? "—",
      r.nome ?? "—",
      idade,
      r.escola ?? "—",
      r.bairro ?? "—",
      r.classe_risco ?? "—",
      r.whatsapp || r.celular || "—",
      r.ativo ? "Ativo" : "Inativo",
    ];
  });

  autoTable(doc, {
    startY: 110,
    head: [cols],
    body,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    margin: { left: 40, right: 40 },
    didDrawPage: () => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${page}`, W - 60, doc.internal.pageSize.getHeight() - 20);
    },
  });

  doc.save(`backup-beneficiarios-${timestamp()}.pdf`);
  return rows.length;
}

export async function runFullBackup() {
  try {
    toast.loading("Gerando backup completo do sistema...", { id: "backup" });
    const n = await backupExcel();
    await backupPdf();
    const counts = await backupSistemaCompleto();
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    markBackupDone();
    toast.success(
      `Backup completo concluído! ${n} beneficiário(s) em Excel/PDF + ${total} registro(s) de ${Object.keys(counts).length} tabelas (Excel + JSON).`,
      { id: "backup", duration: 8000 }
    );
  } catch (e: any) {
    console.error(e);
    toast.error(`Erro no backup: ${e?.message ?? e}`, { id: "backup" });
  }
}

