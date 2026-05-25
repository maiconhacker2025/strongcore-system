import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

export function QuickSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data, isFetching } = useQuery({
    queryKey: ["quicksearch", q],
    queryFn: async () => {
      if (q.trim().length < 2) return [];
      const term = `%${q.trim()}%`;
      const { data, error } = await supabase
        .from("beneficiarios")
        .select("id, nome, codigo, bairro, escola, ativo")
        .or(`nome.ilike.${term},escola.ilike.${term},bairro.ilike.${term}`)
        .order("nome")
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
    enabled: q.trim().length >= 2,
  });

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        placeholder="Busca rápida (nome, escola, bairro)..."
        className="pl-9"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-lg shadow-lg overflow-hidden">
          {isFetching && (
            <div className="px-3 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="size-3 animate-spin" /> Buscando...
            </div>
          )}
          {!isFetching && data?.length === 0 && (
            <div className="px-3 py-3 text-sm text-muted-foreground">Nenhum resultado.</div>
          )}
          {data?.map((r: any) => (
            <button
              key={r.id}
              onClick={() => {
                navigate({ to: "/beneficiarios/$id", params: { id: r.id } });
                setOpen(false);
                setQ("");
              }}
              className="w-full text-left px-3 py-2.5 hover:bg-muted flex items-center gap-3 border-b last:border-0"
            >
              <div className="size-8 rounded-full bg-primary-soft text-primary flex items-center justify-center text-sm font-semibold">
                {r.nome?.[0] ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{r.nome}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {[r.escola, r.bairro].filter(Boolean).join(" • ") || `Código ${r.codigo ?? "—"}`}
                </div>
              </div>
              {r.ativo ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">Ativo</span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">Inativo</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
