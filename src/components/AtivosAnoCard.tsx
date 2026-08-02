import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileSpreadsheet, Loader2, Download, CalendarCheck, Search, ShieldCheck,
  AlertTriangle, Copy, FileDown, Users, Sparkles, BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  exportAtivosAnoXlsx, exportAtivosAnoCsv, copyAtivosAnoLista,
  fetchAtivosAno, auditar, type AtivosAnoResult,
} from "@/lib/report-ativos-ano";
import { logReport } from "@/lib/reports-admin";

const NOW = new Date().getFullYear();
const ANOS = [NOW - 1, NOW, NOW + 1];

export function AtivosAnoCard() {
  const [ano, setAno] = useState<number>(NOW);
  const [res, setRes] = useState<AtivosAnoResult | null>(null);
  const [q, setQ] = useState("");

  const aud = useMemo(() => (res ? auditar(res) : null), [res]);

  const analisar = useMutation({
    mutationFn: (y: number) => fetchAtivosAno(y),
    onSuccess: (r) => {
      setRes(r);
      toast.success(`${r.rows.length} beneficiário(s) ativos em ${r.ano}`);
    },
    onError: (e: any) => toast.error(`Erro ao analisar: ${e?.message ?? e}`),
  });

  const exportar = useMutation({
    mutationFn: async (fmt: "xlsx" | "csv" | "copy") => {
      const r = res ?? (await fetchAtivosAno(ano));
      if (!res) setRes(r);
      const total =
        fmt === "xlsx"
          ? await exportAtivosAnoXlsx(r.ano, r)
          : fmt === "csv"
            ? exportAtivosAnoCsv(r)
            : await copyAtivosAnoLista(r);
      await logReport({
        kind: "template",
        title: `Beneficiários Ativos - ${r.ano}`,
        row_count: total,
        export_format: fmt,
      }).catch(() => {});
      return { fmt, total };
    },
    onSuccess: ({ fmt, total }) =>
      toast.success(
        fmt === "copy"
          ? `${total} nome(s) copiados para a área de transferência`
          : `Arquivo gerado com ${total} beneficiário(s)`,
      ),
    onError: (e: any) => toast.error(`Erro ao exportar: ${e?.message ?? e}`),
  });

  const selecionar = (y: number) => {
    setAno(y);
    setRes(null);
    setQ("");
  };

  const filtradas = useMemo(() => {
    if (!res) return [];
    const t = q.trim().toLowerCase();
    const base = res.rows;
    return t
      ? base.filter((r) => r.nome.toLowerCase().includes(t) || r.documento.toLowerCase().includes(t))
      : base;
  }, [res, q]);

  const busy = analisar.isPending || exportar.isPending;

  return (
    <Card className="p-6 md:p-7 bg-card border-border">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-primary-soft text-primary p-3 shrink-0">
          <CalendarCheck className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-xl font-semibold text-foreground">
              Beneficiários Ativos por Ano
            </h3>
            <Badge variant="secondary" className="gap-1">
              <FileSpreadsheet className="size-3" /> Excel · 4 abas
            </Badge>
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="size-3" /> Auditoria
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Lista oficial (<b>Nome</b> + <b>Documento</b>: CPF → RG → Certidão) com
            conferência automática antes de enviar: CPF validado por dígito verificador,
            duplicidades de nome, pendências documentais e comparativo com o ano anterior.
          </p>

          {/* Ano + ações */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {ANOS.map((y) => (
              <button
                key={y}
                onClick={() => selecionar(y)}
                className={cn(
                  "rounded-xl border px-4 py-2 text-sm font-medium transition-all",
                  ano === y
                    ? "border-primary bg-primary-soft/50 text-primary shadow-[var(--shadow-soft)]"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40",
                )}
              >
                Ativos {y}
              </button>
            ))}
            <Button
              variant="outline"
              onClick={() => analisar.mutate(ano)}
              disabled={busy}
              className="gap-2"
            >
              {analisar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Conferir antes de enviar
            </Button>
            <Button onClick={() => exportar.mutate("xlsx")} disabled={busy} className="gap-2 ml-auto">
              {exportar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Exportar Excel
            </Button>
          </div>

          {/* Painel de conferência */}
          {res && aud && (
            <div className="mt-5 rounded-2xl border border-border bg-background/60 p-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Kpi icon={Users} label={`Ativos em ${res.ano}`} value={res.rows.length} />
                <Kpi
                  icon={BadgeCheck}
                  label="Completude documental"
                  value={`${aud.score}%`}
                  tone={aud.score >= 95 ? "ok" : aud.score >= 80 ? "warn" : "bad"}
                />
                <Kpi
                  icon={AlertTriangle}
                  label="Pendências"
                  value={aud.semDocumento.length + aud.cpfInvalido.length + aud.duplicados.length}
                  tone={
                    aud.semDocumento.length + aud.cpfInvalido.length + aud.duplicados.length === 0
                      ? "ok"
                      : "warn"
                  }
                />
                <Kpi icon={Sparkles} label={`Novos vs ${res.anterior.ano}`} value={aud.novos.length} />
              </div>

              <div className="flex flex-wrap gap-1.5 text-xs">
                <Flag n={aud.semDocumento.length} label="sem documento" />
                <Flag n={aud.cpfInvalido.length} label="CPF inválido" />
                <Flag n={aud.duplicados.length} label="possível duplicidade" />
                <Flag n={aud.semNascimento.length} label="sem data de nascimento" />
              </div>

              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar nome ou documento na lista…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              <div className="max-h-72 overflow-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2 w-10">#</th>
                      <th className="px-3 py-2">Nome</th>
                      <th className="px-3 py-2">Documento</th>
                      <th className="px-3 py-2 hidden sm:table-cell">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtradas.slice(0, 200).map((r, i) => {
                      const alert = r.tipo === "Ausente" || r.cpfInvalido || r.duplicado;
                      return (
                        <tr
                          key={`${r.nome}-${i}`}
                          className={cn("border-t border-border", alert && "bg-amber-500/10")}
                        >
                          <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-1.5 font-medium text-foreground">
                            {r.nome}
                            {r.duplicado && (
                              <Badge variant="outline" className="ml-2 text-[10px]">duplicado?</Badge>
                            )}
                          </td>
                          <td className="px-3 py-1.5">
                            <span className={cn(r.tipo === "Ausente" && "text-muted-foreground italic")}>
                              {r.documento}
                            </span>
                            {r.cpfInvalido && (
                              <Badge variant="destructive" className="ml-2 text-[10px]">CPF inválido</Badge>
                            )}
                          </td>
                          <td className="px-3 py-1.5 hidden sm:table-cell text-muted-foreground">
                            {r.situacao}
                          </td>
                        </tr>
                      );
                    })}
                    {filtradas.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                          Nenhum registro encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filtradas.length > 200 && (
                <p className="text-xs text-muted-foreground">
                  Mostrando os 200 primeiros de {filtradas.length}. O arquivo exportado traz a lista completa.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => exportar.mutate("csv")} disabled={busy}>
                  <FileDown className="size-4" /> CSV
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => exportar.mutate("copy")} disabled={busy}>
                  <Copy className="size-4" /> Copiar lista
                </Button>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-3">
            Arquivo: <span className="font-mono">Beneficiarios_Ativos_{ano}.xlsx</span> — abas:
            Ativos, Resumo, Pendências e Novos {ano}.
          </p>
        </div>
      </div>
    </Card>
  );
}

function Kpi({
  icon: Icon, label, value, tone = "neutral",
}: { icon: any; label: string; value: number | string; tone?: "neutral" | "ok" | "warn" | "bad" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="truncate">{label}</span>
      </div>
      <p
        className={cn(
          "font-display text-2xl font-bold mt-1",
          tone === "ok" && "text-emerald-600",
          tone === "warn" && "text-amber-600",
          tone === "bad" && "text-destructive",
          tone === "neutral" && "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Flag({ n, label }: { n: number; label: string }) {
  return (
    <Badge variant={n > 0 ? "outline" : "secondary"} className={cn("gap-1", n > 0 && "border-amber-500/50 text-amber-700")}>
      {n} {label}
    </Badge>
  );
}
