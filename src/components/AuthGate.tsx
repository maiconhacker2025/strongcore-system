import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock, LogOut } from "lucide-react";
import logo from "@/assets/logo-progredir.jpg";
import { ensureAccessAccount } from "@/lib/access-account.functions";


const ACCESS_EMAIL = "acesso@progredir.local";
const ACCESS_PASSWORD = "@adm2026";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
    });

    const autoLogin = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (!cancelled) {
          setAuthed(true);
          setReady(true);
        }
        return;
      }
      let res = await supabase.auth.signInWithPassword({
        email: ACCESS_EMAIL,
        password: ACCESS_PASSWORD,
      });
      if (res.error) {
        try {
          await ensureAccessAccount();
          res = await supabase.auth.signInWithPassword({
            email: ACCESS_EMAIL,
            password: ACCESS_PASSWORD,
          });
        } catch (err: any) {
          if (!cancelled) setError(err?.message || "Falha ao liberar acesso");
        }
      }
      if (cancelled) return;
      if (res.error) setError(res.error.message);
      setAuthed(!res.error);
      setReady(true);
    };
    autoLogin();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Abrindo o sistema…</div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4">
        <Card className="w-full max-w-md p-8 shadow-xl text-center">
          <img src={logo} alt="Espaço Progredir" className="h-20 object-contain mx-auto mb-4" />
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Lock className="size-5 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold">Não foi possível abrir</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {error || "O banco de dados pode estar pausado. Ative o backend e recarregue."}
          </p>
          <Button className="w-full mt-5" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

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
