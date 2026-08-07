import { Link, useRouterState } from "@tanstack/react-router";
import {
  Users, LayoutDashboard, UserPlus, Sparkles, Download,
  UserCheck, UserMinus, FileBarChart2, Award, AlertTriangle, FileSpreadsheet, ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickSearch } from "@/components/QuickSearch";
import { Button } from "@/components/ui/button";
import { runFullBackup, daysSinceBackup } from "@/lib/backup";
import { AuthGate, LogoutButton } from "@/components/AuthGate";
import { GamificationHUD } from "@/components/GamificationHUD";
import logo from "@/assets/logo-progredir.jpg";
import { useEffect, useState } from "react";

const navGroups = [
  {
    label: "Gestão Principal",
    items: [
      { to: "/", label: "Painel Geral", icon: LayoutDashboard, exact: true },
      { to: "/beneficiarios", label: "Todos beneficiários", icon: Users, exact: true, search: {} },
      { to: "/beneficiarios", label: "Ativos", icon: UserCheck, search: { status: "ativos" }, match: "ativos" },
      { to: "/beneficiarios", label: "Inativos", icon: UserMinus, search: { status: "inativos" }, match: "inativos" },
    ],
  },
  {
    label: "Atividades",
    items: [
      { to: "/atividades", label: "Painel de Atividades", icon: Sparkles, exact: true },
      { to: "/atividades/oficinas", label: "Oficinas", icon: Award },
      { to: "/atividades/turmas", label: "Turmas & Matrículas", icon: Users },
      { to: "/atividades/frequencia", label: "Frequência", icon: UserCheck },
      { to: "/presenca", label: "Lista de Presença", icon: ClipboardList },
      { to: "/atividades/calendario", label: "Calendário", icon: FileBarChart2 },

    ],
  },
  {
    label: "Operacional",
    items: [
      { to: "/beneficiarios/novo", label: "Cadastrar", icon: UserPlus },
      { to: "/importar", label: "Importar planilha", icon: FileSpreadsheet },
      { to: "/alertas", label: "Central de Alertas", icon: AlertTriangle },
      { to: "/relatorios", label: "Relatórios", icon: FileBarChart2 },
      { to: "/ia", label: "Assistente IA", icon: Sparkles },
    ],
  },
] as const;


export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => { setDays(daysSinceBackup()); }, []);

  const doBackup = async () => {
    setBusy(true);
    await runFullBackup();
    setDays(0);
    setBusy(false);
  };

  const currentStatus = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("status")
    : null;

  return (
    <AuthGate>
    <div className="min-h-screen flex bg-[#f6f7f5]">
      <aside className="hidden md:flex w-72 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0">
        {/* Brand */}
        <div className="px-6 pt-7 pb-6">
          <div className="flex items-center gap-3.5 group cursor-default">
            <div className="relative shrink-0">
              <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-amber-400/50 via-teal-300/25 to-transparent blur-xl opacity-70 group-hover:opacity-100 transition-opacity animate-logo-glow" />
              <div className="absolute -inset-0.5 rounded-full bg-[conic-gradient(from_0deg,#fbbf24,#5eead4,#fbbf24)] opacity-80 animate-logo-spin" />
              <div className="relative size-12 rounded-full bg-white p-[3px] shadow-xl shadow-black/40 overflow-hidden animate-logo-float">
                <img src={logo} alt="Espaço Progredir" className="size-full object-cover rounded-full transition-transform duration-500 group-hover:scale-110" />
              </div>
            </div>
            <div className="leading-tight">
              <p className="font-display font-bold text-white text-[17px] tracking-tight">Espaço Progredir</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-teal-300/80 font-semibold mt-0.5">Acreditando na vida</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-6 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="text-[10px] uppercase tracking-[0.22em] text-teal-400/70 font-bold mb-3 px-4">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const search = (item as any).search;
                  const matchKey = (item as any).match as string | undefined;
                  const isExact = (item as any).exact;
                  let active = false;
                  if (item.to === "/") active = path === "/";
                  else if (matchKey) active = path === item.to && currentStatus === matchKey;
                  else if (isExact) active = path === item.to && !currentStatus;
                  else active = path.startsWith(item.to);
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      search={search as any}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] transition-all",
                        active
                          ? "bg-white/10 text-white border border-white/10 shadow-sm font-medium"
                          : "text-teal-100/70 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Icon className="size-4 opacity-90" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Gamification HUD + Backup card */}
        <div className="p-4 space-y-3">
          <GamificationHUD />
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="size-3.5 text-amber-400" />
              <p className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">Backup Semanal</p>
            </div>
            <p className="text-[11px] text-teal-100/80 mb-3 leading-snug">
              {days === null ? "Faça o primeiro backup completo do sistema." : days === 0 ? "Backup feito hoje ✓" : `Último backup há ${days} dia(s).`}
            </p>
            <Button
              onClick={doBackup}
              disabled={busy}
              size="sm"
              className="w-full bg-amber-500 hover:bg-amber-400 text-[#063b38] font-bold text-[11px] uppercase tracking-widest shadow-sm h-8"
            >
              <Download className="size-3.5" /> Gerar Backup
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="h-20 border-b border-slate-200 bg-white flex items-center justify-between px-6 md:px-10 sticky top-0 z-30">
          <div className="min-w-0 flex-1 max-w-lg">
            <QuickSearch />
          </div>
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </main>
    </div>
    </AuthGate>
  );
}
