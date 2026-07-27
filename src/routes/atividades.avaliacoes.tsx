import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AtividadesNav, AtividadesHeader } from "@/components/AtividadesNav";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/atividades/avaliacoes")({
  component: () => <AppShell><Page /></AppShell>,
  head: () => ({
    meta: [
      { title: "Avaliações · Espaço Progredir" },
      { name: "description", content: "Avaliações do módulo de Atividades do Espaço Progredir." },
      { property: "og:title", content: "Avaliações · Espaço Progredir" },
      { property: "og:description", content: "Avaliações do módulo de Atividades do Espaço Progredir." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Page() {
  return (
    <div className="p-6 md:p-10">
      <AtividadesNav />
      <AtividadesHeader icon={<Sparkles className="size-5" />} title="Avaliações" subtitle="Área em construção — próxima etapa do módulo Atividades." />
      <Card className="p-10 text-center border-dashed">
        <p className="text-slate-500">A base de dados de <b>Avaliações</b> já está criada. A tela será liberada na próxima etapa.</p>
      </Card>
    </div>
  );
}
