import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { AtividadesNav, AtividadesHeader } from "@/components/AtividadesNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchAll, registrarHistorico, STATUS_FREQUENCIA, statusFreqMeta } from "@/lib/atividades";
import { grupoDoBeneficiario } from "@/lib/grupos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/atividades/frequencia")({
  component: () => <AppShell><Page /></AppShell>,
  head: () => ({
    meta: [
      { title: "Frequência · Espaço Progredir" },
      { name: "description", content: "Chamada digital das turmas do Espaço Progredir com presença, falta justificada, atraso e observações." },
      { property: "og:title", content: "Frequência · Espaço Progredir" },
      { property: "og:description", content: "Chamada digital das turmas com presença, falta e observações." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Page() {
  const qc = useQueryClient();
  const [turmaId, setTurmaId] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [educador, setEducador] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [assinatura, setAssinatura] = useState("");
  const [marcas, setMarcas] = useState<Record<string, string>>({});
  const [obs, setObs] = useState<Record<string, string>>({});

  const { data: oficinas = [] } = useQuery({ queryKey: ["oficinas"], queryFn: () => fetchAll<any>("oficinas") });
  const { data: turmas = [] } = useQuery({ queryKey: ["turmas"], queryFn: () => fetchAll<any>("turmas", "*", "nome") });
  const { data: matriculas = [] } = useQuery({ queryKey: ["matriculas"], queryFn: () => fetchAll<any>("matriculas") });
  const { data: beneficiarios = [] } = useQuery({
    queryKey: ["beneficiarios-min"],
    queryFn: () => fetchAll<any>("beneficiarios", "id,nome,ativo,data_nascimento,responsavel,nome_responsavel,tel_responsavel,whatsapp,alergia,medicacao,observacoes", "nome"),
  });

  const oficinaMap = useMemo(() => new Map(oficinas.map((o: any) => [o.id, o])), [oficinas]);
  const benefMap = useMemo(() => new Map(beneficiarios.map((b: any) => [b.id, b])), [beneficiarios]);

  const turma = turmas.find((t: any) => t.id === turmaId);
  const alunos = matriculas
    .filter((m: any) => m.turma_id === turmaId && !m.lista_espera && m.status === "ativa")
    .map((m: any) => benefMap.get(m.beneficiario_id))
    .filter(Boolean)
    .sort((a: any, b: any) => a.nome.localeCompare(b.nome));

  const { data: aulaExistente } = useQuery({
    queryKey: ["aula", turmaId, data],
    enabled: !!turmaId,
    queryFn: async () => {
      const { data: rows } = await supabase.from("aulas").select("*").eq("turma_id", turmaId).eq("data", data).maybeSingle();
      return rows;
    },
  });

  const { data: freqExistentes = [] } = useQuery({
    queryKey: ["frequencias-aula", aulaExistente?.id],
    enabled: !!aulaExistente?.id,
    queryFn: async () => {
      const { data: rows } = await supabase.from("frequencias").select("*").eq("aula_id", aulaExistente!.id);
      return rows ?? [];
    },
  });

  const marcasEfetivas = (bid: string) =>
    marcas[bid] ?? (freqExistentes as any[]).find((f) => f.beneficiario_id === bid)?.status ?? "presente";

  const salvar = useMutation({
    mutationFn: async () => {
      let aulaId = aulaExistente?.id;
      if (aulaId) {
        const { error } = await supabase.from("aulas")
          .update({ conteudo, educador, assinatura }).eq("id", aulaId);
        if (error) throw error;
      } else {
        const { data: nova, error } = await supabase.from("aulas")
          .insert({ turma_id: turmaId, data, conteudo, educador, assinatura,
            horario_inicio: turma?.horario_inicio ?? null, horario_fim: turma?.horario_fim ?? null })
          .select("id").single();
        if (error) throw error;
        aulaId = nova.id;
      }
      const rows = alunos.map((b: any) => ({
        aula_id: aulaId, beneficiario_id: b.id, status: marcasEfetivas(b.id), observacoes: obs[b.id] ?? null,
      }));
      const { error: e2 } = await supabase.from("frequencias").upsert(rows, { onConflict: "aula_id,beneficiario_id" });
      if (e2) throw e2;
      await registrarHistorico({
        entidade: "frequencia", entidade_id: aulaId, acao: "registrou",
        descricao: `Chamada registrada em ${turma?.nome} (${data}) — ${rows.length} beneficiário(s)`, autor: educador || "Educador",
      });
    },
    onSuccess: () => {
      toast.success("Chamada salva com sucesso");
      qc.invalidateQueries({ queryKey: ["aula", turmaId, data] });
      qc.invalidateQueries({ queryKey: ["atividades-dashboard"] });
      setMarcas({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  const marcarTodos = (status: string) => {
    const novo: Record<string, string> = {};
    alunos.forEach((b: any) => { novo[b.id] = status; });
    setMarcas(novo);
  };

  return (
    <div className="p-6 md:p-10">
      <AtividadesNav />
      <AtividadesHeader
        icon={<ClipboardCheck className="size-5" />}
        title="Frequência"
        subtitle="Chamada digital por turma e data, com falta justificada, atraso, saída antecipada e assinatura do educador."
      />

      <Card className="p-5 mb-5 border-slate-200">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Turma *</Label>
            <Select value={turmaId} onValueChange={setTurmaId}>
              <SelectTrigger><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
              <SelectContent>
                {turmas.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{oficinaMap.get(t.oficina_id)?.nome} — {t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div><Label>Educador</Label><Input value={educador} onChange={(e) => setEducador(e.target.value)} placeholder="Nome do educador" /></div>
          <div><Label>Assinatura digital</Label><Input value={assinatura} onChange={(e) => setAssinatura(e.target.value)} placeholder="Digite seu nome completo" /></div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Label>Conteúdo / atividade do dia</Label>
            <Textarea rows={2} value={conteudo} onChange={(e) => setConteudo(e.target.value)} />
          </div>
        </div>
      </Card>

      {!turmaId ? (
        <Card className="p-10 text-center border-dashed"><p className="text-slate-500">Selecione uma turma para fazer a chamada.</p></Card>
      ) : alunos.length === 0 ? (
        <Card className="p-10 text-center border-dashed"><p className="text-slate-500">Nenhum beneficiário matriculado nesta turma.</p></Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[12px] text-slate-500">Marcar todos:</span>
            {STATUS_FREQUENCIA.map((s) => (
              <button key={s.value} onClick={() => marcarTodos(s.value)}
                className={cn("text-[11.5px] px-2.5 py-1 rounded-full border font-semibold", s.cls)}>{s.label}</button>
            ))}
            <Button className="ml-auto" onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              {salvar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar chamada
            </Button>
          </div>

          <div className="space-y-2">
            {alunos.map((b: any) => {
              const g = grupoDoBeneficiario(b);
              const atual = marcasEfetivas(b.id);
              return (
                <Card key={b.id} className="p-3 border-slate-200 flex flex-wrap items-center gap-3">
                  <div className={cn("size-9 rounded-full grid place-items-center shrink-0", g.corBg)}>{g.icone}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-slate-900">{b.nome}</p>
                    <p className="text-[11px] text-slate-500">{g.nome}{b.alergia ? " · Alergia" : ""}{b.medicacao ? " · Medicação" : ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {STATUS_FREQUENCIA.map((s) => (
                      <button key={s.value} onClick={() => setMarcas((m) => ({ ...m, [b.id]: s.value }))}
                        className={cn("text-[11px] px-2.5 py-1.5 rounded-lg border font-bold transition-all",
                          atual === s.value ? s.cls + " ring-2 ring-offset-1 ring-slate-300" : "bg-white text-slate-400 border-slate-200 hover:border-slate-400")}>
                        {s.short}
                      </button>
                    ))}
                  </div>
                  <Input className="w-full sm:w-56" placeholder="Observação" value={obs[b.id] ?? ""} onChange={(e) => setObs((o) => ({ ...o, [b.id]: e.target.value }))} />
                </Card>
              );
            })}
          </div>

          <div className="mt-5 flex justify-end">
            <Button size="lg" onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              {salvar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar chamada
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
