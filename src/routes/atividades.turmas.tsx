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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users2, Plus, Pencil, Trash2, UserPlus, AlertTriangle, Clock, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { DIAS_SEMANA, GRUPOS, grupoDoBeneficiario, idadeDe } from "@/lib/grupos";
import { fetchAll, registrarHistorico } from "@/lib/atividades";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/atividades/turmas")({
  component: () => <AppShell><Page /></AppShell>,
  head: () => ({
    meta: [
      { title: "Turmas e Matrículas · Espaço Progredir" },
      { name: "description", content: "Turmas das oficinas, vagas, lista de espera e matrícula dos beneficiários do Espaço Progredir." },
      { property: "og:title", content: "Turmas e Matrículas · Espaço Progredir" },
      { property: "og:description", content: "Turmas das oficinas, vagas, lista de espera e matrículas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const vazio = {
  oficina_id: "", nome: "", professor: "", auxiliar: "", sala: "",
  dias_semana: [] as string[], horario_inicio: "", horario_fim: "",
  limite_alunos: "", status: "ativa", observacoes: "",
};

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(vazio);
  const [matriculaTurma, setMatriculaTurma] = useState<any>(null);
  const [buscaBenef, setBuscaBenef] = useState("");

  const { data: oficinas = [] } = useQuery({ queryKey: ["oficinas"], queryFn: () => fetchAll<any>("oficinas", "*", "nome") });
  const { data: turmas = [] } = useQuery({ queryKey: ["turmas"], queryFn: () => fetchAll<any>("turmas", "*", "nome") });
  const { data: matriculas = [] } = useQuery({ queryKey: ["matriculas"], queryFn: () => fetchAll<any>("matriculas") });
  const { data: beneficiarios = [] } = useQuery({
    queryKey: ["beneficiarios-min"],
    queryFn: () => fetchAll<any>("beneficiarios", "id,nome,ativo,data_nascimento,responsavel,nome_responsavel,tel_responsavel,whatsapp,alergia,medicacao,observacoes", "nome"),
  });

  const oficinaMap = useMemo(() => new Map(oficinas.map((o: any) => [o.id, o])), [oficinas]);
  const benefMap = useMemo(() => new Map(beneficiarios.map((b: any) => [b.id, b])), [beneficiarios]);

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = { ...form, limite_alunos: form.limite_alunos ? Number(form.limite_alunos) : null };
      if (editing) {
        const { error } = await supabase.from("turmas").update(payload).eq("id", editing.id);
        if (error) throw error;
        await registrarHistorico({ entidade: "turma", entidade_id: editing.id, acao: "atualizou", descricao: `Turma "${form.nome}" atualizada` });
      } else {
        const { data, error } = await supabase.from("turmas").insert(payload).select("id").single();
        if (error) throw error;
        await registrarHistorico({ entidade: "turma", entidade_id: data?.id, acao: "criou", descricao: `Turma "${form.nome}" criada` });
      }
    },
    onSuccess: () => {
      toast.success("Turma salva");
      qc.invalidateQueries({ queryKey: ["turmas"] });
      setOpen(false); setEditing(null); setForm(vazio);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (t: any) => {
      const { error } = await supabase.from("turmas").delete().eq("id", t.id);
      if (error) throw error;
      await registrarHistorico({ entidade: "turma", entidade_id: t.id, acao: "excluiu", descricao: `Turma "${t.nome}" excluída` });
    },
    onSuccess: () => { toast.success("Turma excluída"); qc.invalidateQueries({ queryKey: ["turmas"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const matricular = useMutation({
    mutationFn: async ({ turma, benef, espera }: any) => {
      const { error } = await supabase.from("matriculas").insert({
        turma_id: turma.id, beneficiario_id: benef.id, lista_espera: espera, status: "ativa",
      });
      if (error) throw error;
      await registrarHistorico({
        entidade: "matricula", beneficiario_id: benef.id, acao: "matriculou",
        descricao: `${benef.nome} matriculado(a) em ${oficinaMap.get(turma.oficina_id)?.nome ?? ""} — ${turma.nome}${espera ? " (lista de espera)" : ""}`,
      });
    },
    onSuccess: () => { toast.success("Matrícula realizada"); qc.invalidateQueries({ queryKey: ["matriculas"] }); },
    onError: (e: any) => toast.error(e.message.includes("duplicate") ? "Beneficiário já está nesta turma" : e.message),
  });

  const desmatricular = useMutation({
    mutationFn: async (m: any) => {
      const { error } = await supabase.from("matriculas").delete().eq("id", m.id);
      if (error) throw error;
      await registrarHistorico({
        entidade: "matricula", beneficiario_id: m.beneficiario_id, acao: "desmatriculou",
        descricao: `${benefMap.get(m.beneficiario_id)?.nome ?? "Beneficiário"} removido(a) da turma`,
      });
    },
    onSuccess: () => { toast.success("Matrícula removida"); qc.invalidateQueries({ queryKey: ["matriculas"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleDia = (d: string) =>
    setForm((f: any) => ({ ...f, dias_semana: f.dias_semana.includes(d) ? f.dias_semana.filter((x: string) => x !== d) : [...f.dias_semana, d] }));

  const abrirNovo = () => { setEditing(null); setForm(vazio); setOpen(true); };
  const abrirEdicao = (t: any) => {
    setEditing(t);
    setForm({ ...vazio, ...t, limite_alunos: t.limite_alunos ?? "", dias_semana: t.dias_semana ?? [],
      professor: t.professor ?? "", auxiliar: t.auxiliar ?? "", sala: t.sala ?? "",
      horario_inicio: t.horario_inicio ?? "", horario_fim: t.horario_fim ?? "", observacoes: t.observacoes ?? "" });
    setOpen(true);
  };

  const matriculasDa = (tid: string) => matriculas.filter((m: any) => m.turma_id === tid);

  return (
    <div className="p-6 md:p-10">
      <AtividadesNav />
      <AtividadesHeader
        icon={<Users2 className="size-5" />}
        title="Turmas & Matrículas"
        subtitle="Cada oficina pode ter várias turmas. Controle vagas, lista de espera e matrículas."
        action={<Button size="lg" onClick={abrirNovo}><Plus className="size-4" /> Nova turma</Button>}
      />

      {turmas.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <Users2 className="size-8 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Nenhuma turma criada. Cadastre uma oficina e depois crie turmas (ex.: Futebol A, Futebol Sub13).</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {turmas.map((t: any) => {
            const of = oficinaMap.get(t.oficina_id);
            const mats = matriculasDa(t.id);
            const ativos = mats.filter((m: any) => !m.lista_espera);
            const espera = mats.filter((m: any) => m.lista_espera);
            const vagas = t.limite_alunos ? t.limite_alunos - ativos.length : null;
            const lotada = vagas !== null && vagas <= 0;
            return (
              <Card key={t.id} className="border-slate-200 overflow-hidden">
                <div className="h-1.5" style={{ background: of?.cor ?? "#0f766e" }} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">{of?.nome ?? "Oficina"}</p>
                      <h3 className="font-display font-bold text-lg text-slate-900">{t.nome}</h3>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => abrirEdicao(t)}><Pencil className="size-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive"
                        onClick={() => confirm(`Excluir a turma "${t.nome}"?`) && excluir.mutate(t)}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </div>

                  <div className="mt-2 space-y-1 text-[12.5px] text-slate-600">
                    {t.professor && <p className="flex items-center gap-1.5"><Users2 className="size-3.5 text-slate-400" /> {t.professor}{t.auxiliar ? ` · aux. ${t.auxiliar}` : ""}</p>}
                    <p className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-slate-400" />
                      {(t.dias_semana ?? []).map((d: string) => DIAS_SEMANA.find((x) => x.value === d)?.label).join(", ") || "Dias não definidos"}
                      {t.horario_inicio ? ` · ${t.horario_inicio}${t.horario_fim ? `–${t.horario_fim}` : ""}` : ""}
                    </p>
                    {t.sala && <p className="flex items-center gap-1.5"><MapPin className="size-3.5 text-slate-400" /> {t.sala}</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="text-[11.5px] px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-semibold">
                      {ativos.length} matriculado(s)
                    </span>
                    {t.limite_alunos && (
                      <span className={cn("text-[11.5px] px-2.5 py-1 rounded-full border font-semibold",
                        lotada ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
                        {lotada ? "Turma lotada" : `${vagas} vaga(s)`}
                      </span>
                    )}
                    {espera.length > 0 && (
                      <span className="text-[11.5px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                        {espera.length} em espera
                      </span>
                    )}
                    <Button size="sm" variant="outline" className="ml-auto" onClick={() => { setMatriculaTurma(t); setBuscaBenef(""); }}>
                      <UserPlus className="size-3.5" /> Matricular
                    </Button>
                  </div>

                  {mats.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {mats.map((m: any) => {
                        const b = benefMap.get(m.beneficiario_id);
                        const g = b ? grupoDoBeneficiario(b) : GRUPOS.outros;
                        return (
                          <span key={m.id}
                            className={cn("group text-[11.5px] px-2 py-1 rounded-full border flex items-center gap-1",
                              m.lista_espera ? "bg-amber-50 text-amber-800 border-amber-200" : `${g.corBg} ${g.corTexto} ${g.corBorda}`)}>
                            {g.icone} {b?.nome ?? "—"}
                            <button onClick={() => desmatricular.mutate(m)} className="opacity-40 hover:opacity-100"><X className="size-3" /></button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog turma */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar turma" : "Nova turma"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Oficina *</Label>
              <Select value={form.oficina_id} onValueChange={(v) => setForm({ ...form, oficina_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a oficina" /></SelectTrigger>
                <SelectContent>{oficinas.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Nome da turma *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Futebol Sub13" /></div>
            <div><Label>Professor</Label><Input value={form.professor} onChange={(e) => setForm({ ...form, professor: e.target.value })} /></div>
            <div><Label>Auxiliar</Label><Input value={form.auxiliar} onChange={(e) => setForm({ ...form, auxiliar: e.target.value })} /></div>
            <div><Label>Sala</Label><Input value={form.sala} onChange={(e) => setForm({ ...form, sala: e.target.value })} /></div>
            <div><Label>Limite de alunos</Label><Input type="number" value={form.limite_alunos} onChange={(e) => setForm({ ...form, limite_alunos: e.target.value })} /></div>
            <div className="sm:col-span-2">
              <Label>Dias da semana</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {DIAS_SEMANA.map((d) => (
                  <button key={d.value} type="button" onClick={() => toggleDia(d.value)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                      form.dias_semana.includes(d.value) ? "bg-[#063b38] text-white border-[#063b38]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400")}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div><Label>Horário início</Label><Input type="time" value={form.horario_inicio} onChange={(e) => setForm({ ...form, horario_inicio: e.target.value })} /></div>
            <div><Label>Horário fim</Label><Input type="time" value={form.horario_fim} onChange={(e) => setForm({ ...form, horario_fim: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Observações</Label><Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={salvar.isPending}
              onClick={() => (form.oficina_id && form.nome) ? salvar.mutate() : toast.error("Informe a oficina e o nome da turma")}>
              Salvar turma
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog matrícula */}
      <Dialog open={!!matriculaTurma} onOpenChange={(o) => !o && setMatriculaTurma(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Matricular em {oficinaMap.get(matriculaTurma?.oficina_id)?.nome} — {matriculaTurma?.nome}</DialogTitle>
          </DialogHeader>
          <Input autoFocus placeholder="Buscar beneficiário pelo nome..." value={buscaBenef} onChange={(e) => setBuscaBenef(e.target.value)} />
          <div className="space-y-2 max-h-[52vh] overflow-y-auto">
            {beneficiarios
              .filter((b: any) => b.ativo && b.nome.toLowerCase().includes(buscaBenef.toLowerCase()))
              .filter((b: any) => !matriculas.some((m: any) => m.turma_id === matriculaTurma?.id && m.beneficiario_id === b.id))
              .slice(0, 40)
              .map((b: any) => {
                const g = grupoDoBeneficiario(b);
                const idade = idadeDe(b.data_nascimento);
                const of = oficinaMap.get(matriculaTurma?.oficina_id);
                const grupoIncompativel = of && of.grupo !== "ambos" && of.grupo !== g.key;
                const idadeIncompativel = of && idade != null &&
                  ((of.idade_min && idade < of.idade_min) || (of.idade_max && idade > of.idade_max));
                const mats = matriculasDa(matriculaTurma?.id ?? "").filter((m: any) => !m.lista_espera);
                const lotada = matriculaTurma?.limite_alunos ? mats.length >= matriculaTurma.limite_alunos : false;
                return (
                  <div key={b.id} className="rounded-xl border border-slate-200 p-3 flex items-start gap-3">
                    <div className={cn("size-10 rounded-full grid place-items-center text-lg shrink-0", g.corBg)}>{g.icone}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-slate-900">{b.nome}</p>
                      <p className="text-[11.5px] text-slate-500">
                        {idade != null ? `${idade} anos · ` : ""}{g.nome}
                        {b.nome_responsavel ? ` · Resp.: ${b.nome_responsavel}` : ""}
                        {b.tel_responsavel || b.whatsapp ? ` · ${b.tel_responsavel || b.whatsapp}` : ""}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {b.alergia && <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">Alergia</span>}
                        {b.medicacao && <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">Medicação</span>}
                        {(grupoIncompativel || idadeIncompativel) && (
                          <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1">
                            <AlertTriangle className="size-3" /> Idade/grupo incompatível
                          </span>
                        )}
                        {lotada && <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">Turma lotada</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button size="sm" onClick={() => matricular.mutate({ turma: matriculaTurma, benef: b, espera: false })}>Matricular</Button>
                      <Button size="sm" variant="outline" onClick={() => matricular.mutate({ turma: matriculaTurma, benef: b, espera: true })}>Lista de espera</Button>
                    </div>
                  </div>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
