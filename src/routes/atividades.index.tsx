import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { AtividadesNav, AtividadesHeader } from "@/components/AtividadesNav";
import { Card } from "@/components/ui/card";
import { fetchAll, pct } from "@/lib/atividades";
import { GRUPOS, grupoPorIdade, idadeDe, DIA_INDEX } from "@/lib/grupos";
import {
  LayoutDashboard, Palette, Users, TrendingUp, UserX, CalendarDays, Cake, Trophy,
  CheckCircle2, XCircle, AlertTriangle, GraduationCap,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { format, addDays, startOfDay, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/atividades/")({
  component: () => <AppShell><Page /></AppShell>,
  head: () => ({
    meta: [
      { title: "Atividades · Espaço Progredir" },
      { name: "description", content: "Painel de oficinas, turmas, frequência e participação dos beneficiários do Espaço Progredir." },
      { property: "og:title", content: "Atividades · Espaço Progredir" },
      { property: "og:description", content: "Painel de oficinas, turmas, frequência e participação dos beneficiários." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function useDados() {
  return useQuery({
    queryKey: ["atividades-dashboard"],
    queryFn: async () => {
      const [beneficiarios, oficinas, turmas, matriculas, aulas, frequencias, eventos] = await Promise.all([
        fetchAll<any>("beneficiarios", "id,nome,ativo,data_nascimento,genero,bairro,escola"),
        fetchAll<any>("oficinas"),
        fetchAll<any>("turmas"),
        fetchAll<any>("matriculas"),
        fetchAll<any>("aulas"),
        fetchAll<any>("frequencias"),
        fetchAll<any>("eventos"),
      ]);
      return { beneficiarios, oficinas, turmas, matriculas, aulas, frequencias, eventos };
    },
  });
}

const COLORS = ["#0f766e", "#f59e0b", "#2563eb", "#ea580c", "#7c3aed", "#059669", "#dc2626"];

function Kpi({ icon: Icon, label, value, hint, tone = "teal" }: any) {
  const tones: Record<string, string> = {
    teal: "bg-teal-50 text-teal-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <Card className="p-4 border-slate-200 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`size-9 rounded-xl grid place-items-center shrink-0 ${tones[tone]}`}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{label}</p>
          <p className="text-2xl font-display font-bold text-slate-900 leading-tight">{value}</p>
          {hint && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{hint}</p>}
        </div>
      </div>
    </Card>
  );
}

function Page() {
  const { data, isLoading } = useDados();

  if (isLoading || !data) {
    return (
      <div className="p-6 md:p-10">
        <AtividadesNav />
        <p className="text-slate-500">Carregando painel de atividades...</p>
      </div>
    );
  }

  const { beneficiarios, oficinas, turmas, matriculas, aulas, frequencias, eventos } = data;
  const benefMap = new Map(beneficiarios.map((b: any) => [b.id, b]));
  const turmaMap = new Map(turmas.map((t: any) => [t.id, t]));
  const oficinaMap = new Map(oficinas.map((o: any) => [o.id, o]));

  const ativos = beneficiarios.filter((b: any) => b.ativo);
  const matriculasAtivas = matriculas.filter((m: any) => m.status === "ativa" && !m.lista_espera);
  const presencas = frequencias.filter((f: any) => ["presente", "atraso", "saiu_cedo"].includes(f.status));
  const faltas = frequencias.filter((f: any) => f.status === "falta");
  const taxa = pct(presencas.length, frequencias.length);

  // participação por oficina
  const porOficina = oficinas.map((o: any) => {
    const ts = turmas.filter((t: any) => t.oficina_id === o.id).map((t: any) => t.id);
    const matr = matriculasAtivas.filter((m: any) => ts.includes(m.turma_id));
    return { nome: o.nome, alunos: matr.length, cor: o.cor };
  }).sort((a, b) => b.alunos - a.alunos);

  // risco de evasão: >=3 faltas consecutivas ou >30% faltas
  const porBenef = new Map<string, any[]>();
  for (const f of frequencias) {
    const arr = porBenef.get(f.beneficiario_id) ?? [];
    arr.push(f);
    porBenef.set(f.beneficiario_id, arr);
  }
  const risco: { id: string; nome: string; motivo: string }[] = [];
  for (const [bid, regs] of porBenef) {
    const b = benefMap.get(bid);
    if (!b) continue;
    const ord = regs
      .map((r) => ({ ...r, data: (aulas.find((a: any) => a.id === r.aula_id)?.data) ?? "" }))
      .sort((a, b2) => String(a.data).localeCompare(String(b2.data)));
    let consec = 0, maxConsec = 0;
    for (const r of ord) {
      if (r.status === "falta") { consec++; maxConsec = Math.max(maxConsec, consec); } else consec = 0;
    }
    const pf = pct(ord.filter((r) => r.status === "falta").length, ord.length);
    if (maxConsec >= 3) risco.push({ id: bid, nome: b.nome, motivo: `${maxConsec} faltas consecutivas` });
    else if (pf > 30) risco.push({ id: bid, nome: b.nome, motivo: `${pf}% de faltas` });
  }

  const semOficina = ativos.filter((b: any) => !matriculasAtivas.some((m: any) => m.beneficiario_id === b.id));

  // grupos
  const grupoCount = { crescer: 0, jovem: 0, outros: 0 } as Record<string, number>;
  const faixas: Record<string, number> = {};
  for (const b of ativos) {
    const idade = idadeDe(b.data_nascimento);
    grupoCount[grupoPorIdade(idade)]++;
    if (idade != null) faixas[`${idade} anos`] = (faixas[`${idade} anos`] ?? 0) + 1;
  }
  const faixaData = Object.entries(faixas)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([name, value]) => ({ name, value }));

  // semana
  const hoje = startOfDay(new Date());
  const semana = Array.from({ length: 7 }, (_, i) => addDays(hoje, i)).map((d) => {
    const idx = d.getDay();
    const ts = turmas.filter((t: any) => (t.dias_semana ?? []).some((dw: string) => DIA_INDEX[dw] === idx) && t.status === "ativa");
    return { data: d, turmas: ts };
  });

  const proximosEventos = eventos
    .filter((e: any) => new Date(e.data) >= hoje)
    .sort((a: any, b: any) => a.data.localeCompare(b.data))
    .slice(0, 6);

  const mes = new Date().getMonth();
  const aniversariantes = ativos
    .filter((b: any) => b.data_nascimento && new Date(b.data_nascimento).getMonth() === mes)
    .slice(0, 8);

  const educadores = Array.from(new Set([
    ...oficinas.map((o: any) => o.educador),
    ...turmas.map((t: any) => t.professor),
  ].filter(Boolean))) as string[];

  return (
    <div className="p-6 md:p-10">
      <AtividadesNav />
      <AtividadesHeader
        icon={<LayoutDashboard className="size-5" />}
        title="Dashboard de Atividades"
        subtitle="Visão viva das oficinas, turmas, presença e participação do Espaço Progredir."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Kpi icon={Palette} label="Oficinas" value={oficinas.filter((o: any) => o.status === "ativa").length} hint={`${oficinas.length} cadastradas`} />
        <Kpi icon={Users} label="Beneficiários ativos" value={ativos.length} hint={`${matriculasAtivas.length} matrículas ativas`} tone="blue" />
        <Kpi icon={TrendingUp} label="Taxa de participação" value={`${taxa}%`} hint={`${frequencias.length} registros de presença`} tone="amber" />
        <Kpi icon={UserX} label="Risco de evasão" value={risco.length} hint="3+ faltas seguidas ou +30%" tone="rose" />
        <Kpi icon={CheckCircle2} label="Presenças" value={presencas.length} tone="teal" />
        <Kpi icon={XCircle} label="Faltas" value={faltas.length} tone="rose" />
        <Kpi icon={GraduationCap} label="Turmas ativas" value={turmas.filter((t: any) => t.status === "ativa").length} tone="violet" />
        <Kpi icon={AlertTriangle} label="Sem oficina" value={semOficina.length} hint="ativos sem matrícula" tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card className="p-5 lg:col-span-2 border-slate-200">
          <h2 className="font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Trophy className="size-4 text-amber-500" /> Ranking das oficinas
          </h2>
          {porOficina.length === 0 ? (
            <p className="text-sm text-slate-500">Cadastre oficinas para ver o ranking.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={porOficina.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} fontSize={11} />
                <YAxis type="category" dataKey="nome" width={120} fontSize={11} />
                <Tooltip />
                <Bar dataKey="alunos" name="Matriculados" radius={[0, 6, 6, 0]}>
                  {porOficina.slice(0, 10).map((o, i) => <Cell key={i} fill={o.cor || COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 border-slate-200">
          <h2 className="font-display font-bold text-slate-900 mb-4">Crescer × Jovem</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={[
                  { name: "🌱 Crescer", value: grupoCount.crescer },
                  { name: "🚀 Jovem", value: grupoCount.jovem },
                  { name: "Fora da faixa", value: grupoCount.outros },
                ]}
                dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}
              >
                <Cell fill={GRUPOS.crescer.cor} />
                <Cell fill={GRUPOS.jovem.cor} />
                <Cell fill="#94a3b8" />
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card className="p-5 lg:col-span-2 border-slate-200">
          <h2 className="font-display font-bold text-slate-900 mb-4">Participação por faixa etária</h2>
          {faixaData.length === 0 ? <p className="text-sm text-slate-500">Sem datas de nascimento.</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={faixaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Bar dataKey="value" name="Beneficiários" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 border-slate-200">
          <h2 className="font-display font-bold text-slate-900 mb-3 flex items-center gap-2">
            <UserX className="size-4 text-rose-500" /> Risco de evasão
          </h2>
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {risco.length === 0 && <p className="text-sm text-slate-500">Nenhum beneficiário em risco. 🎉</p>}
            {risco.slice(0, 20).map((r) => (
              <Link key={r.id} to="/beneficiarios/$id" params={{ id: r.id }}
                className="flex items-center justify-between gap-2 rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2 hover:bg-rose-50">
                <span className="text-sm font-medium text-slate-800 truncate">{r.nome}</span>
                <span className="text-[11px] text-rose-700 whitespace-nowrap">{r.motivo}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 border-slate-200">
          <h2 className="font-display font-bold text-slate-900 mb-3 flex items-center gap-2">
            <CalendarDays className="size-4 text-teal-600" /> Atividades da semana
          </h2>
          <div className="space-y-2">
            {semana.map((d, i) => (
              <div key={i} className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  {format(d.data, "EEEE, dd/MM", { locale: ptBR })}
                </p>
                {d.turmas.length === 0 ? (
                  <p className="text-[12px] text-slate-400">Sem atividades</p>
                ) : d.turmas.map((t: any) => (
                  <p key={t.id} className="text-[12.5px] text-slate-700">
                    • {oficinaMap.get(t.oficina_id)?.nome ?? "Oficina"} — {t.nome} {t.horario_inicio ? `(${t.horario_inicio})` : ""}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 border-slate-200">
          <h2 className="font-display font-bold text-slate-900 mb-3">Próximos eventos</h2>
          {proximosEventos.length === 0 && <p className="text-sm text-slate-500">Nenhum evento agendado.</p>}
          <div className="space-y-2">
            {proximosEventos.map((e: any) => (
              <div key={e.id} className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="text-sm font-semibold text-slate-800">{e.nome}</p>
                <p className="text-[11.5px] text-slate-500">
                  {format(new Date(e.data + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })} · {e.local || "Local a definir"}
                </p>
              </div>
            ))}
          </div>

          <h2 className="font-display font-bold text-slate-900 mt-5 mb-3 flex items-center gap-2">
            <Cake className="size-4 text-amber-500" /> Aniversariantes do mês
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {aniversariantes.length === 0 && <p className="text-sm text-slate-500">Nenhum neste mês.</p>}
            {aniversariantes.map((b: any) => (
              <Link key={b.id} to="/beneficiarios/$id" params={{ id: b.id }}
                className="text-[11.5px] rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1">
                {b.nome.split(" ")[0]} · {format(new Date(b.data_nascimento), "dd/MM")}
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5 border-slate-200">
          <h2 className="font-display font-bold text-slate-900 mb-3">Educadores responsáveis</h2>
          {educadores.length === 0 && <p className="text-sm text-slate-500">Cadastre oficinas com educadores.</p>}
          <div className="space-y-2">
            {educadores.map((ed) => {
              const qtd = turmas.filter((t: any) => t.professor === ed).length
                + oficinas.filter((o: any) => o.educador === ed).length;
              return (
                <div key={ed} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-sm text-slate-800">{ed}</span>
                  <span className="text-[11px] text-slate-500">{qtd} atribuição(ões)</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
