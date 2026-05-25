import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus } from "lucide-react";

export const Route = createFileRoute("/beneficiarios/")({
  component: () => (
    <AppShell><ListPage /></AppShell>
  ),
});

type Filter = "todos" | "ativos" | "inativos";

function ListPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");

  const { data, isLoading } = useQuery({
    queryKey: ["beneficiarios", q, filter],
    queryFn: async () => {
      let query = supabase
        .from("beneficiarios")
        .select("id, nome, codigo, bairro, escola, escolaridade, ativo, classe_risco, data_nascimento, celular, whatsapp, genero, turno, nome_mae, responsavel")
        .order("nome", { ascending: true })
        .limit(500);
      if (q.trim()) query = query.ilike("nome", `%${q.trim()}%`);
      if (filter === "ativos") query = query.eq("ativo", true);
      if (filter === "inativos") query = query.eq("ativo", false);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Beneficiários</h1>
          <p className="text-muted-foreground mt-1">
            {data ? `${data.length} registro(s)` : "Carregando..."}
          </p>
        </div>
        <Link to="/beneficiarios/novo">
          <Button><UserPlus className="size-4" /> Novo cadastro</Button>
        </Link>
      </header>

      <Card className="p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-64">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {(["todos", "ativos", "inativos"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                filter === f ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">Nome</th>
                <th className="px-4 py-3 font-semibold">Cód.</th>
                <th className="px-4 py-3 font-semibold">Idade</th>
                <th className="px-4 py-3 font-semibold">Gênero</th>
                <th className="px-4 py-3 font-semibold">Escolaridade</th>
                <th className="px-4 py-3 font-semibold">Turno</th>
                <th className="px-4 py-3 font-semibold">Escola</th>
                <th className="px-4 py-3 font-semibold">Bairro</th>
                <th className="px-4 py-3 font-semibold">Responsável</th>
                <th className="px-4 py-3 font-semibold">Contato</th>
                <th className="px-4 py-3 font-semibold">Risco</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && (
                <tr><td colSpan={12} className="text-center py-10 text-muted-foreground">Carregando...</td></tr>
              )}
              {!isLoading && data?.length === 0 && (
                <tr><td colSpan={12} className="text-center py-10 text-muted-foreground">Nenhum beneficiário encontrado.</td></tr>
              )}
              {data?.map((b: any) => {
                const idade = b.data_nascimento
                  ? Math.floor((Date.now() - new Date(b.data_nascimento).getTime()) / (365.25 * 24 * 3600 * 1000))
                  : null;
                const contato = b.whatsapp || b.celular || "—";
                const resp = b.responsavel || b.nome_mae || "—";
                return (
                <tr key={b.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3">
                    <Link to="/beneficiarios/$id" params={{ id: b.id }} className="font-medium text-foreground hover:text-primary">
                      {b.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{b.codigo ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{idade !== null ? `${idade}a` : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.genero ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[140px]">{b.escolaridade ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.turno ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[180px]">{b.escola ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.bairro ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[140px]">{resp}</td>
                  <td className="px-4 py-3 text-muted-foreground">{contato}</td>
                  <td className="px-4 py-3">
                    {b.classe_risco === "Alto" && <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">Alto</span>}
                    {b.classe_risco === "Médio" && <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning-foreground font-medium">Médio</span>}
                    {b.classe_risco === "Baixo" && <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">Baixo</span>}
                    {!b.classe_risco && <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {b.ativo ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success font-medium">Ativo</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium">Inativo</span>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
