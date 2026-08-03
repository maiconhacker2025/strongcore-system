import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import XLSXS from "xlsx-js-style";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, HeadingLevel, ShadingType, PageOrientation,
} from "docx";
import { toast } from "sonner";
import logoUrl from "@/assets/logo-progredir.jpg";
import {
  ListaPresenca, Participante, diasUteis, diaSemanaCurto, estatisticas,
  statusMeta, MESES, fmtData,
} from "@/lib/presenca";

const VERDE: [number, number, number] = [15, 122, 61];
const VERDE_SOFT: [number, number, number] = [233, 247, 238];
const AMARELO: [number, number, number] = [242, 183, 5];
const INK: [number, number, number] = [26, 34, 30];
const MUTED: [number, number, number] = [110, 122, 115];
const ZEBRA: [number, number, number] = [247, 251, 248];

const VERDE_HEX = "0F7A3D";
const AMARELO_HEX = "F2B705";

const nowStamp = () => new Date().toLocaleString("pt-BR");

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.rel = "noopener"; a.style.display = "none";
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 800);
}

let _logo: string | null = null;
async function logoData(): Promise<string | null> {
  if (_logo) return _logo;
  try {
    const blob = await (await fetch(logoUrl)).blob();
    _logo = await new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(blob);
    });
    return _logo;
  } catch { return null; }
}

export type EscopoImpressao = "completa" | "turma" | "projeto" | "presentes" | "faltosos";

export function filtrarParticipantes(l: ListaPresenca, escopo: EscopoImpressao): Participante[] {
  const dias = diasUteis(l.mes, l.ano);
  const contar = (p: Participante, alvo: string[]) =>
    dias.filter((d) => alvo.includes(l.marcacoes?.[p.id]?.[String(d)] ?? "presente")).length;
  if (escopo === "presentes") return l.participantes.filter((p) => contar(p, ["falta", "nao_compareceu"]) === 0);
  if (escopo === "faltosos") return l.participantes.filter((p) => contar(p, ["falta", "nao_compareceu"]) > 0);
  if (escopo === "turma") return l.participantes.filter((p) => !l.turma || p.turma === l.turma);
  return l.participantes;
}

const ESCOPO_LABEL: Record<EscopoImpressao, string> = {
  completa: "Lista completa",
  turma: "Apenas turma",
  projeto: "Apenas projeto",
  presentes: "Apenas presentes",
  faltosos: "Apenas faltosos",
};

const cabecalhoInfo = (l: ListaPresenca) => [
  ["Mês", MESES[l.mes - 1]],
  ["Ano", String(l.ano)],
  ["Projeto", l.projeto || "—"],
  ["Turma", l.turma || "—"],
  ["Turno", l.turno || "—"],
  ["Educador responsável", l.educador || "—"],
];

const nomeArquivo = (l: ListaPresenca, ext: string) =>
  `lista-presenca-${MESES[l.mes - 1].toLowerCase()}-${l.ano}.${ext}`;

