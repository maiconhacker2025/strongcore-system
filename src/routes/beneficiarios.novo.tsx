import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { BeneficiarioForm, type Beneficiario, type FormHandle } from "@/components/BeneficiarioForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { awardSave } from "@/lib/gamification";

export const Route = createFileRoute("/beneficiarios/novo")({
  component: () => (
    <AppShell><NewPage /></AppShell>
  ),
});

function NewPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<Beneficiario>({ nome: "", ativo: true });
  const formRef = useRef<FormHandle>(null);

  const mut = useMutation({
    mutationFn: async (payload: Beneficiario) => {
      if (!payload.nome?.trim()) throw new Error("Informe o nome do beneficiário");
      const { data, error } = await supabase
        .from("beneficiarios")
        .insert(payload as any)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      toast.success("Beneficiário cadastrado");
      awardSave({
        fieldsFilled: formRef.current?.filledFields() ?? 0,
        totalFields: formRef.current?.totalFields ?? 0,
        startedAt: formRef.current?.startedAt ?? null,
      });
      navigate({ to: "/beneficiarios/$id", params: { id: d.id } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <Link to="/beneficiarios" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4" /> Voltar para a lista
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Novo beneficiário</h1>
          <p className="text-muted-foreground mt-1">Preencha os dados para cadastrar uma nova criança ou jovem no projeto.</p>
        </div>
        <Button onClick={() => mut.mutate(form)} disabled={mut.isPending} size="lg">
          {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar cadastro
        </Button>
      </header>

      <BeneficiarioForm value={form} onChange={setForm} />

      <div className="mt-6 flex justify-end">
        <Button onClick={() => mut.mutate(form)} disabled={mut.isPending} size="lg">
          {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar cadastro
        </Button>
      </div>
    </div>
  );
}
