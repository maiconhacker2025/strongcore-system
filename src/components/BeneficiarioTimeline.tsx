import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Clock, Plus, Trash2, MessageSquare, Phone, School, Heart, AlertTriangle, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPOS = [
  { value: "observacao", label: "Observação", icon: MessageSquare, color: "text-slate-600 bg-slate-100" },
  { value: "atendimento", label: "Atendimento", icon: Users, color: "text-teal-700 bg-teal-100" },
  { value: "contato", label: "Contato / Ligação", icon: Phone, color: "text-blue-700 bg-blue-100" },
  { value: "escola", label: "Escola", icon: School, color: "text-indigo-700 bg-indigo-100" },
  { value: "saude", label: "Saúde", icon: Heart, color: "text-rose-700 bg-rose-100" },
  { value: "alerta", label: "Alerta / Ocorrência", icon: AlertTriangle, color: "text-amber-700 bg-amber-100" },
];

const tipoMeta = (t: string) => TIPOS.find((x) => x.value === t) ?? TIPOS[0];

export function BeneficiarioTimeline({ beneficiarioId }: { beneficiarioId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    tipo: "atendimento",
    titulo: "",
    descricao: "",
    autor: "",
  });

  const { data: eventos = [] } = useQuery({
    queryKey: ["eventos", beneficiarioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiario_eventos" as any)
        .select("*")
        .eq("beneficiario_id", beneficiarioId)
        .order("data", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("beneficiario_eventos" as any).insert({
        beneficiario_id: beneficiarioId,
        ...form,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento registrado");
      qc.invalidateQueries({ queryKey: ["eventos", beneficiarioId] });
      setOpen(false);
      setForm({ data: new Date().toISOString().slice(0, 10), tipo: "atendimento", titulo: "", descricao: "", autor: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("beneficiario_eventos" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["eventos", beneficiarioId] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-teal-700" />
          <h3 className="font-display font-semibold text-lg">Linha do tempo</h3>
          <span className="text-xs text-muted-foreground">({eventos.length} registro(s))</span>
        </div>
        <Button size="sm" onClick={() => setOpen((o) => !o)}>
          <Plus className="size-4" /> {open ? "Cancelar" : "Novo evento"}
        </Button>
      </div>

      {open && (
        <div className="mb-6 p-4 rounded-lg border-2 border-dashed border-teal-300 bg-teal-50/40 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Data</Label>
              <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Autor (quem registrou)</Label>
              <Input value={form.autor} onChange={(e) => setForm({ ...form, autor: e.target.value })} placeholder="Ex: Renata" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Título</Label>
            <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Resumo curto" />
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Detalhes do atendimento, observação, follow-up..." />
          </div>
          <Button size="sm" onClick={() => addMut.mutate()} disabled={!form.titulo || addMut.isPending}>Registrar</Button>
        </div>
      )}

      {eventos.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          Nenhum evento registrado ainda. Clique em "Novo evento" para começar.
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
          {eventos.map((ev: any) => {
            const meta = tipoMeta(ev.tipo);
            const Icon = meta.icon;
            return (
              <div key={ev.id} className="relative">
                <div className={`absolute -left-6 top-1 size-5 rounded-full flex items-center justify-center ${meta.color}`}>
                  <Icon className="size-3" />
                </div>
                <div className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{ev.titulo}</span>
                      <span>·</span>
                      <span>{format(new Date(ev.data), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}</span>
                      <span>·</span>
                      <span className={`px-1.5 py-0.5 rounded ${meta.color}`}>{meta.label}</span>
                      {ev.autor && <><span>·</span><span>{ev.autor}</span></>}
                    </div>
                    {ev.descricao && <p className="text-sm mt-1.5 whitespace-pre-wrap">{ev.descricao}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => delMut.mutate(ev.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
