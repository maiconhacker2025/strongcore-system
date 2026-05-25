import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const fn = mode === "signin" ? signIn : signUp;
    const { error } = await fn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(mode === "signin" ? "Bem-vindo!" : "Conta criada com sucesso!");
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex bg-sidebar text-sidebar-foreground p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 30%, var(--accent) 0%, transparent 50%), radial-gradient(circle at 80% 70%, var(--primary) 0%, transparent 50%)"
        }} />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-accent flex items-center justify-center">
              <Heart className="size-6 text-accent-foreground" fill="currentColor" />
            </div>
            <div>
              <div className="font-display font-bold text-2xl">Progredir</div>
              <div className="text-sm opacity-70">Transformando vidas</div>
            </div>
          </div>
        </div>
        <div className="relative space-y-4">
          <h1 className="text-4xl font-display font-bold leading-tight">
            Gestão completa dos<br/>beneficiários do projeto.
          </h1>
          <p className="opacity-80 max-w-md">
            Acompanhe cadastros, dados socioeconômicos, escolaridade e situação familiar de cada criança e jovem atendido.
          </p>
        </div>
        <div className="relative text-sm opacity-60">© Projeto Progredir</div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <Card className="w-full max-w-md p-8 shadow-[var(--shadow-soft)]">
          <h2 className="text-2xl font-display font-bold">
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin" ? "Acesse o sistema com suas credenciais." : "Cadastre-se para acessar o sistema."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === "signin" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>Não tem conta?{" "}
                <button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">Criar agora</button>
              </>
            ) : (
              <>Já tem conta?{" "}
                <button onClick={() => setMode("signin")} className="text-primary font-medium hover:underline">Entrar</button>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
