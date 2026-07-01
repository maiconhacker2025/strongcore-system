import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType,
} from "docx";
import { toast } from "sonner";

export type ReportKPI = { label: string; value: string | number };
export type FullReport = {
  title: string;
  subtitle?: string;
  filters?: string[];         // ex: ["Status: Ativos", "Ano ingresso: 2024"]
  kpis?: ReportKPI[];
  columns: string[];          // column keys
  rows: any[];
  groupBy?: { key: string; label: string; count: number }[]; // optional breakdown table
};

const LABELS: Record<string, string> = {
  codigo: "Código", nome: "Nome", data_nascimento: "Nascimento", idade: "Idade",
  genero: "Gênero", classe_risco: "Risco", ativo: "Status",
  escolaridade: "Escolaridade", turno: "Turno", escola: "Escola",
  bairro: "Bairro", rua: "Rua", cep: "CEP", estado: "UF",
  responsavel: "Responsável", nome_mae: "Mãe", nome_pai: "Pai",
  mora_com: "Mora com", celular: "Celular", whatsapp: "WhatsApp", email: "E-mail",
  data_ingresso_01: "Ingresso", data_desligamento_01: "Desligamento",
  renda: "Renda", alergia: "Alergia", medicacao: "Medicação",
  numero_irmaos: "Nº irmãos", assistente_social: "Assist. Social",
  psicologa: "Psicóloga", observacoes: "Observações",
};
const labelOf = (c: string) =>
  LABELS[c] ?? c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

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

/* ============ PDF ============ */
export async function exportReportPdf(r: FullReport) {
  try {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const rows = enrich(r.rows, r.columns);

    // Header band
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, W, 70, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text("Espaço Progredir · Relatório", 40, 32);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`Emitido em ${today()}`, 40, 50);

    // Title
    doc.setTextColor(20); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text(r.title, 40, 100);
    if (r.subtitle) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      doc.setTextColor(110);
      doc.text(r.subtitle, 40, 116);
    }

    let y = 135;
    if (r.filters?.length) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(20);
      doc.text("Filtros aplicados:", 40, y); y += 14;
      doc.setFont("helvetica", "normal"); doc.setTextColor(70);
      r.filters.forEach((f) => { doc.text(`• ${f}`, 50, y); y += 13; });
      y += 6;
    }

    // KPIs cards
    if (r.kpis?.length) {
      const cardW = (W - 80 - (r.kpis.length - 1) * 10) / r.kpis.length;
      r.kpis.forEach((k, i) => {
        const x = 40 + i * (cardW + 10);
        doc.setFillColor(243, 244, 246);
        doc.roundedRect(x, y, cardW, 54, 6, 6, "F");
        doc.setTextColor(90); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
        doc.text(k.label.toUpperCase(), x + 10, y + 18);
        doc.setTextColor(30, 58, 138); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
        doc.text(String(k.value), x + 10, y + 42);
      });
      y += 70;
    }

    if (r.groupBy?.length) {
      autoTable(doc, {
        startY: y,
        head: [["Categoria", "Quantidade", "%"]],
        body: (() => {
          const total = r.groupBy!.reduce((s, g) => s + g.count, 0) || 1;
          return r.groupBy!.map((g) => [g.label, g.count, `${((g.count / total) * 100).toFixed(1)}%`]);
        })(),
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [30, 58, 138], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 40, right: 40 },
      });
      y = (doc as any).lastAutoTable.finalY + 16;
    }

    if (rows.length) {
      autoTable(doc, {
        startY: y,
        head: [r.columns.map(labelOf)],
        body: rows.map((row) => r.columns.map((c) => fmt(c, row[c]))),
        styles: { fontSize: 7.5, cellPadding: 3, overflow: "linebreak" },
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 20, right: 20 },
        didDrawPage: () => {
          const pg = doc.getNumberOfPages();
          doc.setFontSize(8); doc.setTextColor(140);
          doc.text(`Espaço Progredir · ${r.title} · página ${pg}`, 40, doc.internal.pageSize.getHeight() - 20);
        },
      });
    }

    downloadBlob(doc.output("blob"), `${slug(r.title)}.pdf`);
    toast.success("PDF gerado");
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
