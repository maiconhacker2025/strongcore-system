import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Download, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/importar")({
  component: () => <AppShell><ImportPage /></AppShell>,
  head: () => ({ meta: [{ title: "Importação em massa · Beneficiários" }] }),
});

// Mapa de aliases (cabeçalho na planilha -> coluna do banco)
const ALIASES: Record<string, string> = {
  "nome": "nome", "nome completo": "nome",
  "codigo": "codigo", "código": "codigo",
  "cpf": "cpf", "rg": "rg",
  "data de nascimento": "data_nascimento", "nascimento": "data_nascimento", "data_nascimento": "data_nascimento",
  "genero": "genero", "gênero": "genero", "sexo": "genero",
  "classe de risco": "classe_risco", "risco": "classe_risco",
  "ativo": "ativo",
  "whatsapp": "whatsapp", "celular": "celular", "residencial": "residencial", "email": "email", "e-mail": "email",
  "rua": "rua", "endereco": "rua", "endereço": "rua",
  "bairro": "bairro", "cep": "cep", "estado": "estado", "pais": "pais", "país": "pais",
  "escola": "escola", "escolaridade": "escolaridade", "turno": "turno",
  "responsavel": "responsavel", "responsável": "responsavel",
  "nome do responsavel": "nome_responsavel", "nome do responsável": "nome_responsavel",
  "telefone do responsavel": "tel_responsavel", "telefone do responsável": "tel_responsavel", "tel responsavel": "tel_responsavel",
  "nome da mae": "nome_mae", "nome da mãe": "nome_mae",
  "nome do pai": "nome_pai",
  "assistente social": "assistente_social", "psicologa": "psicologa", "psicóloga": "psicologa",
  "observacoes": "observacoes", "observações": "observacoes", "obs": "observacoes",
};

