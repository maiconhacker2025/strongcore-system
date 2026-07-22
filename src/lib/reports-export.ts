import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType,
} from "docx";
import { toast } from "sonner";
import logoUrl from "@/assets/logo-progredir.jpg";

export type ReportKPI = { label: string; value: string | number };
export type FullReport = {
  title: string;
  subtitle?: string;
  filters?: string[];
  kpis?: ReportKPI[];
  columns: string[];
  rows: any[];
  groupBy?: { key: string; label: string; count: number }[];
};

import { COLUMN_LABELS } from "./report-columns";

const LABELS: Record<string, string> = {
  ...COLUMN_LABELS,
  classe_risco: "Risco",
  ativo: "Status",
  nome_mae: "Mãe",
  nome_pai: "Pai",
  data_ingresso_01: "Ingresso",
  data_desligamento_01: "Desligamento",
};
const labelOf = (c: string) =>
  LABELS[c] ?? c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

// Brand palette (matches sidebar teal + amber accents)
const BRAND_TEAL: [number, number, number] = [6, 59, 56];
const BRAND_TEAL_SOFT: [number, number, number] = [232, 244, 242];
const BRAND_AMBER: [number, number, number] = [217, 145, 36];
const INK: [number, number, number] = [24, 33, 33];
const MUTED: [number, number, number] = [115, 125, 125];
const ZEBRA: [number, number, number] = [248, 250, 249];

function calcAge(dob: any): string {
  if (!dob) return "";
  const d = new Date(String(dob));
  if (isNaN(d.getTime())) return "";
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return String(a);
}

function fmt(col: string, v: any) {
  if (v === null || v === undefined || v === "") return "—";
  if (col === "ativo") return v ? "Ativo" : "Inativo";
  if (col === "idade") return v ? `${v} anos` : "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (/^data_|nascimento|nasc_/.test(col)) {
    const d = new Date(String(v));
    if (!isNaN(d.getTime())) return d.toLocaleDateString("pt-BR");
  }
  return String(v);
}

function enrich(rows: any[], columns: string[]) {
  if (!columns.includes("idade")) return rows;
  return rows.map((r) => ({ ...r, idade: calcAge(r.data_nascimento) }));
}

const today = () => new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
const nowStamp = () => new Date().toLocaleString("pt-BR");

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.rel = "noopener"; a.style.display = "none";
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 800);
}

function slug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "relatorio";
}

let _logoData: string | null = null;
async function getLogoDataUrl(): Promise<string | null> {
  if (_logoData) return _logoData;
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    _logoData = await new Promise<string>((r, j) => {
      const fr = new FileReader();
      fr.onload = () => r(fr.result as string);
      fr.onerror = () => j(fr.error);
      fr.readAsDataURL(blob);
    });
    return _logoData;
  } catch {
    return null;
  }
}


