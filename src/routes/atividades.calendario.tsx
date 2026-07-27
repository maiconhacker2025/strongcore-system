import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AtividadesNav, AtividadesHeader } from "@/components/AtividadesNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchAll } from "@/lib/atividades";
import { DIA_INDEX, DIAS_SEMANA } from "@/lib/grupos";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, format, isSameMonth, isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/atividades/calendario")({
  component: () => <AppShell><Page /></AppShell>,
  head: () => ({
    meta: [
      { title: "Calendário de Atividades · Espaço Progredir" },
      { name: "description", content: "Calendário mensal das oficinas, turmas, eventos e aniversários do Espaço Progredir." },
      { property: "og:title", content: "Calendário de Atividades · Espaço Progredir" },
      { property: "og:description", content: "Oficinas, eventos e aniversários em um só calendário." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Page() {
  const [ref, setRef] = useState(new Date());
  const { data: turmas = [] } = useQuery({ queryKey: ["turmas"], queryFn: () => fetchAll<any>("turmas") });
  const { data: oficinas = [] } = useQuery({ queryKey: ["oficinas"], queryFn: () => fetchAll<any>("oficinas") });
  const { data: eventos = [] } = useQuery({ queryKey: ["eventos-at"], queryFn: () => fetchAll<any>("eventos") });
  const { data: beneficiarios = [] } = useQuery({
    queryKey: ["beneficiarios-aniv"],
    queryFn: () => fetchAll<any>("beneficiarios", "id,nome,ativo,data_nascimento"),
  });

  const oficinaMap = new Map(oficinas.map((o: any) => [o.id, o]));
  const dias = eachDayOfInterval({
    start: startOfWeek(startOfMonth(ref), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(ref), { weekStartsOn: 0 }),
  });

  return (
    <div className="p-6 md:p-10">
      <AtividadesNav />
      <AtividadesHeader
        icon={<CalendarDays className="size-5" />}
        title="Calendário"
        subtitle="Oficinas recorrentes, eventos e aniversários do mês."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setRef(addMonths(ref, -1))}><ChevronLeft className="size-4" /></Button>
            <span className="font-display font-bold text-slate-900 capitalize min-w-[170px] text-center">
              {format(ref, "MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <Button variant="outline" size="icon" onClick={() => setRef(addMonths(ref, 1))}><ChevronRight className="size-4" /></Button>
          </div>
        }
      />

      <Card className="p-3 border-slate-200 overflow-x-auto">
        <div className="grid grid-cols-7 gap-1 min-w-[820px]">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
            <div key={d} className="text-[11px] uppercase tracking-wider font-bold text-slate-400 text-center py-2">{d}</div>
          ))}
          {dias.map((d) => {
            const dow = d.getDay();
            const ts = turmas.filter((t: any) => t.status === "ativa" && (t.dias_semana ?? []).some((x: string) => DIA_INDEX[x] === dow));
            const evs = eventos.filter((e: any) => e.data === format(d, "yyyy-MM-dd"));
            const anivs = beneficiarios.filter((b: any) =>
              b.ativo && b.data_nascimento && format(new Date(b.data_nascimento), "MM-dd") === format(d, "MM-dd"));
            return (
              <div key={d.toISOString()}
                className={cn("min-h-[110px] rounded-lg border p-1.5 space-y-1",
                  isSameMonth(d, ref) ? "bg-white border-slate-200" : "bg-slate-50/60 border-slate-100",
                  isToday(d) && "ring-2 ring-[#063b38]")}>
                <p className={cn("text-[11px] font-bold", isToday(d) ? "text-[#063b38]" : "text-slate-400")}>{format(d, "d")}</p>
                {ts.slice(0, 3).map((t: any) => (
                  <p key={t.id} className="text-[10px] rounded px-1 py-0.5 text-white truncate" style={{ background: oficinaMap.get(t.oficina_id)?.cor ?? "#0f766e" }}>
                    {t.horario_inicio ? `${t.horario_inicio} ` : ""}{t.nome}
                  </p>
                ))}
                {ts.length > 3 && <p className="text-[10px] text-slate-400">+{ts.length - 3} oficina(s)</p>}
                {evs.map((e: any) => (
                  <p key={e.id} className="text-[10px] rounded px-1 py-0.5 bg-amber-100 text-amber-800 truncate">🎉 {e.nome}</p>
                ))}
                {anivs.slice(0, 2).map((b: any) => (
                  <p key={b.id} className="text-[10px] rounded px-1 py-0.5 bg-pink-50 text-pink-700 truncate">🎂 {b.nome.split(" ")[0]}</p>
                ))}
              </div>
            );
          })}
        </div>
      </Card>

      <p className="text-[12px] text-slate-500 mt-3">
        Legenda: barras coloridas = turmas recorrentes ({DIAS_SEMANA.map((d) => d.label).join(", ")}), 🎉 eventos, 🎂 aniversários.
      </p>
    </div>
  );
}
