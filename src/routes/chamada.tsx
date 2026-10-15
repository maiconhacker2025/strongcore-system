import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchAll, registrarHistorico } from "@/lib/atividades";
import { GRUPOS, grupoPorIdade, idadeDe, type GrupoKey } from "@/lib/grupos";
import {
  montarParticipantes, marcacoesIniciais, salvarLista, registrarLogPresenca,
  type PresencaStatus,
} from "@/lib/presenca";
import { toast } from "sonner";
import { Check, X, AlertCircle, Loader2, ChevronLeft, ClipboardCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo-progredir.jpg";

export const Route = createFileRoute("/chamada")({
  component: () => <AuthGate><ChamadaApp /></AuthGate>,
  head: () => ({
    meta: [
      { title: "Chamada · Espaço Progredir" },
      { name: "description", content: "Aplicativo de chamada dos educadores do Espaço Progredir: presença rápida por turma, direto na lista de presença." },
      { name: "theme-color", content: "#063b38" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Chamada" },
      { property: "og:title", content: "Chamada · Espaço Progredir" },
      { property: "og:description", content: "Aplicativo de chamada dos educadores do Espaço Progredir." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      { rel: "icon", type: "image/png", href: "/icons/icon-192.png" },
    ],
  }),
});

type Status = "presente" | "falta" | "justificada";

const STATUS_UI: { value: Status; label: string; icon: any; active: string; idle: string }[] = [
  { value: "presente", label: "Presente", icon: Check, active: "bg-emerald-500 text-white border-emerald-500", idle: "bg-white text-emerald-700 border-emerald-200" },
  { value: "falta", label: "Falta", icon: X, active: "bg-rose-500 text-white border-rose-500", idle: "bg-white text-rose-600 border-rose-200" },
  { value: "justificada", label: "Justif.", icon: AlertCircle, active: "bg-amber-500 text-white border-amber-500", idle: "bg-white text-amber-700 border-amber-200" },
];

const statusParaPresenca: Record<Status, PresencaStatus> = {
  presente: "presente", falta: "falta", justificada: "justificado",
};

function ChamadaApp() {
  const qc = useQueryClient();
  const [grupo, setGrupo] = useState<GrupoKey | null>(null);
  const [turmaId, setTurmaId] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [educador, setEducador] = useState("");
  const [marcas, setMarcas] = useState<Record<string, Status>>({});
  const [salvo, setSalvo] = useState(false);

  const { data: oficinas = [] } = useQuery({ queryKey: ["oficinas"], queryFn: () => fetchAll<any>("oficinas") });
  const { data: turmas = [] } = useQuery({ queryKey: ["turmas"], queryFn: () => fetchAll<any>("turmas", "*", "nome") });
  const { data: matriculas = [] } = useQuery({ queryKey: ["matriculas"], queryFn: () => fetchAll<any>("matriculas") });
  const { data: beneficiarios = [] } = useQuery({
    queryKey: ["beneficiarios-chamada"],
    queryFn: () => fetchAll<any>("beneficiarios", "id,nome,ativo,data_nascimento,alergia,medicacao", "nome"),
  });

  const oficinaMap = useMemo(() => new Map(oficinas.map((o: any) => [o.id, o])), [oficinas]);
  const benefMap = useMemo(() => new Map(beneficiarios.map((b: any) => [b.id, b])), [beneficiarios]);

  const turmasDoGrupo = useMemo(() => turmas.filter((t: any) => {
    const of = oficinaMap.get(t.oficina_id);
    return !grupo || of?.grupo === grupo || of?.grupo === "ambos";
  }), [turmas, oficinaMap, grupo]);

  const turma = turmas.find((t: any) => t.id === turmaId);

  const alunos = useMemo(() => matriculas
    .filter((m: any) => m.turma_id === turmaId && !m.lista_espera && m.status === "ativa")
    .map((m: any) => benefMap.get(m.beneficiario_id))
    .filter(Boolean)
    .filter((b: any) => !grupo || grupoPorIdade(idadeDe(b.data_nascimento)) === grupo)
    .sort((a: any, b: any) => a.nome.localeCompare(b.nome, "pt-BR")),
  [matriculas, benefMap, turmaId, grupo]);

  const statusDe = (id: string): Status => marcas[id] ?? "presente";
  const presentes = alunos.filter((b: any) => statusDe(b.id) === "presente").length;

  const salvar = useMutation({
    mutationFn: async () => {
      if (!turmaId || !turma) throw new Error("Selecione a turma");
      // 1) Aula + frequências (módulo Frequência)
      const { data: aulaExistente } = await supabase.from("aulas").select("id")
        .eq("turma_id", turmaId).eq("data", data).maybeSingle();
      let aulaId = aulaExistente?.id;
      if (aulaId) {
        const { error } = await supabase.from("aulas").update({ educador }).eq("id", aulaId);
        if (error) throw error;
      } else {
        const { data: nova, error } = await supabase.from("aulas").insert({
          turma_id: turmaId, data, educador,
          horario_inicio: turma.horario_inicio ?? null, horario_fim: turma.horario_fim ?? null,
        }).select("id").single();
        if (error) throw error;
        aulaId = nova.id;
      }
      const rows = alunos.map((b: any) => ({
        aula_id: aulaId, beneficiario_id: b.id, status: statusDe(b.id),
      }));
      const { error: e2 } = await supabase.from("frequencias")
        .upsert(rows, { onConflict: "aula_id,beneficiario_id" });
      if (e2) throw e2;

      // 2) Lista de presença do mês (módulo Lista de Presença)
      const d = new Date(data + "T12:00:00");
      const mes = d.getMonth() + 1, ano = d.getFullYear(), dia = String(d.getDate());
      const { data: listaExistente } = await supabase.from("listas_presenca").select("*")
        .eq("turma_id", turmaId).eq("mes", mes).eq("ano", ano).maybeSingle();

      if (listaExistente) {
        const marcacoes = { ...(listaExistente.marcacoes as any) };
        for (const b of alunos) {
          marcacoes[b.id] = { ...(marcacoes[b.id] ?? {}) };
          marcacoes[b.id][dia] = statusParaPresenca[statusDe(b.id)];
        }
        await salvarLista({
          ...(listaExistente as any), marcacoes, educador: educador || listaExistente.educador,
        });
      } else {
        const participantes = await montarParticipantes({ turmaId });
        const marcacoes = marcacoesIniciais(participantes, mes, ano);
        for (const b of alunos) {
          if (!marcacoes[b.id]) marcacoes[b.id] = {};
          marcacoes[b.id][dia] = statusParaPresenca[statusDe(b.id)];
        }
        await salvarLista({
          mes, ano, turma_id: turmaId, turma: turma.nome,
          educador: educador || null, filtros: { turmaId, origem: "app-chamada" },
          participantes, marcacoes, total_alunos: participantes.length,
          autor: educador || "Educador",
        });
      }

      await registrarHistorico({
        entidade: "frequencia", entidade_id: aulaId, acao: "registrou",
        descricao: `Chamada pelo app em ${turma.nome} (${data}) — ${presentes}/${alunos.length} presentes`,
        autor: educador || "Educador",
      });
      await registrarLogPresenca({
        acao: "chamada_app",
        descricao: `Chamada rápida (${GRUPOS[grupo!].nome}) em ${turma.nome} — ${presentes}/${alunos.length} presentes em ${data}.`,
        autor: educador || "Educador",
      });
    },
    onSuccess: () => {
      toast.success("Chamada salva! Já está na lista de presença.");
      qc.invalidateQueries({ queryKey: ["atividades-dashboard"] });
      setMarcas({});
      setSalvo(true);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const voltar = () => {
    if (salvo) { setSalvo(false); setMarcas({}); return; }
    if (turmaId) { setTurmaId(""); setMarcas({}); return; }
    setGrupo(null);
  };

  return (
    <div className="min-h-screen bg-[#063b38] text-white flex flex-col">
      {/* Header do app */}
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        {(grupo || salvo) && (
          <button onClick={voltar} className="size-9 rounded-full bg-white/10 grid place-items-center shrink-0">
            <ChevronLeft className="size-5" />
          </button>
        )}
        <img src={logo} alt="Espaço Progredir" className="size-10 rounded-full object-cover ring-2 ring-amber-400/70" />
        <div className="leading-tight">
          <p className="font-display font-bold text-[16px]">Chamada Progredir</p>
          <p className="text-[11px] text-teal-200/70 uppercase tracking-widest">Presença dos educadores</p>
        </div>
      </header>

      <main className="flex-1 bg-[#f6f7f5] text-slate-900 rounded-t-3xl px-5 pt-6 pb-28 overflow-y-auto">
        {/* Passo 1: grupo */}
        {!grupo && !salvo && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <h1 className="text-xl font-display font-bold">Qual grupo você vai chamar?</h1>
            {(["crescer", "jovem"] as GrupoKey[]).map((k) => {
              const g = GRUPOS[k];
              const qtd = turmas.filter((t: any) => {
                const of = oficinaMap.get(t.oficina_id);
                return of?.grupo === k || of?.grupo === "ambos";
              }).length;
              return (
                <button key={k} onClick={() => setGrupo(k)}
                  className="w-full text-left rounded-3xl border-2 border-slate-200 bg-white p-5 flex items-center gap-4 active:scale-[0.98] transition-all shadow-sm">
                  <span className="text-4xl">{g.icone}</span>
                  <div className="flex-1">
                    <p className="font-bold text-lg">{g.nome}</p>
                    <p className="text-sm text-slate-500">{g.faixa} · {qtd} turma(s)</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Passo 2: turma + data */}
        {grupo && !turmaId && !salvo && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <h1 className="text-xl font-display font-bold">{GRUPOS[grupo].icone} {GRUPOS[grupo].nome}</h1>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Data da chamada</label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="mt-1 h-12 text-base bg-white" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Seu nome (educador)</label>
              <Input value={educador} onChange={(e) => setEducador(e.target.value)} placeholder="Ex.: Renata" className="mt-1 h-12 text-base bg-white" />
            </div>
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Escolha a turma</p>
              {turmasDoGrupo.length === 0 && (
                <p className="text-sm text-slate-500 bg-white rounded-2xl p-4 border border-dashed">Nenhuma turma deste grupo cadastrada ainda.</p>
              )}
              {turmasDoGrupo.map((t: any) => (
                <button key={t.id} onClick={() => setTurmaId(t.id)}
                  className="w-full text-left rounded-2xl border-2 border-slate-200 bg-white p-4 flex items-center gap-3 active:scale-[0.98] transition-all">
                  <div className="size-10 rounded-xl bg-[#063b38] text-white grid place-items-center shrink-0">
                    <Users className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{t.nome}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {oficinaMap.get(t.oficina_id)?.nome}{t.horario_inicio ? ` · ${t.horario_inicio}` : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Passo 3: chamada */}
        {grupo && turmaId && !salvo && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-lg font-display font-bold leading-tight">{turma?.nome}</h1>
                <p className="text-xs text-slate-500">{new Date(data + "T12:00:00").toLocaleDateString("pt-BR")} · {presentes}/{alunos.length} presentes</p>
              </div>
              <button onClick={() => {
                const novo: Record<string, Status> = {};
                alunos.forEach((b: any) => { novo[b.id] = "presente"; });
                setMarcas(novo);
              }} className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
                Todos presentes
              </button>
            </div>

            {alunos.length === 0 ? (
              <p className="text-sm text-slate-500 bg-white rounded-2xl p-6 border border-dashed text-center">
                Nenhum aluno deste grupo matriculado nesta turma.
              </p>
            ) : (
              <div className="space-y-2.5">
                {alunos.map((b: any) => {
                  const st = statusDe(b.id);
                  return (
                    <div key={b.id} className={cn(
                      "rounded-2xl border-2 bg-white p-3.5 transition-all",
                      st === "falta" ? "border-rose-300" : st === "justificada" ? "border-amber-300" : "border-slate-200"
                    )}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <p className="font-semibold text-[15px] flex-1 min-w-0 truncate">{b.nome}</p>
                        {(b.alergia || b.medicacao) && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0">
                            {b.alergia ? "Alergia" : "Medicação"}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {STATUS_UI.map((s) => {
                          const Icon = s.icon;
                          const ativo = st === s.value;
                          return (
                            <button key={s.value}
                              onClick={() => setMarcas((m) => ({ ...m, [b.id]: s.value }))}
                              className={cn(
                                "h-11 rounded-xl border-2 font-bold text-[13px] flex items-center justify-center gap-1.5 transition-all active:scale-95",
                                ativo ? s.active : s.idle
                              )}>
                              <Icon className="size-4" /> {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Confirmação */}
        {salvo && (
          <div className="text-center pt-10 animate-in fade-in zoom-in-95">
            <div className="size-20 rounded-full bg-emerald-100 text-emerald-600 grid place-items-center mx-auto mb-4">
              <ClipboardCheck className="size-10" />
            </div>
            <h1 className="text-2xl font-display font-bold">Chamada salva!</h1>
            <p className="text-sm text-slate-500 mt-2">
              {presentes} de {alunos.length} presentes em {turma?.nome}.<br />
              A lista de presença do mês já foi atualizada.
            </p>
            <Button onClick={voltar} className="mt-6 bg-[#063b38] hover:bg-[#0a4f4a] h-12 px-8 rounded-2xl">
              Fazer outra chamada
            </Button>
          </div>
        )}
      </main>

      {/* Botão fixo de salvar */}
      {grupo && turmaId && !salvo && alunos.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#063b38] via-[#063b38]/95 to-transparent">
          <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}
            className="w-full h-14 rounded-2xl bg-amber-400 hover:bg-amber-300 text-[#063b38] font-bold text-base shadow-xl">
            {salvar.isPending ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
            Salvar chamada ({presentes}/{alunos.length})
          </Button>
        </div>
      )}
    </div>
  );
}