/* ======================= PDF ======================= */
export async function exportarPresencaPdf(l: ListaPresenca, escopo: EscopoImpressao = "completa") {
  try {
    const parts = filtrarParticipantes(l, escopo);
    const dias = diasUteis(l.mes, l.ano);
    const st = estatisticas(parts, l.marcacoes, dias);
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const logo = await logoData();

    // Cabeçalho oficial
    doc.setFillColor(...VERDE);
    doc.rect(0, 0, W, 88, "F");
    doc.setFillColor(...AMARELO);
    doc.rect(0, 88, W, 5, "F");
    if (logo) {
      doc.setFillColor(255, 255, 255);
      doc.circle(58, 44, 27, "F");
      doc.addImage(logo, "JPEG", 34, 20, 48, 48, undefined, "FAST");
    }
    const bx = logo ? 100 : 40;
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text("ESPAÇO PROGREDIR", bx, 36);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    doc.setTextColor(215, 240, 224);
    doc.text("Acreditando na vida · Sistema de Gestão de Beneficiários", bx, 52);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(255);
    doc.text("LISTA DE PRESENÇA", bx, 72);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    const chip = ESCOPO_LABEL[escopo].toUpperCase();
    const cw = doc.getTextWidth(chip) + 20;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(W - cw - 40, 34, cw, 20, 10, 10, "F");
    doc.setTextColor(...VERDE);
    doc.text(chip, W - cw - 30, 47);

    // Bloco de identificação
    let y = 116;
    autoTable(doc, {
      startY: y,
      body: [
        cabecalhoInfo(l).slice(0, 3).flatMap(([k, v]) => [`${k}:`, v]),
        cabecalhoInfo(l).slice(3).flatMap(([k, v]) => [`${k}:`, v]),
      ],
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 5, textColor: INK as any, lineColor: [220, 231, 224] as any, lineWidth: 0.4 },
      columnStyles: {
        0: { fontStyle: "bold", fillColor: VERDE_SOFT as any, cellWidth: 70 },
        2: { fontStyle: "bold", fillColor: VERDE_SOFT as any, cellWidth: 70 },
        4: { fontStyle: "bold", fillColor: VERDE_SOFT as any, cellWidth: 120 },
      },
      margin: { left: 28, right: 28 },
    });
    y = (doc as any).lastAutoTable.finalY + 14;

    // KPIs
    const kpis = [
      { label: "Beneficiários", value: st.beneficiarios },
      { label: "Presenças", value: st.presente },
      { label: "Faltas", value: st.falta },
      { label: "Justificados", value: st.justificado },
      { label: "Frequência", value: `${st.frequencia}%` },
    ];
    const gap = 10, cardW = (W - 56 - gap * (kpis.length - 1)) / kpis.length, cardH = 50;
    kpis.forEach((k, i) => {
      const x = 28 + i * (cardW + gap);
      doc.setFillColor(255, 255, 255); doc.setDrawColor(220, 231, 224);
      doc.roundedRect(x, y, cardW, cardH, 8, 8, "FD");
      doc.setFillColor(...AMARELO);
      doc.roundedRect(x, y, 4, cardH, 2, 2, "F");
      doc.setTextColor(...MUTED); doc.setFont("helvetica", "bold"); doc.setFontSize(7);
      doc.text(k.label.toUpperCase(), x + 12, y + 17);
      doc.setTextColor(...VERDE); doc.setFontSize(17);
      doc.text(String(k.value), x + 12, y + 40);
    });
    y += cardH + 16;

    // Tabela principal
    autoTable(doc, {
      startY: y,
      head: [[
        "Nº", "Nome completo", "CPF / Doc.", "Nascimento", "Responsável", "Telefone",
        ...dias.map((d) => `${String(d).padStart(2, "0")}\n${diaSemanaCurto(d, l.mes, l.ano)}`),
      ]],
      body: parts.map((p, i) => [
        i + 1, p.nome, p.cpf || "—", fmtData(p.data_nascimento) || "—", p.responsavel || "—", p.telefone || "—",
        ...dias.map((d) => statusMeta(l.marcacoes?.[p.id]?.[String(d)]).short),
      ]),
      styles: { fontSize: 6.6, cellPadding: 2.5, overflow: "linebreak", textColor: INK as any, lineColor: [226, 236, 230] as any, lineWidth: 0.3, valign: "middle" },
      headStyles: { fillColor: VERDE as any, textColor: 255, fontStyle: "bold", fontSize: 6.2, halign: "center" },
      alternateRowStyles: { fillColor: ZEBRA as any },
      columnStyles: {
        0: { cellWidth: 20, halign: "center", textColor: MUTED as any },
        1: { cellWidth: 116, fontStyle: "bold" },
        2: { cellWidth: 62 },
        3: { cellWidth: 44, halign: "center" },
        4: { cellWidth: 84 },
        5: { cellWidth: 54 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index >= 6) {
          data.cell.styles.halign = "center";
          const txt = String(data.cell.raw);
          const meta = ["P", "J", "F", "N"].includes(txt)
            ? statusMeta(({ P: "presente", J: "justificado", F: "falta", N: "nao_compareceu" } as any)[txt])
            : null;
          if (meta) data.cell.styles.textColor = meta.hex as any;
          data.cell.styles.fontStyle = "bold";
        }
      },
      margin: { left: 28, right: 28, top: 40 },
      didDrawPage: () => {
        doc.setDrawColor(...VERDE_SOFT);
        doc.line(28, H - 34, W - 28, H - 34);
        doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...VERDE);
        doc.text("ESPAÇO PROGREDIR", 28, H - 22);
        doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED);
        doc.text("Sistema de Gestão de Beneficiários", 28, H - 12);
        doc.text(`Emitido em ${nowStamp()}`, W / 2, H - 16, { align: "center" });
        doc.text(`Página ${doc.getNumberOfPages()}`, W - 28, H - 16, { align: "right" });
      },
    });

    // Legenda + assinaturas
    let ay = (doc as any).lastAutoTable.finalY + 24;
    if (ay > H - 120) { doc.addPage(); ay = 80; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text("LEGENDA:  P = Presente   ·   J = Justificado   ·   F = Falta   ·   N = Não compareceu", 28, ay);
    ay += 46;
    const sigW = (W - 56 - 40) / 3;
    ["Educador Responsável", "Coordenação", "Direção"].forEach((lbl, i) => {
      const x = 28 + i * (sigW + 20);
      doc.setDrawColor(...INK);
      doc.line(x, ay, x + sigW, ay);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...INK);
      doc.text(lbl, x + sigW / 2, ay + 14, { align: "center" });
    });

    download(doc.output("blob"), nomeArquivo(l, "pdf"));
    toast.success("PDF institucional gerado");
  } catch (e: any) {
    console.error(e); toast.error(`Erro ao gerar PDF: ${e?.message ?? e}`);
  }
}

