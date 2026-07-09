import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, UserCheck, AlertTriangle, GraduationCap, ArrowRight,
  FileSpreadsheet, FileType2, Download, TrendingUp, Cake, HeartPulse,
  Pill, PhoneOff, School, CalendarCheck2, UsersRound,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { backupExcel, backupPdf, runFullBackup } from "@/lib/backup";
import { exportPdf, exportXlsx, type ReportTable } from "@/lib/export-report";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: () => (
    <AppShell>
      <Dashboard />
    </AppShell>
  ),
});

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

function groupBy(rows: any[], key: string) {
  const m: Record<string, number> = {};
  for (const r of rows) {
    const v = r[key];
    const k = v === null || v === undefined || v === "" ? "Não informado" : String(v);
    m[k] = (m[k] ?? 0) + 1;
  }
  return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiarios")
        .select("id, nome, codigo, bairro, escola, escolaridade, ativo, classe_risco, genero, turno, data_nascimento, data_ingresso_01, data_desligamento_01, created_at, whatsapp, celular, alergia, medicacao, possui_beneficios, possui_dificuldades, renda")
        .limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = data ?? [];
  const total = rows.length;
  const ativos = rows.filter((r) => r.ativo).length;
  const inativos = total - ativos;
  const risco = rows.filter((r) => r.classe_risco === "Alto").length;
  const recentes = [...rows]
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .slice(0, 8);

  const porEscolaridade = groupBy(rows, "escolaridade").slice(0, 8);
  const porRisco = groupBy(rows, "classe_risco");
  const porBairro = groupBy(rows, "bairro").slice(0, 6);
  const porTurno = groupBy(rows, "turno");
  const porGenero = groupBy(rows, "genero");
  const topEscolas = groupBy(rows.filter(r => r.ativo), "escola").slice(0, 5);

  // Idade
  const idades: number[] = [];
  const now = new Date();
  const thisMonth = now.getMonth();
  const aniversariantes: any[] = [];
  for (const r of rows) {
    if (!r.data_nascimento) continue;
    const d = new Date(r.data_nascimento);
    let age = now.getFullYear() - d.getFullYear();
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
    if (age >= 0 && age < 120) idades.push(age);
    if (d.getMonth() === thisMonth && r.ativo) {
      aniversariantes.push({ ...r, _age: age, _day: d.getDate() });
    }
  }
  aniversariantes.sort((a, b) => a._day - b._day);
  const idadeMedia = idades.length ? Math.round(idades.reduce((a, b) => a + b, 0) / idades.length) : 0;

  // Faixas etárias
  const faixas = [
    { name: "0-6", value: idades.filter(a => a <= 6).length },
    { name: "7-10", value: idades.filter(a => a >= 7 && a <= 10).length },
    { name: "11-14", value: idades.filter(a => a >= 11 && a <= 14).length },
    { name: "15-17", value: idades.filter(a => a >= 15 && a <= 17).length },
    { name: "18+", value: idades.filter(a => a >= 18).length },
  ];

  // Alertas
  const comAlergia = rows.filter(r => r.alergia && r.ativo).length;
  const comMedicacao = rows.filter(r => r.medicacao && r.ativo).length;
  const semContato = rows.filter(r => r.ativo && !r.whatsapp && !r.celular).length;

  // Ingressos por ano
  const ingressoPorAno: Record<string, number> = {};
  for (const r of rows) {
    if (r.data_ingresso_01) {
      const y = String(new Date(r.data_ingresso_01).getFullYear());
      ingressoPorAno[y] = (ingressoPorAno[y] ?? 0) + 1;
    }
  }
  const ingressoData = Object.entries(ingressoPorAno)
    .map(([ano, total]) => ({ ano, total }))
    .sort((a, b) => Number(a.ano) - Number(b.ano))
    .slice(-6);

  // Desligamentos por ano
  const desligPorAno: Record<string, number> = {};
  for (const r of rows) {
    const d = r.data_desligamento_01;
    if (d) {
      const y = String(new Date(d).getFullYear());
      desligPorAno[y] = (desligPorAno[y] ?? 0) + 1;
    }
  }
  const desligData = Object.entries(desligPorAno)
    .map(([ano, total]) => ({ ano, total }))
    .sort((a, b) => Number(a.ano) - Number(b.ano));

  // Ingressos este ano vs ano passado
  const yearNow = now.getFullYear();
  const ingressoEsteAno = ingressoPorAno[String(yearNow)] ?? 0;

  const stats = [
    { label: "Total cadastrados", value: total, icon: Users, color: "text-primary bg-primary-soft" },
    { label: "Beneficiários ativos", value: ativos, icon: UserCheck, color: "text-success bg-success/10", hint: total ? `${Math.round((ativos / total) * 100)}% do total` : "" },
    { label: "Classe de risco alto", value: risco, icon: AlertTriangle, color: "text-destructive bg-destructive/10", hint: ativos ? `${Math.round((risco / ativos) * 100)}% dos ativos` : "" },
    { label: "Inativos / desligados", value: inativos, icon: GraduationCap, color: "text-accent-foreground bg-accent" },
    { label: "Idade média", value: idadeMedia ? `${idadeMedia} anos` : "—", icon: Cake, color: "text-purple-700 bg-purple-100" },
    { label: "Ingressos em " + yearNow, value: ingressoEsteAno, icon: CalendarCheck2, color: "text-blue-700 bg-blue-100" },
    { label: "Com medicação", value: comMedicacao, icon: Pill, color: "text-amber-700 bg-amber-100" },
    { label: "Sem contato cadastrado", value: semContato, icon: PhoneOff, color: "text-rose-700 bg-rose-100", hint: "ativos sem WhatsApp/celular" },
  ];

  // Quick reports
  const quickReports: { title: string; build: () => { table: ReportTable; question: string } }[] = [
    {
      title: "Beneficiários ativos",
      build: () => ({
        question: "Lista de todos os beneficiários ativos",
        table: {
          title: "Beneficiários ativos",
          columns: ["codigo", "nome", "escola", "bairro", "classe_risco"],
          rows: rows.filter((r) => r.ativo),
        },
      }),
    },
    {
      title: "Por escolaridade",
      build: () => ({
        question: "Distribuição de beneficiários por escolaridade",
        table: { title: "Por escolaridade", columns: ["escolaridade", "total"], rows: porEscolaridade.map((d) => ({ escolaridade: d.name, total: d.value })) },
      }),
    },
    {
      title: "Por bairro",
      build: () => ({
        question: "Distribuição de beneficiários por bairro",
        table: { title: "Por bairro", columns: ["bairro", "total"], rows: groupBy(rows, "bairro").map((d) => ({ bairro: d.name, total: d.value })) },
      }),
    },
    {
      title: "Risco alto",
      build: () => ({
        question: "Beneficiários com classe de risco Alto",
        table: { title: "Risco alto", columns: ["codigo", "nome", "escola", "bairro", "whatsapp"], rows: rows.filter((r) => r.classe_risco === "Alto") },
      }),
    },
    {
      title: "Desligamentos por ano",
      build: () => ({
        question: "Quantos beneficiários foram desligados por ano",
        table: { title: "Desligamentos por ano", columns: ["ano", "total"], rows: desligData },
      }),
    },
  ];

  const runQuick = (q: typeof quickReports[number], format: "pdf" | "xlsx") => {
    const { table, question } = q.build();
    if (table.rows.length === 0) {
      toast.warning("Sem dados para este relatório.");
      return;
    }
    const data = {
      title: `Relatório — ${q.title}`,
      question,
      answer: `Total de ${table.rows.length} registro(s).`,
      tables: [table],
    };
    if (format === "pdf") exportPdf(data); else exportXlsx(data);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl md:text-[34px] font-bold text-slate-900 leading-tight">Painel Geral</h1>
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-bold mt-1.5">
            Administração Institucional · Visão Consolidada
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => backupExcel().then((n) => n && toast.success(`Excel baixado · ${n} registros`))}>
            <FileSpreadsheet className="size-4" /> Excel completo
          </Button>
          <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => backupPdf().then((n) => n && toast.success(`PDF baixado · ${n} registros`))}>
            <FileType2 className="size-4" /> PDF completo
          </Button>
          <Button className="rounded-xl bg-amber-500 hover:bg-amber-400 text-[#063b38] font-bold shadow-sm" onClick={runFullBackup}>
            <Download className="size-4" /> Backup semanal
          </Button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-6 rounded-2xl border border-slate-200/70 shadow-sm relative overflow-hidden group bg-white">
              {idx === 0 && (
                <div className="absolute -right-6 -top-6 size-24 rounded-full bg-primary/5 group-hover:scale-110 transition-transform duration-500" />
              )}
              <div className="relative z-10 flex items-start justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em]">{s.label}</p>
                <div className={`size-8 rounded-lg flex items-center justify-center ${s.color}`}>
                  <Icon className="size-3.5" />
                </div>
              </div>
              <div className="relative z-10 mt-3 font-display font-bold text-3xl text-slate-900 leading-none">
                {isLoading ? "…" : s.value}
              </div>
              {(s as any).hint && (
                <div className="relative z-10 mt-3 text-[11px] font-medium text-slate-500">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                    {(s as any).hint}
                  </span>
                </div>
              )}
            </Card>
          );
        })}
      </div>


      {/* Destaques: Aniversariantes + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="p-6 rounded-2xl border border-slate-200/70 shadow-sm bg-white lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold flex items-center gap-2">
              <Cake className="size-5 text-purple-600" /> Aniversariantes do mês
            </h2>
            <span className="text-xs text-muted-foreground">{aniversariantes.length} pessoa(s)</span>
          </div>
          {aniversariantes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum aniversariante este mês.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
              {aniversariantes.slice(0, 10).map((a) => (
                <Link key={a.id} to="/beneficiarios/$id" params={{ id: a.id }}
                  className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="size-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-sm">
                    {String(a._day).padStart(2, "0")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{a.nome}</div>
                    <div className="text-xs text-muted-foreground">Faz {a._age + 1} anos</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 rounded-2xl border-0 shadow-xl shadow-teal-950/20 bg-sidebar text-white overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <HeartPulse className="size-5 text-amber-400" /> Alertas de Saúde
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-teal-300/70">Monitor</span>
          </div>
          <div className="space-y-2.5">
            {[
              { icon: Pill, label: "Usa medicação", value: comMedicacao, tone: "amber" },
              { icon: AlertTriangle, label: "Possui alergia", value: comAlergia, tone: "rose" },
              { icon: PhoneOff, label: "Sem contato", value: semContato, tone: "orange" },
              { icon: AlertTriangle, label: "Risco alto", value: risco, tone: "red" },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <div key={a.label} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-2.5 text-[13px] text-teal-100">
                    <Icon className="size-4 text-amber-400" /> {a.label}
                  </div>
                  <span className="font-display font-bold text-white text-lg">{a.value}</span>
                </div>
              );
            })}
          </div>
        </Card>

      </div>

      {/* Faixa etária + Gênero + Top escolas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <Card className="p-6 rounded-2xl border border-slate-200/70 shadow-sm bg-white">
          <h2 className="font-display font-semibold mb-3 flex items-center gap-2">
            <UsersRound className="size-4 text-primary" /> Faixa etária
          </h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={faixas} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border border-slate-200/70 shadow-sm bg-white">
          <h2 className="font-display font-semibold mb-3">Gênero</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porGenero} dataKey="value" nameKey="name" innerRadius={35} outerRadius={70} paddingAngle={2}>
                  {porGenero.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border border-slate-200/70 shadow-sm bg-white">
          <h2 className="font-display font-semibold mb-3 flex items-center gap-2">
            <School className="size-4 text-emerald-600" /> Top escolas (ativos)
          </h2>
          {topEscolas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sem dados.</p>
          ) : (
            <div className="space-y-2">
              {topEscolas.map((e, i) => {
                const max = topEscolas[0].value || 1;
                return (
                  <div key={e.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="truncate font-medium">{e.name}</span>
                      <span className="text-muted-foreground">{e.value}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(e.value / max) * 100}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Ingressos por ano */}
      <Card className="p-6 rounded-2xl border border-slate-200/70 shadow-sm bg-white mt-4">
        <h2 className="font-display font-semibold mb-3 flex items-center gap-2">
          <CalendarCheck2 className="size-4 text-blue-600" /> Ingressos por ano (últimos)
        </h2>
        <div className="h-48">
          {ingressoData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem ingressos registrados.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ingressoData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>


      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-8">
        <Card className="p-6 rounded-2xl border border-slate-200/70 shadow-sm bg-white lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Distribuição por escolaridade</h2>
            <TrendingUp className="size-4 text-muted-foreground" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porEscolaridade} margin={{ top: 10, right: 10, left: -20, bottom: 30 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border border-slate-200/70 shadow-sm bg-white">
          <h2 className="font-display font-semibold mb-4">Classe de risco</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porRisco} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {porRisco.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border border-slate-200/70 shadow-sm bg-white">
          <h2 className="font-display font-semibold mb-4">Top bairros</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porBairro} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border border-slate-200/70 shadow-sm bg-white">
          <h2 className="font-display font-semibold mb-4">Por turno</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porTurno} dataKey="value" nameKey="name" outerRadius={75}>
                  {porTurno.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border border-slate-200/70 shadow-sm bg-white">
          <h2 className="font-display font-semibold mb-4">Desligamentos por ano</h2>
          <div className="h-56">
            {desligData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem desligamentos registrados.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={desligData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Quick reports */}
      <Card className="mt-8 p-6 rounded-2xl border border-slate-200/70 shadow-sm bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-semibold text-lg">Relatórios rápidos</h2>
            <p className="text-sm text-muted-foreground">Gere um relatório formatado com 1 clique.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickReports.map((q) => (
            <div key={q.title} className="border rounded-lg p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{q.title}</div>
                <div className="text-xs text-muted-foreground">PDF ou Excel</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="outline" onClick={() => runQuick(q, "pdf")}>
                  <FileType2 className="size-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => runQuick(q, "xlsx")}>
                  <FileSpreadsheet className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent */}
      <Card className="mt-8 overflow-hidden rounded-2xl border border-slate-200/70 shadow-sm bg-white">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-display font-semibold">Cadastros recentes</h2>
          <Link to="/beneficiarios" className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1">
            Ver todos <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="divide-y">
          {recentes.map((b: any) => (
            <Link
              key={b.id}
              to="/beneficiarios/$id"
              params={{ id: b.id }}
              className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="size-10 rounded-full bg-primary-soft text-primary flex items-center justify-center font-semibold">
                {b.nome?.[0] ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{b.nome}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {[b.escola, b.bairro].filter(Boolean).join(" • ") || "—"}
                </div>
              </div>
              {b.ativo ? (
                <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success font-medium">Ativo</span>
              ) : (
                <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium">Inativo</span>
              )}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