/* ============ PDF ============ */
export async function exportReportPdf(r: FullReport) {
  try {
    const landscape = r.columns.length > 8;
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: landscape ? "landscape" : "portrait" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const rows = enrich(r.rows, r.columns);
    const logoImg = await getLogoDataUrl();

    // ---------- HEADER BAND ----------
    doc.setFillColor(...BRAND_TEAL);
    doc.rect(0, 0, W, 96, "F");
    // amber accent stripe
    doc.setFillColor(...BRAND_AMBER);
    doc.rect(0, 96, W, 4, "F");

    // Logo circle (white ring) on the left
    if (logoImg) {
      const cx = 62, cy = 48, rad = 30;
      doc.setFillColor(255, 255, 255);
      doc.circle(cx, cy, rad + 3, "F");
      // clip via image inside circle (approx — jsPDF has no true clip, use rounded rect fallback)
      doc.addImage(logoImg, "JPEG", cx - rad, cy - rad, rad * 2, rad * 2, undefined, "FAST");
    }

    const brandX = logoImg ? 108 : 40;
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text("Espaço Progredir", brandX, 40);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.setTextColor(210, 235, 230);
    doc.text("Acreditando na vida  ·  Programa de assistência social", brandX, 56);
    doc.setFontSize(8.5);
    doc.text(`Documento emitido em ${nowStamp()}`, brandX, 72);

    // Right side chip
    const chipLabel = "RELATÓRIO INSTITUCIONAL";
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    const chipW = doc.getTextWidth(chipLabel) + 20;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(255, 255, 255);
    doc.roundedRect(W - chipW - 40, 34, chipW, 20, 10, 10, "F");
    doc.setTextColor(...BRAND_TEAL);
    doc.text(chipLabel, W - chipW - 30, 47);

    // ---------- TITLE BLOCK ----------
    let y = 130;
    doc.setTextColor(...INK); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
    doc.text(r.title, 40, y); y += 8;
    if (r.subtitle) {
      y += 12;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
      doc.setTextColor(...MUTED);
      doc.text(r.subtitle, 40, y);
    }
    y += 20;

    // Filters as pills
    if (r.filters?.length) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...BRAND_TEAL);
      doc.text("FILTROS APLICADOS", 40, y); y += 10;
      let px = 40;
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
      r.filters.forEach((f) => {
        const w = doc.getTextWidth(f) + 16;
        if (px + w > W - 40) { px = 40; y += 20; }
        doc.setFillColor(...BRAND_TEAL_SOFT);
        doc.setDrawColor(...BRAND_TEAL_SOFT);
        doc.roundedRect(px, y - 9, w, 16, 8, 8, "F");
        doc.setTextColor(...BRAND_TEAL);
        doc.text(f, px + 8, y + 2);
        px += w + 6;
      });
      y += 20;
    }

    // ---------- KPI CARDS ----------
    if (r.kpis?.length) {
      const gap = 10;
      const cardW = (W - 80 - (r.kpis.length - 1) * gap) / r.kpis.length;
      const cardH = 62;
      r.kpis.forEach((k, i) => {
        const x = 40 + i * (cardW + gap);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(220, 226, 224);
        doc.roundedRect(x, y, cardW, cardH, 8, 8, "FD");
        // little amber accent bar
        doc.setFillColor(...BRAND_AMBER);
        doc.roundedRect(x, y, 4, cardH, 2, 2, "F");
        doc.setTextColor(...MUTED); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
        doc.text(k.label.toUpperCase(), x + 14, y + 18);
        doc.setTextColor(...BRAND_TEAL); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
        doc.text(String(k.value), x + 14, y + 46);
      });
      y += cardH + 16;
    }

    // ---------- DISTRIBUTION TABLE ----------
    if (r.groupBy?.length) {
      const total = r.groupBy.reduce((s, g) => s + g.count, 0) || 1;
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...INK);
      doc.text("Distribuição", 40, y); y += 6;
      autoTable(doc, {
        startY: y + 6,
        head: [["Categoria", "Quantidade", "%"]],
        body: r.groupBy.map((g) => [g.label, g.count, `${((g.count / total) * 100).toFixed(1)}%`]),
        styles: { fontSize: 9, cellPadding: 6, textColor: INK as any },
        headStyles: { fillColor: BRAND_TEAL as any, textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: ZEBRA as any },
        margin: { left: 40, right: 40 },
      });
      y = (doc as any).lastAutoTable.finalY + 20;
    }

    // ---------- DETAIL TABLE ----------
    if (rows.length) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...INK);
      doc.text(`Detalhamento (${rows.length} beneficiário${rows.length > 1 ? "s" : ""})`, 40, y);
      autoTable(doc, {
        startY: y + 8,
        head: [["#", ...r.columns.map(labelOf)]],
        body: rows.map((row, i) => [i + 1, ...r.columns.map((c) => fmt(c, row[c]))]),
        styles: { fontSize: 7.5, cellPadding: 4, overflow: "linebreak", textColor: INK as any, lineColor: [230, 234, 232] as any, lineWidth: 0.3 },
        headStyles: { fillColor: BRAND_TEAL as any, textColor: 255, fontStyle: "bold", halign: "left" },
        alternateRowStyles: { fillColor: ZEBRA as any },
        columnStyles: { 0: { cellWidth: 22, halign: "right", textColor: MUTED as any } },
        margin: { left: 24, right: 24, top: 40 },
        didDrawPage: () => {
          const pg = doc.getNumberOfPages();
          // footer
          doc.setDrawColor(...BRAND_TEAL_SOFT);
          doc.line(24, H - 30, W - 24, H - 30);
          doc.setFontSize(8); doc.setTextColor(...MUTED);
          doc.text("Espaço Progredir · Acreditando na vida", 24, H - 16);
          doc.text(`${r.title}  ·  página ${pg}`, W - 24, H - 16, { align: "right" });
        },
      });
    }

    downloadBlob(doc.output("blob"), `${slug(r.title)}-${new Date().toISOString().slice(0,10)}.pdf`);
    toast.success("PDF gerado com sucesso");
  } catch (e: any) {
    console.error(e); toast.error(`Erro ao gerar PDF: ${e?.message ?? e}`);
  }
}


