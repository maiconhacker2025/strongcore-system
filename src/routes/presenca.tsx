import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ClipboardList, Printer, Download, Sparkles, Search, Users, CheckCircle2, XCircle,
  AlertCircle, TrendingUp, Save, History, Copy, Eye, Trash2, FileText, FileSpreadsheet,
  FileType2, ChevronLeft, ChevronRight, Loader2, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo-progredir.jpg";
import { fetchAll } from "@/lib/atividades";
import {
  PRESENCA_STATUS, PresencaStatus, statusMeta, proximoStatus, MESES, TURNOS, FAIXAS,
  periodosDisponiveis, diasUteis, diaSemanaCurto, montarParticipantes, marcacoesIniciais,
  estatisticas, salvarLista, listarHistorico, carregarLista, excluirLista, registrarLogPresenca,
  fmtData, type ListaPresenca, type Participante, type Marcacoes,
} from "@/lib/presenca";
import {
  exportarPresencaPdf, exportarPresencaXlsx, exportarPresencaDocx, imprimirPresenca,
  type EscopoImpressao,
} from "@/lib/presenca-export";

export const Route = createFileRoute("/presenca")({
  component: () => <AppShell><Page /></AppShell>,
  head: () => ({
    meta: [
      { title: "Lista de Presença · Espaço Progredir" },
      { name: "description", content: "Geração, controle e exportação das listas de presença mensais dos beneficiários do Espaço Progredir." },
      { property: "og:title", content: "Lista de Presença · Espaço Progredir" },
      { property: "og:description", content: "Gere listas de presença mensais com exportação em PDF, Word e Excel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const PAGE = 40;
const ESCOPOS: { value: EscopoImpressao; label: string }[] = [
  { value: "completa", label: "Lista completa" },
  { value: "turma", label: "Apenas turma" },
  { value: "projeto", label: "Apenas projeto" },
  { value: "presentes", label: "Apenas presentes" },
  { value: "faltosos", label: "Apenas faltosos" },
];

function Page() {
  const qc = useQueryClient();
  const periodos = useMemo(() => periodosDisponiveis(), []);
  const [periodo, setPeriodo] = useState(periodos[0].key);
  const [mes, ano] = useMemo(() => {
    const [a, m] = periodo.split("-");
    return [Number(m), Number(a)];
  }, [periodo]);

  const [turmaId, setTurmaId] = useState("todas");
  const [projetoId, setProjetoId] = useState("todos");
  const [faixa, setFaixa] = useState("todas");
  const [unidade, setUnidade] = useState("todas");
  const [turnoFiltro, setTurnoFiltro] = useState("todos");
  const [turno, setTurno] = useState("Tarde");
  const [educador, setEducador] = useState("");

  const [lista, setLista] = useState<ListaPresenca | null>(null);
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(0);
  const [escopo, setEscopo] = useState<EscopoImpressao>("completa");
  const [verLogs, setVerLogs] = useState<any[] | null>(null);

  const { data: turmas = [] } = useQuery({ queryKey: ["turmas"], queryFn: () => fetchAll<any>("turmas", "id,nome", "nome") });
  const { data: projetos = [] } = useQuery({ queryKey: ["projetos"], queryFn: () => fetchAll<any>("projetos", "id,nome", "nome") });
  const { data: unidades = [] } = useQuery({
    queryKey: ["unidades-bairro"],
    queryFn: async () => {
      const rows = await fetchAll<any>("beneficiarios", "bairro");
      return Array.from(new Set(rows.map((r: any) => r.bairro).filter(Boolean))).sort() as string[];
    },
  });
  const { data: historico = [], refetch: refetchHist } = useQuery({ queryKey: ["listas-presenca"], queryFn: listarHistorico });

  const dias = useMemo(() => diasUteis(mes, ano), [mes, ano]);
  const stats = useMemo(
    () => (lista ? estatisticas(lista.participantes, lista.marcacoes, dias) : null),
    [lista, dias],
  );

  const filtrados = useMemo(() => {
    if (!lista) return [];
    const q = busca.trim().toLowerCase();
    if (!q) return lista.participantes;
    return lista.participantes.filter((p) =>
      [p.nome, p.cpf, p.responsavel].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [lista, busca]);

  useEffect(() => { setPagina(0); }, [busca, periodo]);
  const pagCount = Math.max(1, Math.ceil(filtrados.length / PAGE));
  const visiveis = filtrados.slice(pagina * PAGE, pagina * PAGE + PAGE);

  const gerar = async () => {
    setGerando(true);
    try {
      const parts = await montarParticipantes({
        turmaId: turmaId !== "todas" ? turmaId : undefined,
        projetoId: projetoId !== "todos" ? projetoId : undefined,
        faixa, unidade, turno: turnoFiltro,
      });
      if (!parts.length) { toast.error("Nenhum beneficiário ativo encontrado com esses filtros"); return; }
      setLista({
        mes, ano,
        projeto: projetoId !== "todos" ? projetos.find((p: any) => p.id === projetoId)?.nome ?? null : null,
        turma_id: turmaId !== "todas" ? turmaId : null,
        turma: turmaId !== "todas" ? turmas.find((t: any) => t.id === turmaId)?.nome ?? null : null,
        turno, educador,
        unidade: unidade !== "todas" ? unidade : null,
        filtros: { turmaId, projetoId, faixa, unidade, turnoFiltro },
        participantes: parts,
        marcacoes: marcacoesIniciais(parts, mes, ano),
        total_alunos: parts.length,
      });
      toast.success(`${parts.length} beneficiários carregados — todos marcados como Presente`);
    } catch (e: any) {
      toast.error(`Erro ao gerar lista: ${e?.message ?? e}`);
    } finally { setGerando(false); }
  };

  const ciclar = (pid: string, dia: number) => {
    setLista((cur) => {
      if (!cur) return cur;
      const atual = cur.marcacoes?.[pid]?.[String(dia)] ?? "presente";
      const prox = proximoStatus(atual);
      const marcacoes: Marcacoes = { ...cur.marcacoes, [pid]: { ...(cur.marcacoes?.[pid] ?? {}), [String(dia)]: prox } };
      return { ...cur, marcacoes };
    });
  };

  const definirLinha = (pid: string, status: PresencaStatus) => {
    setLista((cur) => {
      if (!cur) return cur;
      const linha: Record<string, PresencaStatus> = {};
      dias.forEach((d) => { linha[String(d)] = status; });
      return { ...cur, marcacoes: { ...cur.marcacoes, [pid]: linha } };
    });
  };

  const definirDia = (dia: number, status: PresencaStatus) => {
    setLista((cur) => {
      if (!cur) return cur;
      const marcacoes: Marcacoes = { ...cur.marcacoes };
      cur.participantes.forEach((p) => {
        marcacoes[p.id] = { ...(marcacoes[p.id] ?? {}), [String(dia)]: status };
      });
      return { ...cur, marcacoes };
    });
  };

  const salvar = async () => {
    if (!lista) return;
    setSalvando(true);
    try {
      const id = await salvarLista(lista);
      setLista({ ...lista, id });
      await refetchHist();
      qc.invalidateQueries({ queryKey: ["listas-presenca"] });
      toast.success("Lista salva no histórico");
    } catch (e: any) {
      toast.error(`Erro ao salvar: ${e?.message ?? e}`);
    } finally { setSalvando(false); }
  };

  const abrir = async (id: string, duplicar = false) => {
    try {
      const l = await carregarLista(id);
      setPeriodo(`${l.ano}-${String(l.mes).padStart(2, "0")}`);
      setTurno(l.turno ?? "Tarde");
      setEducador(l.educador ?? "");
      setLista(duplicar ? { ...l, id: undefined } : l);
      if (!duplicar) await registrarLogPresenca({ lista_id: id, acao: "visualizou", descricao: `Lista ${MESES[l.mes - 1]}/${l.ano} aberta para consulta.` });
      toast.success(duplicar ? "Lista duplicada — salve para registrar" : "Lista carregada");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) { toast.error(`Erro ao abrir: ${e?.message ?? e}`); }
  };

  const remover = async (id: string) => {
    try { await excluirLista(id); await refetchHist(); toast.success("Lista removida"); }
    catch (e: any) { toast.error(`Erro ao remover: ${e?.message ?? e}`); }
  };

  const podeExportar = !!lista && !!lista.participantes.length;

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1700px] mx-auto">
      {/* Cabeçalho institucional */}
      <header className="rounded-3xl overflow-hidden shadow-xl shadow-emerald-900/10 border border-emerald-100 mb-7 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="bg-gradient-to-r from-[#0f7a3d] via-[#14894a] to-[#0b6633] px-6 md:px-9 py-6 flex flex-wrap items-center gap-5">
          <div className="relative shrink-0">
            <div className="absolute -inset-1.5 rounded-full bg-[conic-gradient(from_0deg,#f2b705,#ffffff80,#f2b705)] blur-[2px] opacity-80 animate-logo-spin" />
            <div className="relative size-16 rounded-full bg-white p-[3px] shadow-lg overflow-hidden">
              <img src={logo} alt="Logo do Espaço Progredir" className="size-full object-cover rounded-full" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.28em] text-amber-300 font-bold">Espaço Progredir</p>
            <h1 className="text-2xl md:text-[32px] font-display font-bold text-white leading-tight">Lista de Presença</h1>
            <p className="text-emerald-100/85 text-sm mt-0.5">
              Controle mensal de frequência · {MESES[mes - 1]}/{ano} · {dias.length} dias úteis
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-emerald-50/90 text-[11px] bg-white/10 rounded-full px-3.5 py-2 border border-white/15">
            <ShieldCheck className="size-3.5" /> Registro auditado
          </div>
        </div>
        <div className="h-[5px] bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400" />
      </header>

      <Tabs defaultValue="lista">
        <TabsList className="mb-6 bg-white border border-emerald-100 rounded-full p-1 shadow-sm">
          <TabsTrigger value="lista" className="rounded-full data-[state=active]:bg-[#0f7a3d] data-[state=active]:text-white px-5">
            <ClipboardList className="size-4 mr-1.5" /> Lista do mês
          </TabsTrigger>
          <TabsTrigger value="historico" className="rounded-full data-[state=active]:bg-[#0f7a3d] data-[state=active]:text-white px-5">
            <History className="size-4 mr-1.5" /> Histórico ({historico.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-6">
          {/* Filtros */}
          <Card className="p-5 md:p-6 rounded-3xl border-emerald-100 shadow-sm">
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
              <Campo label="Mês / Ano">
                <Select value={periodo} onValueChange={setPeriodo}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {periodos.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Campo>
              <Campo label="Projeto">
                <Select value={projetoId} onValueChange={setProjetoId}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os projetos</SelectItem>
                    {projetos.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Campo>
              <Campo label="Turma">
                <Select value={turmaId} onValueChange={setTurmaId}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as turmas</SelectItem>
                    {turmas.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Campo>
              <Campo label="Faixa etária">
                <Select value={faixa} onValueChange={setFaixa}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FAIXAS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Campo>
              <Campo label="Unidade / Bairro">
                <Select value={unidade} onValueChange={setUnidade}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="todas">Todas as unidades</SelectItem>
                    {unidades.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Campo>
              <Campo label="Turno da lista">
                <Select value={turno} onValueChange={setTurno}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{TURNOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </Campo>
              <Campo label="Educador responsável">
                <Input value={educador} onChange={(e) => setEducador(e.target.value)} placeholder="Nome do educador" className="rounded-xl" />
              </Campo>
              <div className="flex items-end">
                <Button
                  onClick={gerar} disabled={gerando}
                  className="w-full h-10 rounded-xl bg-[#0f7a3d] hover:bg-[#0c6633] text-white font-bold shadow-md shadow-emerald-900/20"
                >
                  {gerando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Gerar Lista
                </Button>
              </div>
            </div>
          </Card>

          {/* Estatísticas */}
          {stats && (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5 animate-in fade-in duration-300">
              <Kpi icon={Users} label="Beneficiários" value={stats.beneficiarios} tone="emerald" />
              <Kpi icon={CheckCircle2} label="Presenças" value={stats.presente} tone="emerald" />
              <Kpi icon={XCircle} label="Faltas" value={stats.falta} tone="rose" />
              <Kpi icon={AlertCircle} label="Justificados" value={stats.justificado} tone="amber" />
              <Kpi icon={TrendingUp} label="Frequência geral" value={`${stats.frequencia}%`} tone="amber" />
            </div>
          )}

          {/* Ações */}
          {lista && (
            <Card className="p-4 rounded-3xl border-emerald-100 shadow-sm flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={busca} onChange={(e) => setBusca(e.target.value)}
                  placeholder="Pesquisar por nome, CPF ou responsável…"
                  className="pl-9 rounded-xl"
                />
              </div>
              <Select value={escopo} onValueChange={(v) => setEscopo(v as EscopoImpressao)}>
                <SelectTrigger className="w-[190px] rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESCOPOS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                onClick={() => imprimirPresenca(lista, escopo)} disabled={!podeExportar}
                className="h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#063b38] font-bold shadow-md"
              >
                <Printer className="size-4" /> Imprimir
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={!podeExportar} className="h-11 rounded-xl border-emerald-200">
                    <Download className="size-4" /> Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Escopo: {ESCOPOS.find((e) => e.value === escopo)?.label}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => exportarPresencaDocx(lista, escopo)}>
                    <FileType2 className="size-4 text-sky-600" /> Word (.docx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportarPresencaXlsx(lista, escopo)}>
                    <FileSpreadsheet className="size-4 text-emerald-600" /> Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportarPresencaPdf(lista, escopo)}>
                    <FileText className="size-4 text-rose-600" /> PDF profissional
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={salvar} disabled={salvando} variant="outline" className="h-11 rounded-xl border-emerald-200">
                {salvando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {lista.id ? "Atualizar" : "Salvar lista"}
              </Button>
            </Card>
          )}

          {/* Tabela */}
          {!lista ? (
            <Card className="p-14 rounded-3xl border-dashed border-2 border-emerald-200 text-center bg-white">
              <div className="size-14 rounded-2xl bg-emerald-50 text-[#0f7a3d] grid place-items-center mx-auto mb-4">
                <ClipboardList className="size-7" />
              </div>
              <h2 className="font-display font-bold text-xl text-slate-900">Nenhuma lista gerada</h2>
              <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                Escolha o mês, os filtros desejados e clique em <b>Gerar Lista</b>. Todos os beneficiários
                ativos entram automaticamente como <b>Presente</b>, em ordem alfabética.
              </p>
            </Card>
          ) : (
            <Card className="rounded-3xl border-emerald-100 shadow-sm overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-emerald-50/60 border-b border-emerald-100">
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  {PRESENCA_STATUS.map((s) => (
                    <span key={s.value} className={cn("px-2.5 py-1 rounded-full border font-semibold", s.cls)}>
                      {s.emoji} {s.label}
                    </span>
                  ))}
                  <span className="text-slate-500 ml-1">Clique na célula para alternar</span>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-slate-600">
                  <span>{filtrados.length} aluno(s)</span>
                  <Button size="icon" variant="ghost" className="size-7" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span>{pagina + 1}/{pagCount}</span>
                  <Button size="icon" variant="ghost" className="size-7" disabled={pagina >= pagCount - 1} onClick={() => setPagina((p) => p + 1)}>
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr className="bg-[#0f7a3d] text-white">
                      <Th className="w-10 text-center">Nº</Th>
                      <Th className="min-w-[220px] text-left">Nome completo</Th>
                      <Th className="min-w-[130px] text-left">CPF / Documento</Th>
                      <Th className="min-w-[100px] text-center">Nascimento</Th>
                      <Th className="min-w-[170px] text-left">Responsável</Th>
                      <Th className="min-w-[120px] text-left">Telefone</Th>
                      {dias.map((d) => (
                        <th key={d} className="px-1 py-2 text-[10px] font-bold border-l border-white/15 align-middle">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="hover:text-amber-300 transition-colors leading-tight">
                              {String(d).padStart(2, "0")}
                              <div className="text-[8px] font-normal opacity-80">{diaSemanaCurto(d, mes, ano)}</div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center">
                              <DropdownMenuLabel>Dia {d} — todos como</DropdownMenuLabel>
                              {PRESENCA_STATUS.map((s) => (
                                <DropdownMenuItem key={s.value} onClick={() => definirDia(d, s.value)}>
                                  {s.emoji} {s.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((p, i) => (
                      <tr key={p.id} className="odd:bg-white even:bg-emerald-50/25 hover:bg-amber-50/50 transition-colors">
                        <Td className="text-center text-slate-400">{pagina * PAGE + i + 1}</Td>
                        <Td className="font-semibold text-slate-900">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="text-left hover:text-[#0f7a3d] transition-colors">
                              {p.nome}
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuLabel>Mês inteiro como</DropdownMenuLabel>
                              {PRESENCA_STATUS.map((s) => (
                                <DropdownMenuItem key={s.value} onClick={() => definirLinha(p.id, s.value)}>
                                  {s.emoji} {s.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </Td>
                        <Td className="text-slate-600">{p.cpf || "—"}</Td>
                        <Td className="text-center text-slate-600">{fmtData(p.data_nascimento) || "—"}</Td>
                        <Td className="text-slate-600">{p.responsavel || "—"}</Td>
                        <Td className="text-slate-600">{p.telefone || "—"}</Td>
                        {dias.map((d) => {
                          const m = statusMeta(lista.marcacoes?.[p.id]?.[String(d)]);
                          return (
                            <td key={d} className="p-0.5 border-l border-slate-100 text-center">
                              <button
                                onClick={() => ciclar(p.id, d)}
                                title={`${p.nome} · dia ${d}: ${m.label}`}
                                className={cn(
                                  "size-6 rounded-md border text-[10px] font-bold transition-all hover:scale-110 active:scale-95",
                                  m.cls,
                                )}
                              >
                                {m.short}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Assinaturas */}
              <div className="grid gap-8 md:grid-cols-3 px-8 pt-12 pb-8 bg-white">
                {["Educador Responsável", "Coordenação", "Direção"].map((s) => (
                  <div key={s} className="border-t border-slate-300 pt-2 text-center text-[12px] font-semibold text-slate-600">{s}</div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Histórico */}
        <TabsContent value="historico">
          <Card className="rounded-3xl border-emerald-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="bg-[#0f7a3d] text-white text-left">
                    <Th>Data / Hora</Th><Th>Período</Th><Th>Projeto</Th><Th>Turma</Th>
                    <Th>Turno</Th><Th>Educador</Th><Th className="text-center">Alunos</Th>
                    <Th>Usuário</Th><Th className="text-right">Ações</Th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((h: any) => (
                    <tr key={h.id} className="odd:bg-white even:bg-emerald-50/25 border-b border-slate-100">
                      <Td>{new Date(h.created_at).toLocaleString("pt-BR")}</Td>
                      <Td className="font-semibold">{MESES[h.mes - 1]}/{h.ano}</Td>
                      <Td>{h.projeto || "—"}</Td>
                      <Td>{h.turma || "—"}</Td>
                      <Td>{h.turno || "—"}</Td>
                      <Td>{h.educador || "—"}</Td>
                      <Td className="text-center font-bold text-[#0f7a3d]">{h.total_alunos}</Td>
                      <Td>{h.autor || "—"}</Td>
                      <Td>
                        <div className="flex justify-end gap-1">
                          <Acao title="Visualizar / Editar" onClick={() => abrir(h.id)}><Eye className="size-3.5" /></Acao>
                          <Acao title="Duplicar" onClick={() => abrir(h.id, true)}><Copy className="size-3.5" /></Acao>
                          <Acao title="Reimprimir" onClick={async () => { const l = await carregarLista(h.id); imprimirPresenca(l, "completa"); }}>
                            <Printer className="size-3.5" />
                          </Acao>
                          <Acao title="Exportar PDF" onClick={async () => { const l = await carregarLista(h.id); exportarPresencaPdf(l, "completa"); }}>
                            <FileText className="size-3.5" />
                          </Acao>
                          <Acao title="Excluir" onClick={() => remover(h.id)}><Trash2 className="size-3.5 text-rose-600" /></Acao>
                        </div>
                      </Td>
                    </tr>
                  ))}
                  {!historico.length && (
                    <tr><td colSpan={9} className="text-center py-12 text-slate-500">Nenhuma lista salva ainda.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!verLogs} onOpenChange={(o) => !o && setVerLogs(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registro de auditoria</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto text-[12px]">
            {(verLogs ?? []).map((l) => (
              <div key={l.id} className="rounded-xl border border-slate-200 p-3">
                <p className="font-semibold">{l.descricao}</p>
                <p className="text-slate-500">{l.autor} · {new Date(l.created_at).toLocaleString("pt-BR")}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ===== pequenos componentes ===== */
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">{label}</Label>
      {children}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: any; label: string; value: any; tone: "emerald" | "rose" | "amber" }) {
  const tones = {
    emerald: "text-[#0f7a3d] bg-emerald-50 border-emerald-100",
    rose: "text-rose-600 bg-rose-50 border-rose-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
  }[tone];
  return (
    <Card className="p-4 rounded-2xl border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={cn("size-10 rounded-xl grid place-items-center border", tones)}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold truncate">{label}</p>
          <p className="text-2xl font-display font-bold text-slate-900 leading-tight">{value}</p>
        </div>
      </div>
    </Card>
  );
}

const Th = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
  <th className={cn("px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider", className)}>{children}</th>
);
const Td = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
  <td className={cn("px-3 py-2 align-middle", className)}>{children}</td>
);
const Acao = ({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) => (
  <Button size="icon" variant="ghost" title={title} onClick={onClick} className="size-7 rounded-lg hover:bg-emerald-50">
    {children}
  </Button>
);
