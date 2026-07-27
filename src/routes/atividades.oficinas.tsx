import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { AtividadesNav, AtividadesHeader } from "@/components/AtividadesNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Palette, Plus, Pencil, Trash2, Users2, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { DIAS_SEMANA, GRUPO_OPTIONS, GRUPOS } from "@/lib/grupos";
import { OFICINAS_SUGERIDAS, registrarHistorico, fetchAll } from "@/lib/atividades";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/atividades/oficinas")({
  component: () => <AppShell><Page /></AppShell>,
  head: () => ({
    meta: [
      { title: "Oficinas · Espaço Progredir" },
      { name: "description", content: "Cadastro e gestão das oficinas do Espaço Progredir: educadores, horários, capacidade e grupos." },
      { property: "og:title", content: "Oficinas · Espaço Progredir" },
      { property: "og:description", content: "Cadastro e gestão das oficinas do Espaço Progredir." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const vazio = {
  nome: "", descricao: "", objetivos: "", educador: "", auxiliar: "", sala: "",
  capacidade: "", dias_semana: [] as string[], horario_inicio: "", horario_fim: "",
  idade_min: "", idade_max: "", grupo: "ambos", status: "ativa", cor: "#0f766e",
  materiais: "", carga_horaria: "", numero_encontros: "", observacoes: "",
};

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(vazio);
  const [busca, setBusca] = useState("");

  const { data: oficinas = [] } = useQuery({
    queryKey: ["oficinas"],
    queryFn: () => fetchAll<any>("oficinas", "*", "nome"),
  });
  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas"], queryFn: () => fetchAll<any>("turmas"),
  });
  const { data: matriculas = [] } = useQuery({
    queryKey: ["matriculas"], queryFn: () => fetchAll<any>("matriculas"),
  });

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        capacidade: form.capacidade ? Number(form.capacidade) : null,
        idade_min: form.idade_min ? Number(form.idade_min) : null,
        idade_max: form.idade_max ? Number(form.idade_max) : null,
        carga_horaria: form.carga_horaria ? Number(form.carga_horaria) : null,
        numero_encontros: form.numero_encontros ? Number(form.numero_encontros) : null,
      };
      if (editing) {
        const { error } = await supabase.from("oficinas").update(payload).eq("id", editing.id);
        if (error) throw error;
        await registrarHistorico({ entidade: "oficina", entidade_id: editing.id, acao: "atualizou", descricao: `Oficina "${form.nome}" atualizada` });
      } else {
        const { data, error } = await supabase.from("oficinas").insert(payload).select("id").single();
        if (error) throw error;
        await registrarHistorico({ entidade: "oficina", entidade_id: data?.id, acao: "criou", descricao: `Oficina "${form.nome}" criada` });
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Oficina atualizada" : "Oficina criada");
      qc.invalidateQueries({ queryKey: ["oficinas"] });
      setOpen(false); setEditing(null); setForm(vazio);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (o: any) => {
      const { error } = await supabase.from("oficinas").delete().eq("id", o.id);
      if (error) throw error;
      await registrarHistorico({ entidade: "oficina", entidade_id: o.id, acao: "excluiu", descricao: `Oficina "${o.nome}" excluída` });
    },
    onSuccess: () => { toast.success("Oficina excluída"); qc.invalidateQueries({ queryKey: ["oficinas"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const abrirNovo = () => { setEditing(null); setForm(vazio); setOpen(true); };
  const abrirEdicao = (o: any) => {
    setEditing(o);
    setForm({
      ...vazio, ...o,
      capacidade: o.capacidade ?? "", idade_min: o.idade_min ?? "", idade_max: o.idade_max ?? "",
      carga_horaria: o.carga_horaria ?? "", numero_encontros: o.numero_encontros ?? "",
      dias_semana: o.dias_semana ?? [],
      descricao: o.descricao ?? "", objetivos: o.objetivos ?? "", educador: o.educador ?? "",
      auxiliar: o.auxiliar ?? "", sala: o.sala ?? "", materiais: o.materiais ?? "",
      observacoes: o.observacoes ?? "", horario_inicio: o.horario_inicio ?? "", horario_fim: o.horario_fim ?? "",
    });
    setOpen(true);
  };

  const toggleDia = (d: string) =>
    setForm((f: any) => ({
      ...f,
      dias_semana: f.dias_semana.includes(d) ? f.dias_semana.filter((x: string) => x !== d) : [...f.dias_semana, d],
    }));

  const lista = oficinas.filter((o: any) => o.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="p-6 md:p-10">
      <AtividadesNav />
      <AtividadesHeader
        icon={<Palette className="size-5" />}
        title="Oficinas"
        subtitle="Cadastre oficinas ilimitadas com educador, horários, faixa etária e grupo autorizado."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={abrirNovo} size="lg"><Plus className="size-4" /> Nova oficina</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Editar oficina" : "Nova oficina"}</DialogTitle></DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Nome da oficina *</Label>
                  <Input list="oficinas-sug" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Futebol, Robótica, Teatro..." />
                  <datalist id="oficinas-sug">{OFICINAS_SUGERIDAS.map((s) => <option key={s} value={s} />)}</datalist>
                </div>
                <div className="sm:col-span-2">
                  <Label>Descrição</Label>
                  <Textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Objetivos</Label>
                  <Textarea rows={2} value={form.objetivos} onChange={(e) => setForm({ ...form, objetivos: e.target.value })} />
                </div>
                <div><Label>Educador responsável</Label><Input value={form.educador} onChange={(e) => setForm({ ...form, educador: e.target.value })} /></div>
                <div><Label>Auxiliar</Label><Input value={form.auxiliar} onChange={(e) => setForm({ ...form, auxiliar: e.target.value })} /></div>
                <div><Label>Sala / Espaço</Label><Input value={form.sala} onChange={(e) => setForm({ ...form, sala: e.target.value })} /></div>
                <div><Label>Capacidade máxima</Label><Input type="number" value={form.capacidade} onChange={(e) => setForm({ ...form, capacidade: e.target.value })} /></div>
                <div className="sm:col-span-2">
                  <Label>Dias da semana</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {DIAS_SEMANA.map((d) => (
                      <button key={d.value} type="button" onClick={() => toggleDia(d.value)}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                          form.dias_semana.includes(d.value)
                            ? "bg-[#063b38] text-white border-[#063b38]"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-400")}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div><Label>Horário início</Label><Input type="time" value={form.horario_inicio} onChange={(e) => setForm({ ...form, horario_inicio: e.target.value })} /></div>
                <div><Label>Horário fim</Label><Input type="time" value={form.horario_fim} onChange={(e) => setForm({ ...form, horario_fim: e.target.value })} /></div>
                <div><Label>Idade mínima</Label><Input type="number" value={form.idade_min} onChange={(e) => setForm({ ...form, idade_min: e.target.value })} /></div>
                <div><Label>Idade máxima</Label><Input type="number" value={form.idade_max} onChange={(e) => setForm({ ...form, idade_max: e.target.value })} /></div>
                <div>
                  <Label>Grupo permitido</Label>
                  <Select value={form.grupo} onValueChange={(v) => setForm({ ...form, grupo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{GRUPO_OPTIONS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativa">Ativa</SelectItem>
                      <SelectItem value="inativa">Inativa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Carga horária (h)</Label><Input type="number" value={form.carga_horaria} onChange={(e) => setForm({ ...form, carga_horaria: e.target.value })} /></div>
                <div><Label>Nº de encontros</Label><Input type="number" value={form.numero_encontros} onChange={(e) => setForm({ ...form, numero_encontros: e.target.value })} /></div>
                <div>
                  <Label>Cor de identificação</Label>
                  <Input type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} className="h-10 p-1" />
                </div>
                <div className="sm:col-span-2"><Label>Materiais utilizados</Label><Textarea rows={2} value={form.materiais} onChange={(e) => setForm({ ...form, materiais: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Observações</Label><Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={() => form.nome ? salvar.mutate() : toast.error("Informe o nome da oficina")} disabled={salvar.isPending}>
                  Salvar oficina
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Input placeholder="Buscar oficina..." value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-sm mb-5" />

      {lista.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <Palette className="size-8 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Nenhuma oficina cadastrada ainda. Clique em “Nova oficina”.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((o: any) => {
            const ts = turmas.filter((t: any) => t.oficina_id === o.id);
            const alunos = matriculas.filter((m: any) => ts.some((t: any) => t.id === m.turma_id) && m.status === "ativa").length;
            const g = o.grupo === "ambos" ? null : GRUPOS[o.grupo as "crescer" | "jovem"];
            return (
              <Card key={o.id} className="overflow-hidden border-slate-200 hover:shadow-lg transition-all hover:-translate-y-0.5">
                <div className="h-1.5" style={{ background: o.cor }} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-slate-900 truncate">{o.nome}</h3>
                      <p className="text-[12px] text-slate-500 line-clamp-2 mt-0.5">{o.descricao || "Sem descrição"}</p>
                    </div>
                    <span className={cn("text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider shrink-0",
                      o.status === "ativa" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                      {o.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {g && <span className={cn("text-[11px] px-2 py-0.5 rounded-full border", g.corBg, g.corTexto, g.corBorda)}>{g.icone} {g.nome}</span>}
                    {o.grupo === "ambos" && <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">🌱🚀 Ambos</span>}
                    {(o.idade_min || o.idade_max) && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {o.idade_min ?? "?"}–{o.idade_max ?? "?"} anos
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-1 text-[12.5px] text-slate-600">
                    {o.educador && <p className="flex items-center gap-1.5"><Users2 className="size-3.5 text-slate-400" /> {o.educador}</p>}
                    {(o.horario_inicio || o.dias_semana?.length) && (
                      <p className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-slate-400" />
                        {(o.dias_semana ?? []).map((d: string) => DIAS_SEMANA.find((x) => x.value === d)?.label).join(", ")}
                        {o.horario_inicio ? ` · ${o.horario_inicio}${o.horario_fim ? `–${o.horario_fim}` : ""}` : ""}
                      </p>
                    )}
                    {o.sala && <p className="flex items-center gap-1.5"><MapPin className="size-3.5 text-slate-400" /> {o.sala}</p>}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <div className="text-[12px] text-slate-500">
                      <b className="text-slate-800">{ts.length}</b> turma(s) · <b className="text-slate-800">{alunos}</b> aluno(s)
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => abrirEdicao(o)}><Pencil className="size-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive"
                        onClick={() => confirm(`Excluir a oficina "${o.nome}"?`) && excluir.mutate(o)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