/* ======================= Excel ======================= */
export function exportarPresencaXlsx(l: ListaPresenca, escopo: EscopoImpressao = "completa") {
  try {
    const parts = filtrarParticipantes(l, escopo);
    const dias = diasUteis(l.mes, l.ano);
    const st = estatisticas(parts, l.marcacoes, dias);

    const thin = { style: "thin", color: { rgb: "CBD9CF" } };
    const border = { top: thin, bottom: thin, left: thin, right: thin };
    const headStyle = {
      font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
      fill: { patternType: "solid", fgColor: { rgb: VERDE_HEX } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border,
    };

    const titulo = [
      ["ESPAÇO PROGREDIR — LISTA DE PRESENÇA"],
      [`${MESES[l.mes - 1]}/${l.ano}  ·  ${ESCOPO_LABEL[escopo]}`],
      [`Projeto: ${l.projeto || "—"}   Turma: ${l.turma || "—"}   Turno: ${l.turno || "—"}   Educador: ${l.educador || "—"}`],
      [`Emitido em ${nowStamp()}  ·  Total de alunos: ${parts.length}  ·  Frequência geral: ${st.frequencia}%`],
      [],
    ];
    const header = ["Nº", "Nome completo", "CPF / Documento", "Data de nascimento", "Responsável", "Telefone",
      ...dias.map((d) => `${String(d).padStart(2, "0")} ${diaSemanaCurto(d, l.mes, l.ano)}`)];
    const body = parts.map((p, i) => [
      i + 1, p.nome, p.cpf || "", fmtData(p.data_nascimento), p.responsavel || "", p.telefone || "",
      ...dias.map((d) => statusMeta(l.marcacoes?.[p.id]?.[String(d)]).short),
    ]);

    const aoa = [...titulo, header, ...body, [], ["", "Educador Responsável", "", "Coordenação", "", "Direção"]];
    const ws = XLSXS.utils.aoa_to_sheet(aoa);
    const headRow = titulo.length;

    ws["A1"].s = { font: { bold: true, sz: 15, color: { rgb: VERDE_HEX } } };
    ws["A2"].s = { font: { bold: true, sz: 11, color: { rgb: "1A221E" } } };
    ws["A3"].s = { font: { sz: 10, color: { rgb: "6E7A73" } } };
    ws["A4"].s = { font: { italic: true, sz: 9, color: { rgb: "6E7A73" } } };

    for (let c = 0; c < header.length; c++) {
      const a = XLSXS.utils.encode_cell({ r: headRow, c });
      if (ws[a]) ws[a].s = headStyle;
    }
    body.forEach((_, ri) => {
      const r = headRow + 1 + ri;
      for (let c = 0; c < header.length; c++) {
        const a = XLSXS.utils.encode_cell({ r, c });
        if (!ws[a]) continue;
        const zebra = ri % 2 === 1 ? { patternType: "solid", fgColor: { rgb: "F5FAF7" } } : undefined;
        const isDia = c >= 6;
        const meta = isDia ? statusMeta(({ P: "presente", J: "justificado", F: "falta", N: "nao_compareceu" } as any)[String(ws[a].v)]) : null;
        ws[a].s = {
          font: { sz: 9, bold: c === 1 || isDia, color: { rgb: isDia && meta ? meta.hex.replace("#", "").toUpperCase() : "1A221E" } },
          alignment: { horizontal: c === 0 || c === 3 || isDia ? "center" : "left", vertical: "center" },
          fill: isDia && meta ? { patternType: "solid", fgColor: { rgb: meta.fill } } : zebra,
          border,
        };
      }
    });
    const sigRow = aoa.length - 1;
    [1, 3, 5].forEach((c) => {
      const a = XLSXS.utils.encode_cell({ r: sigRow, c });
      if (ws[a]) ws[a].s = { font: { bold: true, sz: 9 }, alignment: { horizontal: "center" }, border: { top: { style: "thin", color: { rgb: "1A221E" } } } };
    });

    ws["!cols"] = [{ wch: 5 }, { wch: 34 }, { wch: 18 }, { wch: 14 }, { wch: 26 }, { wch: 16 }, ...dias.map(() => ({ wch: 5 }))];
    ws["!rows"] = [{ hpt: 22 }, { hpt: 16 }, { hpt: 14 }, { hpt: 14 }, { hpt: 6 }, { hpt: 30 }];
    ws["!freeze"] = { xSplit: 2, ySplit: headRow + 1 } as any;
    ws["!autofilter"] = { ref: `A${headRow + 1}:${XLSXS.utils.encode_col(header.length - 1)}${headRow + 1}` };
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 9 } },
    ];
    (ws as any)["!printHeader"] = [headRow + 1, headRow + 1];
    (ws as any)["!margins"] = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
    (ws as any)["!pageSetup"] = { orientation: "landscape", paperSize: 9, fitToWidth: 1, fitToHeight: 0 };

    // Aba resumo
    const resumo = XLSXS.utils.aoa_to_sheet([
      ["Indicador", "Valor"],
      ["Beneficiários", st.beneficiarios],
      ["Presenças", st.presente],
      ["Faltas", st.falta],
      ["Justificados", st.justificado],
      ["Não compareceu", st.nao],
      ["Frequência geral (%)", st.frequencia],
      [],
      ["Dias úteis no mês", dias.length],
      ["Emitido em", nowStamp()],
    ]);
    resumo["!cols"] = [{ wch: 26 }, { wch: 22 }];
    ["A1", "B1"].forEach((a) => { if (resumo[a]) resumo[a].s = headStyle; });

    const wb = XLSXS.utils.book_new();
    XLSXS.utils.book_append_sheet(wb, ws, "Lista de Presença");
    XLSXS.utils.book_append_sheet(wb, resumo, "Resumo");
    const buf = XLSXS.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
    download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), nomeArquivo(l, "xlsx"));
    toast.success(`Excel gerado com ${parts.length} aluno(s)`);
  } catch (e: any) {
    console.error(e); toast.error(`Erro ao gerar Excel: ${e?.message ?? e}`);
  }
}

