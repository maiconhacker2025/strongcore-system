import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { BeneficiarioForm, type Beneficiario, type FormHandle } from "@/components/BeneficiarioForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Trash2, Loader2, UserCheck, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { awardSave } from "@/lib/gamification";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/beneficiarios/$id")({
  component: () => (
    <AppShell><EditPage /></AppShell>
  ),
});

function EditPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<Beneficiario | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["beneficiario", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("beneficiarios").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => { if (data) setForm(data); }, [data]);

  const saveMut = useMutation({
    mutationFn: async (payload: Beneficiario) => {
      const { id: _id, created_at, updated_at, ...rest } = payload;
      const { error } = await supabase.from("beneficiarios").update(rest as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alterações salvas");
      qc.invalidateQueries({ queryKey: ["beneficiario", id] });
      qc.invalidateQueries({ queryKey: ["beneficiarios"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("beneficiarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Beneficiário excluído");
      navigate({ to: "/beneficiarios" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleAtivoMut = useMutation({
    mutationFn: async (ativo: boolean) => {
      const { error } = await supabase.from("beneficiarios").update({ ativo }).eq("id", id);
      if (error) throw error;
      return ativo;
    },
    onSuccess: (ativo) => {
      toast.success(ativo ? "Beneficiário ativado" : "Beneficiário inativado");
      setForm((f) => (f ? { ...f, ativo } : f));
      qc.invalidateQueries({ queryKey: ["beneficiario", id] });
      qc.invalidateQueries({ queryKey: ["beneficiarios"] });
      qc.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !form) {
    return <div className="p-10 flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Carregando...</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <Link to="/beneficiarios" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4" /> Voltar para a lista
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold">{form.nome}</h1>
          <p className="text-muted-foreground mt-1">
            Código {form.codigo ?? "—"} · {form.ativo ? "Ativo" : "Inativo"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={form.ativo ? "outline" : "default"}
            onClick={() => toggleAtivoMut.mutate(!form.ativo)}
            disabled={toggleAtivoMut.isPending}
          >
            {toggleAtivoMut.isPending ? <Loader2 className="size-4 animate-spin" />
              : form.ativo ? <><UserMinus className="size-4" /> Inativar</>
              : <><UserCheck className="size-4" /> Ativar</>}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive hover:text-destructive">
                <Trash2 className="size-4" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir este beneficiário?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Todos os dados de {form.nome} serão removidos permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => delMut.mutate()} className="bg-destructive text-destructive-foreground hover:opacity-90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>
            {saveMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Salvar alterações
          </Button>
        </div>
      </header>

      <BeneficiarioForm value={form} onChange={setForm} />

      <div className="mt-6 flex justify-end">
        <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} size="lg">
          {saveMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}
