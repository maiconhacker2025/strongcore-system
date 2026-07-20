import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Sparkles, FileText, FileSpreadsheet, FileType2, Filter, Loader2,
  LayoutDashboard, UserCheck, UserMinus, GraduationCap, School, Clock,
  MapPin, ShieldAlert, Users as UsersIcon, Cake, PartyPopper, LogIn, LogOut,
  Pill, AlertTriangle, Phone, ArrowRight, X, ChevronRight,
  Bot, Settings2, History, Trash2, ShieldCheck, Bookmark, BookmarkPlus, Save,
  Columns3, Search as SearchIcon, RotateCcw,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { REPORT_TEMPLATES, type ReportTemplate, type ReportFilters, getTemplate } from "@/lib/reports";
import type { FullReport } from "@/lib/reports-export";
import { exportReportPdf, exportReportXlsx, exportReportDocx } from "@/lib/reports-export";
import {
  getReportSettings, updateReportSettings, logReport,
  listReportLogs, deleteReportLog, clearReportLogs, countAiToday,
} from "@/lib/reports-admin";
import {
  listReportViews, createReportView, updateReportView, deleteReportView,
  type ReportView,
} from "@/lib/report-views";
import { COLUMN_GROUPS, COLUMN_LABELS, COLUMN_PRESETS } from "@/lib/report-columns";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/relatorios")({
  component: () => <AppShell><RelatoriosPage /></AppShell>,
});


const ICONS: Record<string, any> = {
  "layout-dashboard": LayoutDashboard, "user-check": UserCheck, "user-minus": UserMinus,
  "graduation-cap": GraduationCap, school: School, clock: Clock, "map-pin": MapPin,
  "shield-alert": ShieldAlert, users: UsersIcon, cake: Cake, "party-popper": PartyPopper,
  "log-in": LogIn, "log-out": LogOut, pill: Pill, "alert-triangle": AlertTriangle, phone: Phone,
};

const CATEGORY_LABEL: Record<string, string> = {
  geral: "Visão geral", escolar: "Educação", saude: "Saúde",
  familia: "Família & contatos", movimento: "Movimentação",
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => String(CURRENT_YEAR - i));

