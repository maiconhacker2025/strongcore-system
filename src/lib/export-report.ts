import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType,
} from "docx";

export type ReportTable = { title: string; columns: string[]; rows: any[] };
export type ReportData = {
  title: string;
  question: string;
  answer: string;
  tables: ReportTable[];
};

function today() {
  return new Date().toLocaleDateString("pt-BR");
}

function rowToValues(row: any, cols: string[]) {
  return cols.map((c) => {
    const v = row?.[c];
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "boolean") return v ? "Sim" : "Não";
    return String(v);
  });
}

function stripMd(s: string) {
  return s.replace(/[*_`#>]/g, "").replace(/\n{3,}/g, "\n\n");
}

export function exportPdf(d: ReportData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(d.title, 40, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Gerado em ${today()} · Sistema Beneficiários`, 40, 68);

  doc.setTextColor(40);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Pergunta", 40, 100);
  doc.setFont("helvetica", "normal");
  const qLines = doc.splitTextToSize(d.question, W - 80);
  doc.text(qLines, 40, 116);

  let y = 116 + qLines.length * 14 + 14;
  doc.setFont("helvetica", "bold");
  doc.text("Resposta", 40, y);
  doc.setFont("helvetica", "normal");
  const aLines = doc.splitTextToSize(stripMd(d.answer), W - 80);
  doc.text(aLines, 40, y + 16);
  y = y + 16 + aLines.length * 14 + 10;

  for (const t of d.tables) {
    if (y > 720) { doc.addPage(); y = 50; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(t.title, 40, y);
    y += 8;
    autoTable(doc, {
      startY: y + 4,
      head: [t.columns],
      body: t.rows.map((r) => rowToValues(r, t.columns)),
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  doc.save(`${slug(d.title)}.pdf`);
}

export function exportXlsx(d: ReportData) {
  const wb = XLSX.utils.book_new();

  const meta = [
    ["Relatório", d.title],
    ["Gerado em", today()],
    [],
    ["Pergunta", d.question],
    ["Resposta", stripMd(d.answer)],
  ];
  const ws = XLSX.utils.aoa_to_sheet(meta);
  ws["!cols"] = [{ wch: 18 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, ws, "Resumo");

  d.tables.forEach((t, i) => {
    const body = [t.columns, ...t.rows.map((r) => rowToValues(r, t.columns))];
    const s = XLSX.utils.aoa_to_sheet(body);
    s["!cols"] = t.columns.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, s, (t.title || `Tabela ${i + 1}`).slice(0, 28));
  });

  XLSX.writeFile(wb, `${slug(d.title)}.xlsx`);
}

export async function exportDocx(d: ReportData) {
  const children: any[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: d.title, bold: true })],
    }),
    new Paragraph({
      children: [new TextRun({ text: `Gerado em ${today()} · Sistema Beneficiários`, italics: true, color: "666666" })],
    }),
    new Paragraph({ children: [new TextRun(" ")] }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Pergunta")] }),
    new Paragraph({ children: [new TextRun(d.question)] }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Resposta")] }),
    ...stripMd(d.answer).split("\n").map(
      (line) => new Paragraph({ children: [new TextRun(line)] })
    ),
  ];

  for (const t of d.tables) {
    children.push(new Paragraph({ children: [new TextRun(" ")] }));
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t.title)] }));
    const border = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
    const borders = { top: border, bottom: border, left: border, right: border };
    const headerRow = new TableRow({
      children: t.columns.map((c) =>
        new TableCell({
          borders,
          shading: { fill: "2563EB", type: "clear", color: "auto" } as any,
          children: [new Paragraph({ children: [new TextRun({ text: c, bold: true, color: "FFFFFF" })] })],
        })
      ),
    });
    const bodyRows = t.rows.map((r) =>
      new TableRow({
        children: rowToValues(r, t.columns).map((v) =>
          new TableCell({
            borders,
            children: [new Paragraph({ children: [new TextRun(v)], alignment: AlignmentType.LEFT })],
          })
        ),
      })
    );
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...bodyRows],
    }));
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(d.title)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "relatorio";
}
