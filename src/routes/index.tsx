import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Users, UserCheck, AlertTriangle, GraduationCap, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: () => (
    <AppShell>
      <Dashboard />
    </AppShell>
  ),
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [total, ativos, risco, recentes] = await Promise.all([
        supabase.from("beneficiarios").select("*", { count: "exact", head: true }),
        supabase.from("beneficiarios").select("*", { count: "exact", head: true }).eq("ativo", true),
        supabase.from("beneficiarios").select("*", { count: "exact", head: true }).eq("classe_risco", "Alto"),
        supabase.from("beneficiarios").select("id, nome, bairro, escola, ativo, classe_risco").order("created_at", { ascending: false }).limit(8),
      ]);
      return {
        total: total.count ?? 0,
        ativos: ativos.count ?? 0,
        risco: risco.count ?? 0,
        recentes: recentes.data ?? [],
      };
    },
  });

  const stats = [
    { label: "Total cadastrados", value: data?.total ?? "—", icon: Users, color: "text-primary bg-primary-soft" },
    { label: "Beneficiários ativos", value: data?.ativos ?? "—", icon: UserCheck, color: "text-success bg-success/10" },
    { label: "Classe de risco alto", value: data?.risco ?? "—", icon: AlertTriangle, color: "text-destructive bg-destructive/10" },
    { label: "Em acompanhamento", value: data ? (data.ativos) : "—", icon: GraduationCap, color: "text-accent-foreground bg-accent" },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold">Painel geral</h1>
        <p className="text-muted-foreground mt-1">Visão consolidada dos beneficiários cadastrados.</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-5">
              <div className={`size-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <Icon className="size-5" />
              </div>
              <div className="mt-4">
                <div className="text-3xl font-display font-bold">{s.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-display font-semibold">Cadastros recentes</h2>
          <Link to="/beneficiarios" className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1">
            Ver todos <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="divide-y">
          {(data?.recentes ?? []).map((b: any) => (
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
