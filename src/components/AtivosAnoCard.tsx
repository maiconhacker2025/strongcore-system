import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Loader2, Download, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { exportAtivosAnoXlsx } from "@/lib/report-ativos-ano";
import { logReport } from "@/lib/reports-admin";

const ANOS = [2025, 2026];

export function AtivosAnoCard() {
  const [ano, setAno] = useState<number>(2026);

  const run = useMutation({
    mutationFn: async (y: number) => {
      const total = await exportAtivosAnoXlsx(y);
      await logReport({
        kind: "template",
        title: `Beneficiários Ativos - ${y}`,
        row_count: total,
        export_format: "xlsx",
      }).catch(() => {});
      return total;
    },
    onSuccess: (total) => toast.success(`Planilha gerada com ${total} beneficiário(s)`),
    onError: (e: any) => toast.error(`Erro ao gerar planilha: ${e?.message ?? e}`),
  });

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
              <FileSpreadsheet className="size-3" /> Excel
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Planilha oficial com <b>Nome Completo</b> e <b>Documento</b> (CPF → RG → Certidão),
            em ordem alfabética, formatada para envio à prefeitura e parceiros.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {ANOS.map((y) => (
              <button
                key={y}
                onClick={() => setAno(y)}
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
              onClick={() => run.mutate(ano)}
              disabled={run.isPending}
              className="gap-2 ml-auto"
            >
              {run.isPending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Exportar Excel
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Arquivo: <span className="font-mono">Beneficiarios_Ativos_{ano}.xlsx</span>
          </p>
        </div>
      </div>
    </Card>
  );
}
