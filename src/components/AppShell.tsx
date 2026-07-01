import { Link, useRouterState } from "@tanstack/react-router";
import { Users, LayoutDashboard, UserPlus, Sparkles, Download, UserCheck, UserMinus, FileBarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickSearch } from "@/components/QuickSearch";
import { Button } from "@/components/ui/button";
import { runFullBackup, daysSinceBackup } from "@/lib/backup";
import { AuthGate, LogoutButton } from "@/components/AuthGate";
import logo from "@/assets/logo-progredir.jpg";
import { useEffect, useState } from "react";

const navItems = [
  { to: "/", label: "Painel", icon: LayoutDashboard, exact: true },
  { to: "/beneficiarios", label: "Todos beneficiários", icon: Users, exact: true, search: {} },
  { to: "/beneficiarios", label: "Ativos", icon: UserCheck, search: { status: "ativos" }, match: "ativos" },
  { to: "/beneficiarios", label: "Inativos", icon: UserMinus, search: { status: "inativos" }, match: "inativos" },
  { to: "/beneficiarios/novo", label: "Cadastrar", icon: UserPlus },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart2 },
  { to: "/ia", label: "Assistente IA", icon: Sparkles },
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

  return (
    <AuthGate>
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="relative px-5 pt-6 pb-5 border-b border-sidebar-border overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-primary/5" />
          <div className="absolute -top-12 -right-12 size-32 rounded-full bg-primary/10 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 size-24 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex flex-col items-center gap-2">
            <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 p-2">
              <img src={logo} alt="Espaço Progredir — Acreditando na vida" className="h-14 object-contain" />
            </div>
            <div className="text-center mt-1">
              <p className="font-display text-[15px] font-semibold tracking-tight text-foreground leading-none">
                Espaço Progredir
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Acreditando na vida
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const search = (item as any).search;
            const matchKey = (item as any).match as string | undefined;
            const isExact = (item as any).exact;
            const currentStatus = typeof window !== "undefined"
              ? new URLSearchParams(window.location.search).get("status")
              : null;
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "opacity-80 hover:opacity-100 hover:bg-sidebar-accent/50"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-2">
          <Button
            onClick={doBackup}
            disabled={busy}
            variant="outline"
            className="w-full bg-white/10 hover:bg-white/20 border-white/20 text-sidebar-foreground"
          >
            <Download className="size-4" /> Backup semanal
          </Button>
          <p className="text-[11px] opacity-70 text-center">
            {days === null ? "Nenhum backup ainda" : days === 0 ? "Backup feito hoje ✓" : `Último backup há ${days} dia(s)`}
          </p>
          <div className="pt-1 flex justify-center">
            <LogoutButton />
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="border-b bg-background/80 backdrop-blur sticky top-0 z-30 px-4 md:px-10 py-3 flex items-center gap-4">
          <QuickSearch />
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </main>
    </div>
    </AuthGate>
  );
}
