import { Link, useRouterState } from "@tanstack/react-router";
import { Users, LayoutDashboard, LogOut, UserPlus, Heart } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/beneficiarios", label: "Beneficiários", icon: Users },
  { to: "/beneficiarios/novo", label: "Cadastrar", icon: UserPlus },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="px-6 py-7 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-accent/90 flex items-center justify-center">
              <Heart className="size-5 text-accent-foreground" fill="currentColor" />
            </div>
            <div>
              <div className="font-display font-bold text-lg leading-tight">Progredir</div>
              <div className="text-xs opacity-70">Gestão de Beneficiários</div>
            </div>
          </div>
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

        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 text-xs opacity-70 truncate">{user?.email}</div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium opacity-80 hover:opacity-100 hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="size-4" />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
