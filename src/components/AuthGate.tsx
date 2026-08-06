import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock, LogOut } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo-progredir.jpg";
import { ensureAccessAccount } from "@/lib/access-account.functions";

const ACCESS_EMAIL = "acesso@progredir.local";
const ACCESS_PASSWORD = "@adm2026";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
    });
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const tryLogin = async (pwd: string) => {
    return supabase.auth.signInWithPassword({ email: ACCESS_EMAIL, password: pwd });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    try {
      let { error } = await tryLogin(password);
      if (error && /Invalid login credentials/i.test(error.message) && password === ACCESS_PASSWORD) {
        // Bootstrap or repair the shared account, then retry once.
        await ensureAccessAccount();
        const r = await tryLogin(password);
        error = r.error;
      }
      if (error) throw error;
      toast.success("Acesso liberado");
    } catch (err: any) {
      toast.error(err?.message || "Senha incorreta");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Carregando…</div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4">
        <Card className="w-full max-w-md p-8 shadow-xl">
          <div className="flex flex-col items-center text-center mb-6">
            <img src={logo} alt="Espaço Progredir" className="h-20 object-contain mb-4" />
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Lock className="size-5 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">Acesso restrito</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Este sistema contém dados pessoais sensíveis.<br />Informe a senha para continuar.
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              disabled={busy}
            />
            <Button type="submit" className="w-full" disabled={busy || !password}>
              {busy ? "Verificando…" : "Entrar"}
            </Button>
          </form>
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