/* ======================= Word ======================= */
export async function exportarPresencaDocx(l: ListaPresenca, escopo: EscopoImpressao = "completa") {
  try {
    const parts = filtrarParticipantes(l, escopo);
    const dias = diasUteis(l.mes, l.ano);
    const st = estatisticas(parts, l.marcacoes, dias);
    const b = { style: BorderStyle.SINGLE, size: 4, color: "CBD9CF" };
    const borders = { top: b, bottom: b, left: b, right: b };
    const cell = (text: string, opts: { bold?: boolean; fill?: string; color?: string; width?: number } = {}) =>
      new TableCell({
        borders,
        width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
        shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text, bold: opts.bold, color: opts.color ?? "1A221E", size: 14 })],
        })],
      });

    const children: any[] = [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ESPAÇO PROGREDIR", bold: true, size: 34, color: VERDE_HEX })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Acreditando na vida · Sistema de Gestão de Beneficiários", size: 18, color: "6E7A73" })] }),
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: AMARELO_HEX, space: 4 } },
        children: [new TextRun({ text: "LISTA DE PRESENÇA", bold: true, size: 26 })],
      }),
      new Paragraph({ children: [new TextRun({ text: cabecalhoInfo(l).map(([k, v]) => `${k}: ${v}`).join("    |    "), size: 18 })] }),
      new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: `${ESCOPO_LABEL[escopo]} · ${parts.length} aluno(s) · Frequência geral ${st.frequencia}% · Emitido em ${nowStamp()}`, italics: true, size: 16, color: "6E7A73" })] }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: ["Nº", "Nome completo", "CPF / Doc.", "Nascimento", "Responsável", "Telefone", ...dias.map((d) => String(d).padStart(2, "0"))]
              .map((h) => cell(h, { bold: true, fill: VERDE_HEX, color: "FFFFFF" })),
          }),
          ...parts.map((p, i) => new TableRow({
            children: [
              cell(String(i + 1)), cell(p.nome, { bold: true }), cell(p.cpf || "—"),
              cell(fmtData(p.data_nascimento) || "—"), cell(p.responsavel || "—"), cell(p.telefone || "—"),
              ...dias.map((d) => {
                const m = statusMeta(l.marcacoes?.[p.id]?.[String(d)]);
                return cell(m.short, { bold: true, color: m.hex.replace("#", "").toUpperCase(), fill: m.fill });
              }),
            ],
          })),
        ],
      }),
      new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: "Legenda: P = Presente · J = Justificado · F = Falta · N = Não compareceu", size: 16, color: "6E7A73" })] }),
      new Paragraph({ spacing: { before: 600 }, children: [new TextRun({ text: "___________________________          ___________________________          ___________________________", size: 18 })] }),
      new Paragraph({ children: [new TextRun({ text: "  Educador Responsável                         Coordenação                                   Direção", size: 16, bold: true })] }),
    ];

    const doc = new Document({
      styles: { default: { document: { run: { font: "Arial", size: 20 } } } },
      sections: [{
        properties: {
          page: {
            size: { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children,
      }],
    });
    download(await Packer.toBlob(doc), nomeArquivo(l, "docx"));
    toast.success("Word editável gerado");
  } catch (e: any) {
    console.error(e); toast.error(`Erro ao gerar Word: ${e?.message ?? e}`);
  }
}

/* ======================= Impressão ======================= */
export async function imprimirPresenca(l: ListaPresenca, escopo: EscopoImpressao = "completa") {
  const parts = filtrarParticipantes(l, escopo);
  const dias = diasUteis(l.mes, l.ano);
  const st = estatisticas(parts, l.marcacoes, dias);
  const logo = await logoData();
  const esc = (s: any) => String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Lista de Presença ${esc(MESES[l.mes - 1])}/${l.ano}</title>
<style>
@page { size: A4 landscape; margin: 10mm; }
*{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#1a221e;margin:0}
.hd{display:flex;align-items:center;gap:14px;background:#0f7a3d;color:#fff;padding:14px 18px;border-radius:12px 12px 0 0}
.hd img{width:54px;height:54px;border-radius:50%;background:#fff;object-fit:cover;padding:3px}
.stripe{height:5px;background:#f2b705}
h1{font-size:17px;margin:0;letter-spacing:.5px} .sub{font-size:11px;opacity:.85;margin-top:2px}
h2{font-size:13px;margin:0;font-weight:700}
.meta{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}
.meta span{background:#e9f7ee;color:#0f7a3d;border:1px solid #cbe6d6;border-radius:999px;padding:4px 10px;font-size:10px;font-weight:700}
table{width:100%;border-collapse:collapse;font-size:8.5px}
th{background:#0f7a3d;color:#fff;padding:4px 3px;border:1px solid #cbd9cf;font-size:8px}
td{border:1px solid #dde8e1;padding:3px;text-align:center}
td.l{text-align:left} tbody tr:nth-child(even){background:#f6fbf8}
.sig{display:flex;gap:30px;margin-top:46px}
.sig div{flex:1;border-top:1px solid #1a221e;text-align:center;padding-top:5px;font-size:10px;font-weight:700}
.ft{margin-top:14px;border-top:1px solid #cbe6d6;padding-top:6px;display:flex;justify-content:space-between;font-size:9px;color:#6e7a73}
</style></head><body>
<div class="hd">${logo ? `<img src="${logo}" alt="Espaço Progredir">` : ""}
<div><h1>ESPAÇO PROGREDIR</h1><div class="sub">Acreditando na vida · Sistema de Gestão de Beneficiários</div>
<h2 style="margin-top:6px">LISTA DE PRESENÇA</h2></div></div><div class="stripe"></div>
<div class="meta">
${cabecalhoInfo(l).map(([k, v]) => `<span>${esc(k)}: ${esc(v)}</span>`).join("")}
<span>${esc(ESCOPO_LABEL[escopo])}</span><span>Alunos: ${parts.length}</span><span>Frequência: ${st.frequencia}%</span></div>
<table><thead><tr><th>Nº</th><th>Nome completo</th><th>CPF / Doc.</th><th>Nasc.</th><th>Responsável</th><th>Telefone</th>
${dias.map((d) => `<th>${String(d).padStart(2, "0")}<br>${diaSemanaCurto(d, l.mes, l.ano)}</th>`).join("")}</tr></thead><tbody>
${parts.map((p, i) => `<tr><td>${i + 1}</td><td class="l"><b>${esc(p.nome)}</b></td><td>${esc(p.cpf || "—")}</td>
<td>${esc(fmtData(p.data_nascimento) || "—")}</td><td class="l">${esc(p.responsavel || "—")}</td><td>${esc(p.telefone || "—")}</td>
${dias.map((d) => { const m = statusMeta(l.marcacoes?.[p.id]?.[String(d)]); return `<td style="color:${m.hex};background:#${m.fill};font-weight:700">${m.short}</td>`; }).join("")}</tr>`).join("")}
</tbody></table>
<p style="font-size:9px;color:#6e7a73">Legenda: P = Presente · J = Justificado · F = Falta · N = Não compareceu</p>
<div class="sig"><div>Educador Responsável</div><div>Coordenação</div><div>Direção</div></div>
<div class="ft"><span><b>ESPAÇO PROGREDIR</b> · Sistema de Gestão de Beneficiários</span><span>Emitido em ${esc(nowStamp())}</span></div>
<script>window.onload=()=>{setTimeout(()=>window.print(),300)}</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { toast.error("Permita pop-ups para imprimir"); return; }
  w.document.write(html);
  w.document.close();
}