const normalize = (s: string) => s.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function coerceValue(col: string, raw: any): any {
  if (raw === null || raw === undefined || raw === "") return null;
  if (col === "codigo") { const n = Number(raw); return isNaN(n) ? null : n; }
  if (col === "ativo") {
    const s = String(raw).toLowerCase();
    return ["sim", "true", "1", "ativo", "yes"].includes(s);
  }
  if (col.startsWith("data_") || col.startsWith("nasc_")) {
    // Excel date serial ou string
    if (typeof raw === "number") {
      const d = XLSX.SSF.parse_date_code(raw);
      if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
    const s = String(raw);
    // dd/mm/yyyy
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      const [, d, mo, y] = m;
      const yy = y.length === 2 ? `20${y}` : y;
      return `${yy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return null;
  }
  return String(raw).trim();
}

function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [mapped, setMapped] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [unmapped, setUnmapped] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ inserted: number; updated: number; failed: number } | null>(null);

  const onFile = async (f: File) => {
    setResult(null);
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
    if (!json.length) { toast.error("Planilha vazia"); return; }
    const cols = Object.keys(json[0]);
    setHeaders(cols);
    const un: string[] = [];
    const map: Record<string, string> = {};
    cols.forEach((c) => {
      const key = ALIASES[normalize(c)];
      if (key) map[c] = key; else un.push(c);
    });
    setUnmapped(un);

    const errs: string[] = [];
    const converted = json.map((row, i) => {
      const out: any = {};
      for (const [src, dst] of Object.entries(map)) {
        out[dst] = coerceValue(dst, row[src]);
      }
      if (!out.nome) errs.push(`Linha ${i + 2}: nome vazio (obrigatório)`);
      return out;
    }).filter((r) => r.nome);
    setRows(json);
    setMapped(converted);
    setErrors(errs);
    toast.success(`${converted.length} linha(s) prontas para importar`);
  };

  const runImport = async () => {
    setBusy(true);
    let inserted = 0, updated = 0, failed = 0;
    // upsert em lotes de 100, chave codigo (quando existir) ou nome
    const chunks: any[][] = [];
    for (let i = 0; i < mapped.length; i += 100) chunks.push(mapped.slice(i, i + 100));
    for (const chunk of chunks) {
      // Separar em: com código (upsert por codigo) x sem código (insert)
      const withCode = chunk.filter((r) => r.codigo != null);
      const noCode = chunk.filter((r) => r.codigo == null);
      if (withCode.length) {
        const { error, count } = await supabase.from("beneficiarios").upsert(withCode, { onConflict: "codigo", count: "exact" });
        if (error) { failed += withCode.length; toast.error(error.message); }
        else updated += count ?? withCode.length;
      }
      if (noCode.length) {
        const { error, count } = await supabase.from("beneficiarios").insert(noCode, { count: "exact" });
        if (error) { failed += noCode.length; toast.error(error.message); }
        else inserted += count ?? noCode.length;
      }
    }
    setResult({ inserted, updated, failed });
    setBusy(false);
    toast.success("Importação finalizada");
  };

  const downloadTemplate = () => {
    const cols = ["nome", "codigo", "cpf", "rg", "data_nascimento", "genero", "classe_risco", "ativo",
      "whatsapp", "celular", "email", "rua", "bairro", "cep", "estado", "escola", "escolaridade", "turno",
      "responsavel", "nome_responsavel", "tel_responsavel", "nome_mae", "nome_pai", "assistente_social", "psicologa", "observacoes"];
    const ws = XLSX.utils.aoa_to_sheet([cols, ["Exemplo Silva", 999, "", "", "2015-03-20", "F", "Médio", "Sim", "31999999999", "", "", "Rua X", "Centro", "", "MG", "Escola Y", "Fundamental I", "Manhã", "Mãe", "Maria", "31988888888", "Maria", "", "", "", ""]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "modelo-beneficiarios.xlsx");
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <FileSpreadsheet className="size-8 text-teal-700" /> Importação em massa
        </h1>
        <p className="text-muted-foreground mt-1">
          Envie uma planilha (Excel ou CSV) para cadastrar e atualizar vários beneficiários de uma vez.
          Linhas com <b>código</b> já existente são atualizadas; as novas são inseridas.
        </p>
      </header>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <input
              ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> Escolher planilha
            </Button>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="size-4" /> Baixar modelo
            </Button>
          </div>
          {mapped.length > 0 && (
            <Button size="lg" onClick={runImport} disabled={busy || mapped.length === 0}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Importar {mapped.length} linha(s)
            </Button>
          )}
        </div>
      </Card>

      {headers.length > 0 && (
        <Card className="p-6">
          <h3 className="font-display font-semibold mb-3">Mapeamento das colunas</h3>
          <div className="flex flex-wrap gap-2">
            {headers.map((h) => {
              const dst = ALIASES[normalize(h)];
              return (
                <span
                  key={h}
                  className={`text-xs px-2.5 py-1 rounded-full border ${dst ? "bg-teal-50 border-teal-300 text-teal-800" : "bg-amber-50 border-amber-300 text-amber-800"}`}
                >
                  {h} {dst ? `→ ${dst}` : "(ignorado)"}
                </span>
              );
            })}
          </div>
          {unmapped.length > 0 && (
            <p className="text-xs text-amber-700 mt-3 flex items-center gap-1">
              <AlertCircle className="size-3.5" /> {unmapped.length} coluna(s) não reconhecida(s) serão ignoradas.
            </p>
          )}
        </Card>
      )}

      {errors.length > 0 && (
        <Card className="p-6 border-destructive/40">
          <h3 className="font-display font-semibold mb-2 text-destructive flex items-center gap-2">
            <XCircle className="size-4" /> Avisos
          </h3>
          <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
            {errors.slice(0, 20).map((e, i) => <li key={i} className="text-muted-foreground">• {e}</li>)}
          </ul>
        </Card>
      )}

      {mapped.length > 0 && (
        <Card className="p-6">
          <h3 className="font-display font-semibold mb-3">Prévia ({Math.min(10, mapped.length)} de {mapped.length})</h3>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead className="bg-muted/50">
                <tr>
                  {["nome", "codigo", "data_nascimento", "escola", "responsavel", "whatsapp"].map((c) => (
                    <th key={c} className="text-left p-2 border-b">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mapped.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-b">
                    {["nome", "codigo", "data_nascimento", "escola", "responsavel", "whatsapp"].map((c) => (
                      <td key={c} className="p-2">{r[c] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {result && (
        <Card className="p-6 bg-emerald-50 border-emerald-200">
          <h3 className="font-display font-semibold text-emerald-800 mb-2 flex items-center gap-2">
            <CheckCircle2 className="size-5" /> Importação concluída
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><p className="text-3xl font-bold text-emerald-700">{result.inserted}</p><p className="text-xs text-muted-foreground">Inseridos</p></div>
            <div><p className="text-3xl font-bold text-teal-700">{result.updated}</p><p className="text-xs text-muted-foreground">Atualizados</p></div>
            <div><p className="text-3xl font-bold text-destructive">{result.failed}</p><p className="text-xs text-muted-foreground">Falharam</p></div>
          </div>
        </Card>
      )}
    </div>
  );
}