/* ============ Excel ============ */
export async function exportReportXlsx(r: FullReport) {
  try {
    const wb = XLSX.utils.book_new();
    const rows = enrich(r.rows, r.columns);

    // Sheet 1 — Resumo
    const resumo: any[][] = [
      ["Espaço Progredir — Relatório"],
      [r.title],
      [r.subtitle ?? ""],
      [`Emitido em ${today()}`],
      [],
    ];
    if (r.filters?.length) {
      resumo.push(["Filtros aplicados"]);
      r.filters.forEach((f) => resumo.push(["", f]));
      resumo.push([]);
    }
    if (r.kpis?.length) {
      resumo.push(["Indicadores"]);
      resumo.push(["Métrica", "Valor"]);
      r.kpis.forEach((k) => resumo.push([k.label, k.value]));
      resumo.push([]);
    }
    if (r.groupBy?.length) {
      resumo.push(["Distribuição"]);
      resumo.push(["Categoria", "Quantidade", "%"]);
      const total = r.groupBy.reduce((s, g) => s + g.count, 0) || 1;
      r.groupBy.forEach((g) =>
        resumo.push([g.label, g.count, +((g.count / total) * 100).toFixed(1)])
      );
    }
    const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
    wsResumo["!cols"] = [{ wch: 32 }, { wch: 28 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

    // Sheet 2 — Detalhado
    if (rows.length) {
      const header = ["Nº", ...r.columns.map(labelOf)];
      const body: any[][] = [header];
      rows.forEach((row, i) => {
        body.push([i + 1, ...r.columns.map((c) => fmt(c, row[c]))]);
      });
      body.push([]);
      body.push(["Total", rows.length]);
      const ws = XLSX.utils.aoa_to_sheet(body);
      ws["!cols"] = [{ wch: 6 }, ...r.columns.map((c) =>
        ({ wch: c === "nome" ? 34 : c === "escola" ? 28 : c === "bairro" ? 20 : 14 }))];
      ws["!freeze"] = { xSplit: 0, ySplit: 1 } as any;
      ws["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(header.length - 1)}1` };
      // header style
      for (let i = 0; i < header.length; i++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c: i });
        if (ws[addr]) ws[addr].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1E3A8A" } },
          alignment: { horizontal: "center", vertical: "center" },
        };
      }
      XLSX.utils.book_append_sheet(wb, ws, "Detalhado");
    }

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
    downloadBlob(
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `${slug(r.title)}.xlsx`
    );
    toast.success(`Excel gerado com ${rows.length} registro(s)`);
  } catch (e: any) {
    console.error(e); toast.error(`Erro ao gerar Excel: ${e?.message ?? e}`);
  }
}

/* ============ Word ============ */
export async function exportReportDocx(r: FullReport) {
  try {
    const rows = enrich(r.rows, r.columns);
    const border = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
    const borders = { top: border, bottom: border, left: border, right: border };

    const children: any[] = [
      new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [new TextRun({ text: r.title, bold: true, color: "1E3A8A" })],
      }),
      new Paragraph({
        children: [new TextRun({ text: `Espaço Progredir · Emitido em ${today()}`, italics: true, color: "666666" })],
      }),
    ];
    if (r.subtitle) children.push(new Paragraph({ children: [new TextRun(r.subtitle)] }));

    if (r.filters?.length) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Filtros aplicados")] }));
      r.filters.forEach((f) => children.push(new Paragraph({ children: [new TextRun(`• ${f}`)] })));
    }
    if (r.kpis?.length) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Indicadores")] }));
      r.kpis.forEach((k) =>
        children.push(new Paragraph({ children: [
          new TextRun({ text: `${k.label}: `, bold: true }),
          new TextRun(String(k.value)),
        ]}))
      );
    }
    if (r.groupBy?.length) {
      const total = r.groupBy.reduce((s, g) => s + g.count, 0) || 1;
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Distribuição")] }));
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: ["Categoria", "Quantidade", "%"].map((h) =>
            new TableCell({ borders, shading: { fill: "1E3A8A", type: "clear", color: "auto" } as any,
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF" })] })] })
          )}),
          ...r.groupBy.map((g) => new TableRow({ children: [
            new TableCell({ borders, children: [new Paragraph(g.label)] }),
            new TableCell({ borders, children: [new Paragraph(String(g.count))] }),
            new TableCell({ borders, children: [new Paragraph(`${((g.count / total) * 100).toFixed(1)}%`)] }),
          ]})),
        ],
      }));
    }
    if (rows.length) {
      children.push(new Paragraph({ children: [new TextRun(" ")] }));
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(`Detalhado (${rows.length})`)] }));
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: r.columns.map((c) =>
            new TableCell({ borders, shading: { fill: "1E3A8A", type: "clear", color: "auto" } as any,
              children: [new Paragraph({ children: [new TextRun({ text: labelOf(c), bold: true, color: "FFFFFF" })] })] })
          )}),
          ...rows.map((row) => new TableRow({ children: r.columns.map((c) =>
            new TableCell({ borders, children: [new Paragraph({ children: [new TextRun(fmt(c, row[c]))], alignment: AlignmentType.LEFT })] })
          )})),
        ],
      }));
    }

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, `${slug(r.title)}.docx`);
    toast.success("Word gerado");
  } catch (e: any) {
    console.error(e); toast.error(`Erro ao gerar Word: ${e?.message ?? e}`);
  }
}