function RelatoriosPage() {
  const [tab, setTab] = useState<"modelos" | "config" | "logs">("modelos");
  const [selectedId, setSelectedId] = useState<string>("panorama");
  const [filters, setFilters] = useState<ReportFilters>({ status: "todos" });
  const [report, setReport] = useState<FullReport | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [customCols, setCustomCols] = useState<string[] | null>(null);

  const selected = useMemo(() => getTemplate(selectedId)!, [selectedId]);

  const gen = useMutation({
    mutationFn: async (t: ReportTemplate) => {
      const r = await t.build(filters);
      if (customCols && customCols.length > 0) {
        r.columns = customCols;
      }
      await logReport({
        kind: "template",
        title: r.title,
        filters,
        row_count: r.rows.length,
      });
      return r;
    },
    onSuccess: (r) => setReport(r),
    onError: (e: any) => toast.error(`Erro ao gerar relatório: ${e?.message ?? e}`),
  });


  const generate = (id?: string) => {
    const t = id ? getTemplate(id) : selected;
    if (!t) return;
    setSelectedId(t.id);
    setReport(null);
    gen.mutate(t);
  };

  const activeFilterCount =
    (filters.status && filters.status !== "todos" ? 1 : 0) +
    (filters.risco ? 1 : 0) + (filters.genero ? 1 : 0) +
    (filters.escolaridade ? 1 : 0) + (filters.bairro ? 1 : 0) +
    (filters.escola ? 1 : 0) + (filters.turno ? 1 : 0) +
    (filters.ingressoAno ? 1 : 0) + (filters.desligamentoAno ? 1 : 0) +
    (filters.idadeMin ? 1 : 0) + (filters.idadeMax ? 1 : 0) +
    (filters.medicacao ? 1 : 0) + (filters.alergia ? 1 : 0) +
    (filters.aniversarioMes ? 1 : 0);

  const grouped = useMemo(() => {
    const map = new Map<string, ReportTemplate[]>();
    REPORT_TEMPLATES.forEach((t) => {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category)!.push(t);
    });
    return Array.from(map.entries());
  }, []);

  return (
    <div className="min-h-full bg-background">
      {/* Editorial header */}
      <header className="border-b border-border bg-card">
        <div className="px-6 md:px-10 py-8">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6 sm:flex sm:flex-wrap sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                <Sparkles className="size-3.5 text-primary" />
                <span>Central de Relatórios</span>
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Relatórios institucionais
              </h1>
              <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
                Modelos prontos com filtros avançados. Exporte em PDF, Excel ou Word — com ou sem IA.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {tab === "modelos" && (
                <>
                  <ViewsMenu
                    templateId={selectedId}
                    filters={filters}
                    onApply={(v) => {
                      if (v.template_id) setSelectedId(v.template_id);
                      setFilters(v.filters);
                      toast.success(`Vista "${v.name}" aplicada`);
                    }}
                  />
                  <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Filter className="size-4" /> Filtros
                        {activeFilterCount > 0 && (
                          <Badge className="ml-1 h-5 min-w-5 px-1.5 bg-accent text-accent-foreground">
                            {activeFilterCount}
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <FiltersSheet filters={filters} setFilters={setFilters} onClose={() => setFiltersOpen(false)} />
                  </Sheet>
                  <Sheet open={columnsOpen} onOpenChange={setColumnsOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Columns3 className="size-4" /> Colunas
                        {customCols && customCols.length > 0 && (
                          <Badge className="ml-1 h-5 min-w-5 px-1.5 bg-primary text-primary-foreground">
                            {customCols.length}
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <ColumnsSheet
                      value={customCols ?? selected.columns}
                      onChange={setCustomCols}
                      onClose={() => setColumnsOpen(false)}
                      isCustom={!!customCols}
                    />
                  </Sheet>
                  <Button
                    onClick={() => generate()}
                    disabled={gen.isPending}
                    className="gap-2"
                  >
                    {gen.isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                    Gerar relatório
                  </Button>
                </>
              )}

            </div>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-6">
            <TabsList>
              <TabsTrigger value="modelos" className="gap-2"><LayoutDashboard className="size-4" /> Modelos</TabsTrigger>
              <TabsTrigger value="config" className="gap-2"><Settings2 className="size-4" /> Configurações</TabsTrigger>
              <TabsTrigger value="logs" className="gap-2"><History className="size-4" /> Histórico</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {tab === "modelos" && (
        <div className="px-6 md:px-10 py-8 grid gap-8 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Modelos disponíveis
            </div>
            <div className="space-y-6">
              {grouped.map(([cat, items]) => (
                <div key={cat}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {CATEGORY_LABEL[cat] ?? cat}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid gap-2">
                    {items.map((t) => {
                      const Icon = ICONS[t.icon] ?? FileText;
                      const active = selectedId === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => generate(t.id)}
                          className={cn(
                            "group text-left rounded-xl border p-3 transition-all",
                            active
                              ? "border-primary bg-primary-soft/40 shadow-[var(--shadow-soft)]"
                              : "bg-card border-border hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
                          )}
                        >
                          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
                            <div className={cn(
                              "shrink-0 rounded-lg p-2 border",
                              active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary text-primary border-border"
                            )}>
                              <Icon className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-foreground truncate">{t.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {t.description}
                              </p>
                            </div>
                            <ChevronRight className={cn(
                              "size-4 shrink-0 mt-1 transition-transform",
                              active ? "text-primary translate-x-0.5" : "text-muted-foreground/40 group-hover:text-muted-foreground"
                            )} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="min-w-0">
            {gen.isPending && <PreviewSkeleton title={selected.name} />}
            {!gen.isPending && !report && <EmptyPreview onGenerate={() => generate()} template={selected} />}
            {report && <ReportPreview report={report} onRegenerate={() => generate()} />}
          </section>
        </div>
      )}

      {tab === "config" && (
        <div className="px-6 md:px-10 py-8"><SettingsPanel /></div>
      )}

      {tab === "logs" && (
        <div className="px-6 md:px-10 py-8"><LogsPanel /></div>
      )}
    </div>
  );
}

/* ============ Settings panel ============ */
function SettingsPanel() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["report-settings"], queryFn: getReportSettings });
  const used = useQuery({ queryKey: ["ai-used-today"], queryFn: countAiToday });

  const save = useMutation({
    mutationFn: updateReportSettings,
    onSuccess: () => {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["report-settings"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });

  const s = settings.data;
  const [limit, setLimit] = useState<string>("");
  const currentLimit = s?.ai_daily_limit ?? 50;
  const effectiveLimit = limit === "" ? currentLimit : Number(limit);

  return (
    <div className="max-w-3xl grid gap-5">
      <Card className="p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-primary-soft text-primary p-3"><Bot className="size-5" /></div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-xl font-semibold text-foreground">Assistente de IA</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Quando desligada, a página <b>/ia</b> bloqueia novas consultas — os relatórios por modelo continuam funcionando normalmente.
            </p>
          </div>
          <Switch
            checked={!!s?.ai_enabled}
            disabled={settings.isLoading || save.isPending}
            onCheckedChange={(v) => save.mutate({ ai_enabled: v, ai_daily_limit: currentLimit })}
          />
        </div>
      </Card>

      <Card className="p-6 md:p-8">
        <div className="flex items-start gap-4 mb-5">
          <div className="rounded-xl bg-primary-soft text-primary p-3"><ShieldCheck className="size-5" /></div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-xl font-semibold text-foreground">Limite diário de consultas de IA</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Protege o orçamento de créditos. Contagem reinicia à meia-noite.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Usado hoje</p>
            <p className="font-display text-3xl font-bold text-primary mt-2 tabular-nums">{used.data ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Limite atual</p>
            <p className="font-display text-3xl font-bold text-foreground mt-2 tabular-nums">{currentLimit}</p>
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Restante</p>
            <p className="font-display text-3xl font-bold text-foreground mt-2 tabular-nums">
              {Math.max(0, currentLimit - (used.data ?? 0))}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Label>Novo limite diário</Label>
            <Input
              type="number"
              min={1}
              max={1000}
              className="mt-1.5"
              placeholder={String(currentLimit)}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </div>
          <Button
            onClick={() => save.mutate({ ai_enabled: !!s?.ai_enabled, ai_daily_limit: effectiveLimit })}
            disabled={save.isPending || !Number.isFinite(effectiveLimit) || effectiveLimit < 1}
          >
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : "Salvar limite"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ============ Logs panel ============ */
function LogsPanel() {
  const qc = useQueryClient();
  const logs = useQuery({ queryKey: ["report-logs"], queryFn: () => listReportLogs(200) });
  const del = useMutation({
    mutationFn: deleteReportLog,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["report-logs"] }),
  });
  const clearAll = useMutation({
    mutationFn: clearReportLogs,
    onSuccess: () => {
      toast.success("Histórico limpo");
      qc.invalidateQueries({ queryKey: ["report-logs"] });
    },
  });

  const rows = logs.data ?? [];
  const totalAi = rows.filter((r) => r.kind === "ai").length;
  const totalTpl = rows.filter((r) => r.kind === "template").length;
  const totalExp = rows.filter((r) => !!r.export_format).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Total</p>
          <p className="font-display text-3xl font-bold text-primary mt-2 tabular-nums">{rows.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Modelos</p>
          <p className="font-display text-3xl font-bold text-foreground mt-2 tabular-nums">{totalTpl}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Consultas IA</p>
          <p className="font-display text-3xl font-bold text-foreground mt-2 tabular-nums">{totalAi}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Exportações</p>
          <p className="font-display text-3xl font-bold text-foreground mt-2 tabular-nums">{totalExp}</p>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-background">
          <h3 className="font-display text-lg font-semibold text-foreground">
            Histórico de relatórios
            <span className="ml-2 text-sm font-normal text-muted-foreground">({rows.length})</span>
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              if (confirm("Apagar todo o histórico?")) clearAll.mutate();
            }}
            disabled={rows.length === 0 || clearAll.isPending}
          >
            <Trash2 className="size-4" /> Limpar
          </Button>
        </div>
        {logs.isLoading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            <Loader2 className="size-5 animate-spin inline mr-2" /> Carregando…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            Nenhum relatório gerado ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/60 text-muted-foreground border-b border-border">
                  <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-[0.16em]">Data</th>
                  <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-[0.16em]">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-[0.16em]">Título / Pergunta</th>
                  <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-[0.16em]">Registros</th>
                  <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-[0.16em]">Exportação</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-primary-soft/20">
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground tabular-nums">
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.kind === "ai" ? (
                        <Badge className="bg-accent/20 text-accent-foreground border-accent/40" variant="outline">
                          <Bot className="size-3 mr-1" /> IA
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-border">
                          <FileText className="size-3 mr-1" /> Modelo
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 max-w-[420px]">
                      <p className="text-foreground truncate" title={r.title}>{r.title}</p>
                      {r.question && r.question !== r.title && (
                        <p className="text-xs text-muted-foreground truncate" title={r.question}>{r.question}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-foreground">
                      {r.row_count ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.export_format ? (
                        <Badge variant="outline" className="uppercase text-[10px]">{r.export_format}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => del.mutate(r.id)}
                      >
                        <X className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}


function EmptyPreview({ onGenerate, template }: { onGenerate: () => void; template: ReportTemplate }) {
  const Icon = ICONS[template.icon] ?? FileText;
  return (
    <Card className="p-10 md:p-16 border-dashed border-2 border-border bg-card flex flex-col items-center justify-center text-center">
      <div className="rounded-2xl p-4 bg-primary-soft text-primary mb-5">
        <Icon className="size-8" />
      </div>
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
        Pré-visualização
      </div>
      <h3 className="font-display text-2xl font-semibold text-foreground">{template.name}</h3>
      <p className="text-sm text-muted-foreground max-w-md mt-2">{template.description}</p>
      <Button onClick={onGenerate} className="mt-6 gap-2">
        <ArrowRight className="size-4" /> Gerar relatório
      </Button>
      <p className="text-xs text-muted-foreground mt-4">
        Use os filtros no topo para refinar antes de gerar.
      </p>
    </Card>
  );
}

function PreviewSkeleton({ title }: { title: string }) {
  return (
    <Card className="p-8 bg-card animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <Loader2 className="size-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Gerando <b className="text-foreground">{title}</b>…</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-72 rounded-xl bg-muted" />
    </Card>
  );
}

function ReportPreview({ report, onRegenerate }: { report: FullReport; onRegenerate: () => void }) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-6 md:p-8 bg-card border-border">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-primary font-semibold mb-2">
              Relatório pronto
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              {report.title}
            </h2>
            {report.subtitle && (
              <p className="text-sm text-muted-foreground mt-1.5">{report.subtitle}</p>
            )}
            {report.filters?.length ? (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {report.filters.map((f) => (
                  <Badge key={f} variant="outline" className="border-border bg-secondary text-secondary-foreground font-normal">
                    {f}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
          <Button variant="outline" onClick={onRegenerate} className="shrink-0">Atualizar</Button>
        </div>

        {report.kpis?.length ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border">
            {report.kpis.map((k) => (
              <div key={k.label} className="rounded-xl border border-border bg-background p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                  {k.label}
                </p>
                <p className="font-display text-3xl font-bold text-primary mt-2 tabular-nums">
                  {k.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      {/* Export toolbar */}
      <Card className="p-4 md:p-5 bg-card border-border">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-lg bg-primary-soft text-primary p-2 shrink-0">
              <FileText className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Exportar relatório</p>
              <p className="text-xs text-muted-foreground">Escolha o formato ideal para compartilhar</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" onClick={() => { exportReportPdf(report); logReport({ kind: "template", title: report.title, row_count: report.rows.length, export_format: "pdf" }); }} className="gap-2">
              <FileType2 className="size-4" /> PDF
            </Button>
            <Button variant="outline" onClick={() => { exportReportXlsx(report); logReport({ kind: "template", title: report.title, row_count: report.rows.length, export_format: "xlsx" }); }} className="gap-2">
              <FileSpreadsheet className="size-4" /> Excel
            </Button>
            <Button variant="outline" onClick={() => { exportReportDocx(report); logReport({ kind: "template", title: report.title, row_count: report.rows.length, export_format: "docx" }); }} className="gap-2">
              <FileText className="size-4" /> Word
            </Button>

          </div>
        </div>
      </Card>

      {/* GroupBy */}
      {report.groupBy?.length ? (
        <Card className="p-6 md:p-8 bg-card">
          <div className="flex items-baseline justify-between gap-4 mb-5">
            <h3 className="font-display text-xl font-semibold text-foreground">Distribuição</h3>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {report.groupBy.length} categorias
            </span>
          </div>
          <GroupBar data={report.groupBy} />
        </Card>
      ) : null}

      {/* Table */}
      {report.rows.length ? (
        <Card className="p-0 overflow-hidden bg-card">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-background">
            <h3 className="font-display text-lg font-semibold text-foreground">
              Detalhamento
              <span className="ml-2 text-sm font-sans font-normal text-muted-foreground tabular-nums">
                ({report.rows.length})
              </span>
            </h3>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Ordenado por nome
            </span>
          </div>
          <div className="overflow-x-auto">
            <PreviewTable columns={report.columns} rows={report.rows.slice(0, 100)} />
          </div>
          {report.rows.length > 100 && (
            <div className="px-6 py-3 border-t border-border bg-background text-xs text-muted-foreground text-center">
              Exibindo os primeiros 100 registros — o arquivo exportado inclui todos os {report.rows.length}.
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-10 text-center text-muted-foreground">
          Nenhum beneficiário encontrado com esses filtros.
        </Card>
      )}
    </div>
  );
}

const LABELS: Record<string, string> = {
  codigo: "Código", nome: "Nome", data_nascimento: "Nascimento", idade: "Idade",
  genero: "Gênero", classe_risco: "Risco", ativo: "Status", escolaridade: "Escolaridade",
  turno: "Turno", escola: "Escola", bairro: "Bairro", responsavel: "Responsável",
  celular: "Celular", whatsapp: "WhatsApp", email: "E-mail",
  data_ingresso_01: "Ingresso", data_desligamento_01: "Desligamento",
  alergia: "Alergia", medicacao: "Medicação", observacoes: "Observações",
};
function labelOf(c: string) {
  return LABELS[c] ?? c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
function calcAge(dob: any) {
  if (!dob) return "";
  const d = new Date(String(dob));
  if (isNaN(d.getTime())) return "";
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return String(a);
}
function fmt(col: string, v: any, row: any) {
  if (col === "idade") return calcAge(row.data_nascimento);
  if (v === null || v === undefined || v === "") return "—";
  if (col === "ativo") return v ? "Ativo" : "Inativo";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (/^data_|nascimento/.test(col)) {
    const d = new Date(String(v));
    if (!isNaN(d.getTime())) return d.toLocaleDateString("pt-BR");
  }
  return String(v);
}

function PreviewTable({ columns, rows }: { columns: string[]; rows: any[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-secondary/60 text-muted-foreground border-b border-border">
          <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-[0.16em] w-10">#</th>
          {columns.map((c) => (
            <th key={c} className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-[0.16em] whitespace-nowrap">
              {labelOf(c)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-border last:border-0 hover:bg-primary-soft/20">
            <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{i + 1}</td>
            {columns.map((c) => (
              <td key={c} className="px-4 py-2.5 whitespace-nowrap text-foreground">
                {c === "ativo" ? (
                  <Badge variant="outline" className={r.ativo
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border bg-muted text-muted-foreground"
                  }>
                    {r.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                ) : c === "classe_risco" && r.classe_risco ? (
                  <Badge variant="outline" className={
                    r.classe_risco === "Alto" ? "border-destructive/40 bg-destructive/10 text-destructive" :
                    r.classe_risco === "Médio" ? "border-warning/40 bg-warning/15 text-warning-foreground" :
                    "border-success/40 bg-success/10 text-success"
                  }>{r.classe_risco}</Badge>
                ) : (
                  fmt(c, r[c], r)
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GroupBar({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  return (
    <div className="space-y-3">
      {data.slice(0, 12).map((d) => (
        <div key={d.label} className="grid grid-cols-[minmax(120px,200px)_1fr_auto] items-center gap-4">
          <span className="text-sm text-foreground truncate" title={d.label}>{d.label}</span>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
          <span className="text-sm tabular-nums font-medium text-foreground w-24 text-right">
            {d.count}{" "}
            <span className="text-muted-foreground font-normal">
              ({((d.count / total) * 100).toFixed(1)}%)
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ============ Filters sheet ============ */
function FiltersSheet({
  filters, setFilters, onClose,
}: { filters: ReportFilters; setFilters: (f: ReportFilters) => void; onClose: () => void }) {
  const update = (patch: Partial<ReportFilters>) => setFilters({ ...filters, ...patch });
  const reset = () => setFilters({ status: "todos" });

  return (
    <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
      <SheetHeader>
        <SheetTitle className="font-display flex items-center gap-2 text-xl">
          <Filter className="size-4 text-primary" /> Filtros do relatório
        </SheetTitle>
      </SheetHeader>

      <div className="mt-6 space-y-5">
        <div>
          <Label>Status</Label>
          <Select value={filters.status ?? "todos"} onValueChange={(v) => update({ status: v as any })}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativos">Somente ativos</SelectItem>
              <SelectItem value="inativos">Somente inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Classe de risco</Label>
            <Select value={filters.risco ?? "__all"} onValueChange={(v) => update({ risco: v === "__all" ? undefined : v })}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todas</SelectItem>
                <SelectItem value="Alto">Alto</SelectItem>
                <SelectItem value="Médio">Médio</SelectItem>
                <SelectItem value="Baixo">Baixo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Gênero</Label>
            <Select value={filters.genero ?? "__all"} onValueChange={(v) => update({ genero: v === "__all" ? undefined : v })}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos</SelectItem>
                <SelectItem value="Masculino">Masculino</SelectItem>
                <SelectItem value="Feminino">Feminino</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Escolaridade contém</Label>
          <Input className="mt-1.5" value={filters.escolaridade ?? ""} onChange={(e) => update({ escolaridade: e.target.value || undefined })} placeholder="ex: Fundamental" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Bairro contém</Label>
            <Input className="mt-1.5" value={filters.bairro ?? ""} onChange={(e) => update({ bairro: e.target.value || undefined })} placeholder="ex: Centro" />
          </div>
          <div>
            <Label>Escola contém</Label>
            <Input className="mt-1.5" value={filters.escola ?? ""} onChange={(e) => update({ escola: e.target.value || undefined })} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Turno</Label>
            <Select value={filters.turno ?? "__all"} onValueChange={(v) => update({ turno: v === "__all" ? undefined : v })}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos</SelectItem>
                <SelectItem value="Manhã">Manhã</SelectItem>
                <SelectItem value="Tarde">Tarde</SelectItem>
                <SelectItem value="Noite">Noite</SelectItem>
                <SelectItem value="Integral">Integral</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Idade mín.</Label>
            <Input className="mt-1.5" inputMode="numeric" value={filters.idadeMin ?? ""} onChange={(e) => update({ idadeMin: e.target.value || undefined })} />
          </div>
          <div>
            <Label>Idade máx.</Label>
            <Input className="mt-1.5" inputMode="numeric" value={filters.idadeMax ?? ""} onChange={(e) => update({ idadeMax: e.target.value || undefined })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Ano de ingresso</Label>
            <Select value={filters.ingressoAno ?? "__all"} onValueChange={(v) => update({ ingressoAno: v === "__all" ? undefined : v })}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Qualquer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Qualquer</SelectItem>
                {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ano de desligamento</Label>
            <Select value={filters.desligamentoAno ?? "__all"} onValueChange={(v) => update({ desligamentoAno: v === "__all" ? undefined : v })}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Qualquer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Qualquer</SelectItem>
                {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Mês de aniversário</Label>
          <Select value={filters.aniversarioMes ?? "__all"} onValueChange={(v) => update({ aniversarioMes: v === "__all" ? undefined : v })}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Qualquer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Qualquer</SelectItem>
              {["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
                .map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Em uso de medicação</p>
            <p className="text-xs text-muted-foreground">Apenas quem tem medicação registrada</p>
          </div>
          <Switch checked={!!filters.medicacao} onCheckedChange={(v) => update({ medicacao: v || undefined })} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Com alergia</p>
            <p className="text-xs text-muted-foreground">Apenas quem tem alergia registrada</p>
          </div>
          <Switch checked={!!filters.alergia} onCheckedChange={(v) => update({ alergia: v || undefined })} />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" onClick={reset} className="gap-2">
            <X className="size-4" /> Limpar
          </Button>
          <Button onClick={onClose} className="flex-1">
            Aplicar filtros
          </Button>
        </div>
      </div>
    </SheetContent>
  );
}

/* ============ Views (saved filters) ============ */
function ViewsMenu({
  templateId, filters, onApply,
}: {
  templateId: string;
  filters: ReportFilters;
  onApply: (v: ReportView) => void;
}) {
  const qc = useQueryClient();
  const views = useQuery({ queryKey: ["report-views"], queryFn: listReportViews });
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [bindTemplate, setBindTemplate] = useState(true);

  const save = useMutation({
    mutationFn: () => createReportView({
      name: name.trim(),
      template_id: bindTemplate ? templateId : null,
      filters,
    }),
    onSuccess: () => {
      toast.success("Vista salva");
      setSaveOpen(false);
      setName("");
      qc.invalidateQueries({ queryKey: ["report-views"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar vista"),
  });

  const overwrite = useMutation({
    mutationFn: (v: ReportView) => updateReportView(v.id, {
      template_id: bindTemplate ? templateId : v.template_id,
      filters,
    }),
    onSuccess: () => {
      toast.success("Vista atualizada");
      qc.invalidateQueries({ queryKey: ["report-views"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar"),
  });

  const del = useMutation({
    mutationFn: deleteReportView,
    onSuccess: () => {
      toast.success("Vista removida");
      qc.invalidateQueries({ queryKey: ["report-views"] });
    },
  });

  const list = views.data ?? [];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Bookmark className="size-4" /> Vistas
            {list.length > 0 && (
              <Badge className="ml-1 h-5 min-w-5 px-1.5 bg-secondary text-secondary-foreground">
                {list.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Vistas salvas</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {list.length === 0 ? (
            <div className="px-2 py-4 text-xs text-muted-foreground text-center">
              Nenhuma vista salva ainda.
            </div>
          ) : (
            list.map((v) => {
              const tpl = v.template_id ? getTemplate(v.template_id) : null;
              return (
                <div
                  key={v.id}
                  className="group flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                  onClick={() => onApply(v)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{v.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {tpl ? tpl.name : "Sem modelo fixo"}
                    </p>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100"
                    title="Sobrescrever com filtros atuais"
                    onClick={(e) => { e.stopPropagation(); overwrite.mutate(v); }}
                  >
                    <Save className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Apagar a vista "${v.name}"?`)) del.mutate(v.id);
                    }}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              );
            })
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => { e.preventDefault(); setSaveOpen(true); }}
            className="gap-2"
          >
            <BookmarkPlus className="size-4" /> Salvar filtros atuais como vista…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkPlus className="size-5 text-primary" /> Salvar vista
            </DialogTitle>
            <DialogDescription>
              As vistas ficam disponíveis para toda a equipe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da vista</Label>
              <Input
                autoFocus
                className="mt-1.5"
                placeholder="Ex: Ativos - Alto risco - Centro"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) save.mutate(); }}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Associar ao modelo atual</p>
                <p className="text-xs text-muted-foreground">
                  Ao aplicar, também seleciona “{getTemplate(templateId)?.name ?? templateId}”.
                </p>
              </div>
              <Switch checked={bindTemplate} onCheckedChange={setBindTemplate} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : "Salvar vista"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ============ Columns picker ============ */
function ColumnsSheet({
  value, onChange, onClose, isCustom,
}: {
  value: string[];
  onChange: (cols: string[] | null) => void;
  onClose: () => void;
  isCustom: boolean;
}) {
  const [draft, setDraft] = useState<string[]>(value);
  const [search, setSearch] = useState("");

  const toggle = (key: string) => {
    setDraft((d) => (d.includes(key) ? d.filter((k) => k !== key) : [...d, key]));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COLUMN_GROUPS;
    return COLUMN_GROUPS
      .map((g) => ({
        ...g,
        columns: g.columns.filter(
          (c) => c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.columns.length > 0);
  }, [search]);

  const apply = () => {
    onChange(draft.length ? draft : null);
    onClose();
    toast.success(
      draft.length ? `${draft.length} coluna(s) selecionada(s)` : "Colunas padrão do modelo",
    );
  };

  const resetTemplate = () => {
    onChange(null);
    onClose();
    toast.success("Colunas do modelo restauradas");
  };

  return (
    <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
      <SheetHeader>
        <SheetTitle className="font-display flex items-center gap-2 text-xl">
          <Columns3 className="size-4 text-primary" /> Colunas do relatório
        </SheetTitle>
        <p className="text-xs text-muted-foreground">
          Escolha exatamente o que aparece na planilha, PDF ou Word. Vale para qualquer modelo.
        </p>
      </SheetHeader>

      <div className="mt-4 space-y-3">
        <div className="relative">
          <SearchIcon className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar coluna (ex: cpf, rg, mãe…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">
            Modelos rápidos
          </p>
          <div className="flex flex-wrap gap-1.5">
            {COLUMN_PRESETS.map((p) => (
              <Button
                key={p.id}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setDraft(p.columns)}
                title={p.description}
              >
                {p.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            <b className="text-foreground">{draft.length}</b> coluna(s) selecionada(s)
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDraft([])}>
              Limpar
            </Button>
            <Button
              size="sm" variant="ghost" className="h-7 text-xs"
              onClick={() => setDraft(COLUMN_GROUPS.flatMap((g) => g.columns.map((c) => c.key)))}
            >
              Tudo
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-5 flex-1">
        {filtered.map((g) => (
          <div key={g.title}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
              {g.title}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {g.columns.map((c) => {
                const on = draft.includes(c.key);
                return (
                  <label
                    key={c.key}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors text-sm",
                      on
                        ? "border-primary/40 bg-primary-soft text-foreground"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <Checkbox checked={on} onCheckedChange={() => toggle(c.key)} />
                    <span className="truncate">{c.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 bg-background pt-4 mt-4 border-t border-border flex items-center gap-2">
        {isCustom && (
          <Button variant="outline" onClick={resetTemplate} className="gap-2">
            <RotateCcw className="size-4" /> Modelo
          </Button>
        )}
        <Button onClick={apply} className="flex-1">
          Aplicar colunas
        </Button>
      </div>
    </SheetContent>
  );
}


