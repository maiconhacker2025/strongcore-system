import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType,
} from "docx";
import { toast } from "sonner";

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

const COLUMN_LABELS: Record<string, string> = {
  codigo: "Código", nome: "Nome", data_nascimento: "Nascimento", genero: "Gênero",
  classe_risco: "Risco", ativo: "Status", escolaridade: "Escolaridade", turno: "Turno",
  escola: "Escola", bairro: "Bairro", rua: "Rua", cep: "CEP", estado: "UF",
  responsavel: "Responsável", nome_mae: "Mãe", nome_pai: "Pai", mora_com: "Mora com",
  celular: "Celular", whatsapp: "WhatsApp", email: "E-mail",
  data_ingresso_01: "Ingresso", data_desligamento_01: "Desligamento",
  renda: "Renda", possui_beneficios: "Benefícios", alergia: "Alergia",
  medicacao: "Medicação", numero_irmaos: "Nº irmãos", profissao_mae: "Profissão (mãe)",
  profissao_pai: "Profissão (pai)", idade: "Idade", total: "Total", valor: "Valor",
};

function labelOf(col: string) {
  return COLUMN_LABELS[col] ?? col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function calcAge(dob: string | null | undefined): string {
  if (!dob) return "—";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "—";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return `${age} anos`;
}

function formatCell(col: string, v: any) {
  if (v === null || v === undefined || v === "") return "—";
  if (col === "ativo") return v ? "Ativo" : "Inativo";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (col === "data_nascimento") {
    const age = calcAge(String(v));
    const d = new Date(String(v));
    if (!isNaN(d.getTime())) return `${d.toLocaleDateString("pt-BR")} (${age})`;
  }
  if (/^data_/.test(col)) {
    const d = new Date(String(v));
    if (!isNaN(d.getTime())) return d.toLocaleDateString("pt-BR");
  }
  return String(v);
}

function rowToValues(row: any, cols: string[]) {
  return cols.map((c) => formatCell(c, row?.[c]));
}

function stripMd(s: string) {
  return s
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/[*_`>]/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

function downloadBlob(blob: Blob, filename: string) {
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
  }, 1000);
}

export async function exportPdf(d: ReportData) {
  try {
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
        head: [t.columns.map(labelOf)],
        body: t.rows.map((r) => rowToValues(r, t.columns)),
        styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 30, right: 30 },
      });
      y = (doc as any).lastAutoTable.finalY + 20;
    }

    const blob = doc.output("blob");
    downloadBlob(blob, `${slug(d.title)}.pdf`);
    toast.success("PDF gerado com sucesso");
  } catch (e: any) {
    console.error("exportPdf error", e);
    toast.error(`Erro ao gerar PDF: ${e?.message ?? e}`);
  }
}

export async function exportXlsx(d: ReportData) {
  try {
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
      const safeName = (t.title || `Tabela ${i + 1}`)
        .replace(/[\\\/\?\*\[\]:]/g, " ")
        .slice(0, 28);
      XLSX.utils.book_append_sheet(wb, s, safeName);
    });

    const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    downloadBlob(blob, `${slug(d.title)}.xlsx`);
    toast.success("Excel gerado com sucesso");
  } catch (e: any) {
    console.error("exportXlsx error", e);
    toast.error(`Erro ao gerar Excel: ${e?.message ?? e}`);
  }
}

export async function exportDocx(d: ReportData) {
  try {
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
    downloadBlob(blob, `${slug(d.title)}.docx`);
    toast.success("Word gerado com sucesso");
  } catch (e: any) {
    console.error("exportDocx error", e);
    toast.error(`Erro ao gerar Word: ${e?.message ?? e}`);
  }
}

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "relatorio";
}
