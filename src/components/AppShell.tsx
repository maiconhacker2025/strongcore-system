import { Link, useRouterState } from "@tanstack/react-router";
import { Users, LayoutDashboard, UserPlus, Sparkles, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickSearch } from "@/components/QuickSearch";
import { BackupReminder } from "@/components/BackupReminder";
import { Button } from "@/components/ui/button";
import { runFullBackup, daysSinceBackup } from "@/lib/backup";
import logo from "@/assets/logo-progredir.jpg";
import { useEffect, useState } from "react";

const navItems = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/beneficiarios", label: "Beneficiários", icon: Users },
  { to: "/beneficiarios/novo", label: "Cadastrar", icon: UserPlus },
  { to: "/ia", label: "Assistente IA", icon: Sparkles },
];

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
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="px-6 py-6 border-b border-sidebar-border bg-white/95">
          <img src={logo} alt="Espaço Progredir — Acreditando na vida" className="h-16 mx-auto object-contain" />
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
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
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="border-b bg-background/80 backdrop-blur sticky top-0 z-30 px-4 md:px-10 py-3 flex items-center gap-4">
          <QuickSearch />
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </main>

      <BackupReminder />
    </div>
  );
}
