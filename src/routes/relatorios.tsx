import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Sparkles, FileText, FileSpreadsheet, FileType2, Filter, Loader2,
  LayoutDashboard, UserCheck, UserMinus, GraduationCap, School, Clock,
  MapPin, ShieldAlert, Users as UsersIcon, Cake, PartyPopper, LogIn, LogOut,
  Pill, AlertTriangle, Phone, ArrowRight, X, ChevronRight,
} from "lucide-react";
import { REPORT_TEMPLATES, type ReportTemplate, type ReportFilters, getTemplate } from "@/lib/reports";
import type { FullReport } from "@/lib/reports-export";
import { exportReportPdf, exportReportXlsx, exportReportDocx } from "@/lib/reports-export";
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

const CATEGORY_COLOR: Record<string, string> = {
  geral: "from-blue-500/10 to-indigo-500/10 text-blue-700 border-blue-200",
  escolar: "from-emerald-500/10 to-teal-500/10 text-emerald-700 border-emerald-200",
  saude: "from-rose-500/10 to-pink-500/10 text-rose-700 border-rose-200",
  familia: "from-amber-500/10 to-orange-500/10 text-amber-700 border-amber-200",
  movimento: "from-violet-500/10 to-purple-500/10 text-violet-700 border-violet-200",
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => String(CURRENT_YEAR - i));

