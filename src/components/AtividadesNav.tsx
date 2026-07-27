import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Palette, Users2, CalendarDays, ClipboardCheck, PartyPopper,
  FolderKanban, Star, FileBarChart2, TrendingUp, Award, History,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/atividades", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/atividades/oficinas", label: "Oficinas", icon: Palette },
  { to: "/atividades/turmas", label: "Turmas", icon: Users2 },
  { to: "/atividades/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/atividades/frequencia", label: "Frequência", icon: ClipboardCheck },
  { to: "/atividades/eventos", label: "Eventos", icon: PartyPopper },
  { to: "/atividades/projetos", label: "Projetos", icon: FolderKanban },
  { to: "/atividades/avaliacoes", label: "Avaliações", icon: Star },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart2 },
  { to: "/atividades/indicadores", label: "Indicadores", icon: TrendingUp },
  { to: "/atividades/certificados", label: "Certificados", icon: Award },
  { to: "/atividades/historico", label: "Histórico", icon: History },
] as const;

export function AtividadesNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="sticky top-20 z-20 -mx-6 md:-mx-10 px-6 md:px-10 py-3 bg-white/85 backdrop-blur border-b border-slate-200 mb-8">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {items.map((i) => {
          const Icon = i.icon;
          const active = (i as any).exact ? path === i.to : path.startsWith(i.to);
          return (
            <Link
              key={i.to}
              to={i.to}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] whitespace-nowrap transition-all",
                active
                  ? "bg-[#063b38] text-white shadow-sm font-semibold"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <Icon className="size-3.5" />
              {i.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AtividadesHeader({
  title, subtitle, action, icon,
}: { title: string; subtitle?: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 mb-7 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="size-11 rounded-2xl bg-[#063b38] text-white grid place-items-center shadow-lg shadow-teal-900/20 shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-[26px] md:text-3xl font-display font-bold text-slate-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-slate-500 text-sm mt-1 max-w-2xl">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}
