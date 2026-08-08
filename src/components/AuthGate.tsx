import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { ensureAccessAccount } from "@/lib/access-account.functions";

const ACCESS_EMAIL = "acesso@progredir.local";
const ACCESS_PASSWORD = "@adm2026";

export function AuthGate({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;

    const autoLogin = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled || data.session) return;

        const res = await supabase.auth.signInWithPassword({
          email: ACCESS_EMAIL,
          password: ACCESS_PASSWORD,
        });
        if (cancelled || !res.error) return;

        // Conta pode não existir ainda — tenta criar/reparar sem quebrar a tela.
        try {
          await ensureAccessAccount();
          await supabase.auth.signInWithPassword({
            email: ACCESS_EMAIL,
            password: ACCESS_PASSWORD,
          });
        } catch (err) {
          console.warn("Acesso automático indisponível:", err);
        }
      } catch (err) {
        console.warn("Acesso automático indisponível:", err);
      }
    };

    autoLogin();
    return () => {
      cancelled = true;
    };
  }, []);

  return <>{children}</>;
}

export function LogoutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => supabase.auth.signOut()}
      className="text-sidebar-foreground/80 hover:text-sidebar-foreground"
    >
      <LogOut className="size-4" /> Sair
    </Button>
  );
}