function RelatoriosPage() {
  const [selectedId, setSelectedId] = useState<string>("panorama");
  const [filters, setFilters] = useState<ReportFilters>({ status: "todos" });
  const [report, setReport] = useState<FullReport | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const selected = useMemo(() => getTemplate(selectedId)!, [selectedId]);

  const gen = useMutation({
    mutationFn: async (t: ReportTemplate) => t.build(filters),
    onSuccess: (r) => setReport(r),
    onError: (e: any) => alert(`Erro ao gerar relatório: ${e?.message ?? e}`),
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
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
      {/* Hero */}
      <div className="relative overflow-hidden border-b bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white">
        <div className="absolute -top-24 -right-24 size-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-10 size-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative px-6 md:px-10 py-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-blue-100 text-sm mb-2">
                <Sparkles className="size-4" /> Central de Relatórios
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
                Relatórios profissionais em segundos
              </h1>
              <p className="mt-2 text-blue-100 max-w-2xl">
                Modelos prontos com filtros avançados. Exporte em PDF, Excel ou Word — com ou sem IA.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="secondary" className="gap-2 bg-white text-blue-700 hover:bg-white/90">
                    <Filter className="size-4" /> Filtros
                    {activeFilterCount > 0 && (
                      <Badge className="ml-1 bg-blue-600 text-white">{activeFilterCount}</Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <FiltersSheet filters={filters} setFilters={setFilters} onClose={() => setFiltersOpen(false)} />
              </Sheet>
              <Button
                onClick={() => generate()}
                disabled={gen.isPending}
                className="gap-2 bg-white text-blue-700 hover:bg-white/90"
              >
                {gen.isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                Gerar relatório
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-10 py-8 grid gap-8 lg:grid-cols-[360px_1fr]">
        {/* Catalog */}
        <aside className="space-y-6">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Modelos rápidos
            </h2>
            <div className="space-y-5">
              {grouped.map(([cat, items]) => (
                <div key={cat}>
                  <div className={cn("text-[11px] font-bold uppercase tracking-wider mb-2 px-1",
                    "text-muted-foreground")}>
                    {CATEGORY_LABEL[cat] ?? cat}
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
                            "hover:shadow-md hover:-translate-y-0.5",
                            active
                              ? "border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm ring-1 ring-blue-200"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "rounded-lg p-2 border bg-gradient-to-br",
                              CATEGORY_COLOR[t.category]
                            )}>
                              <Icon className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-sm truncate">{t.name}</p>
                                <ChevronRight className={cn("size-4 shrink-0 transition-transform",
                                  active ? "text-blue-600 translate-x-0.5" : "text-slate-300 group-hover:text-slate-500")} />
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {t.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Preview */}
        <section className="min-w-0">
          {gen.isPending && <PreviewSkeleton title={selected.name} />}
          {!gen.isPending && !report && <EmptyPreview onGenerate={() => generate()} template={selected} />}
          {report && <ReportPreview report={report} onRegenerate={() => generate()} />}
        </section>
      </div>
    </div>
  );
}

function EmptyPreview({ onGenerate, template }: { onGenerate: () => void; template: ReportTemplate }) {
  const Icon = ICONS[template.icon] ?? FileText;
  return (
    <Card className="p-10 md:p-16 border-dashed border-2 bg-white/70 backdrop-blur flex flex-col items-center justify-center text-center">
      <div className="rounded-2xl p-4 bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 mb-4">
        <Icon className="size-8" />
      </div>
      <h3 className="text-xl font-display font-semibold">{template.name}</h3>
      <p className="text-muted-foreground max-w-md mt-2">{template.description}</p>
      <Button onClick={onGenerate} className="mt-6 gap-2 bg-blue-600 hover:bg-blue-700">
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
    <Card className="p-8 bg-white animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <Loader2 className="size-5 animate-spin text-blue-600" />
        <span className="text-sm text-muted-foreground">Gerando <b>{title}</b>…</span>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="h-72 rounded-xl bg-slate-100" />
    </Card>
  );
}

function ReportPreview({ report, onRegenerate }: { report: FullReport; onRegenerate: () => void }) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-white to-blue-50/50 border-blue-100">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-blue-600 font-semibold mb-1">
              Relatório pronto
            </div>
            <h2 className="text-2xl font-display font-bold">{report.title}</h2>
            {report.subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{report.subtitle}</p>
            )}
            {report.filters?.length ? (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {report.filters.map((f) => (
                  <Badge key={f} variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                    {f}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onRegenerate}>Atualizar</Button>
          </div>
        </div>

        {report.kpis?.length ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {report.kpis.map((k) => (
              <div key={k.label} className="rounded-xl border bg-white p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  {k.label}
                </p>
                <p className="text-2xl font-display font-bold text-blue-700 mt-1">{k.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      {/* Export toolbar */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-emerald-50 via-white to-blue-50">
        <div className="flex items-center gap-2 text-sm">
          <div className="rounded-lg bg-emerald-100 text-emerald-700 p-2">
            <FileText className="size-4" />
          </div>
          <span className="font-medium">Exportar este relatório</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => exportReportPdf(report)} className="gap-2 bg-rose-600 hover:bg-rose-700">
            <FileType2 className="size-4" /> PDF
          </Button>
          <Button onClick={() => exportReportXlsx(report)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <FileSpreadsheet className="size-4" /> Excel
          </Button>
          <Button onClick={() => exportReportDocx(report)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <FileText className="size-4" /> Word
          </Button>
        </div>
      </Card>

      {/* GroupBy */}
      {report.groupBy?.length ? (
        <Card className="p-6">
          <h3 className="font-display font-semibold mb-4">Distribuição</h3>
          <GroupBar data={report.groupBy} />
        </Card>
      ) : null}

      {/* Table */}
      {report.rows.length ? (
        <Card className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between">
            <h3 className="font-display font-semibold">Detalhamento ({report.rows.length})</h3>
            <span className="text-xs text-muted-foreground">Ordenado por nome</span>
          </div>
          <div className="overflow-x-auto">
            <PreviewTable columns={report.columns} rows={report.rows.slice(0, 100)} />
          </div>
          {report.rows.length > 100 && (
            <div className="px-6 py-3 border-t bg-slate-50 text-xs text-muted-foreground text-center">
              Exibindo os primeiros 100 registros — o arquivo exportado inclui todos os {report.rows.length}.
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-8 text-center text-muted-foreground">
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
        <tr className="bg-slate-100 text-slate-700">
          <th className="text-left px-3 py-2 font-semibold w-10">#</th>
          {columns.map((c) => (
            <th key={c} className="text-left px-3 py-2 font-semibold whitespace-nowrap">
              {labelOf(c)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t hover:bg-blue-50/30">
            <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
            {columns.map((c) => (
              <td key={c} className="px-3 py-2 whitespace-nowrap">
                {c === "ativo" ? (
                  <Badge variant={r.ativo ? "default" : "secondary"} className={r.ativo ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}>
                    {r.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                ) : c === "classe_risco" && r.classe_risco ? (
                  <Badge variant="outline" className={
                    r.classe_risco === "Alto" ? "border-rose-300 text-rose-700 bg-rose-50" :
                    r.classe_risco === "Médio" ? "border-amber-300 text-amber-700 bg-amber-50" :
                    "border-emerald-300 text-emerald-700 bg-emerald-50"
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
    <div className="space-y-2">
      {data.slice(0, 12).map((d) => (
        <div key={d.label} className="grid grid-cols-[minmax(140px,220px)_1fr_auto] items-center gap-3">
          <span className="text-sm truncate" title={d.label}>{d.label}</span>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
          <span className="text-sm tabular-nums font-medium w-24 text-right">
            {d.count} <span className="text-muted-foreground">({((d.count / total) * 100).toFixed(1)}%)</span>
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
        <SheetTitle className="flex items-center gap-2">
          <Filter className="size-4" /> Filtros do relatório
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

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Em uso de medicação</p>
            <p className="text-xs text-muted-foreground">Apenas quem tem medicação registrada</p>
          </div>
          <Switch checked={!!filters.medicacao} onCheckedChange={(v) => update({ medicacao: v || undefined })} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Com alergia</p>
            <p className="text-xs text-muted-foreground">Apenas quem tem alergia registrada</p>
          </div>
          <Switch checked={!!filters.alergia} onCheckedChange={(v) => update({ alergia: v || undefined })} />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" onClick={reset} className="gap-2">
            <X className="size-4" /> Limpar filtros
          </Button>
          <Button onClick={onClose} className="flex-1 bg-blue-600 hover:bg-blue-700">
            Aplicar
          </Button>
        </div>
      </div>
    </SheetContent>
  );
}
