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
    toast.loading("Gerando backup completo...", { id: "backup" });
    const n = await backupExcel();
    await backupPdf();
    markBackupDone();
    toast.success(`Backup concluído! ${n} registro(s) salvos em Excel e PDF.`, { id: "backup" });
  } catch (e: any) {
    console.error(e);
    toast.error(`Erro no backup: ${e?.message ?? e}`, { id: "backup" });
  }
}
