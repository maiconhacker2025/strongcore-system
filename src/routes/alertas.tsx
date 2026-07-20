import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Cake, PhoneOff, Pill, ShieldAlert, UserMinus, CalendarClock } from "lucide-react";
import { format, differenceInYears, isWithinInterval, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/alertas")({
  component: () => <AppShell><AlertsPage /></AppShell>,
  head: () => ({ meta: [{ title: "Central de Alertas · Beneficiários" }] }),
});

type B = any;

function useAlerts() {
  return useQuery({
    queryKey: ["alertas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("beneficiarios").select("*").limit(2000);
      if (error) throw error;
      const rows = (data ?? []) as B[];
      const today = startOfDay(new Date());
      const in7 = addDays(today, 7);

      const aniversariantes = rows.filter((r) => {
        if (!r.data_nascimento) return false;
        const d = new Date(r.data_nascimento);
        const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate());
        return isWithinInterval(thisYear, { start: today, end: in7 });
      }).sort((a, b) => {
        const da = new Date(a.data_nascimento); const db = new Date(b.data_nascimento);
        return (da.getMonth() * 31 + da.getDate()) - (db.getMonth() * 31 + db.getDate());
      });

      const semContato = rows.filter((r) =>
        r.ativo && !r.whatsapp && !r.celular && !r.residencial && !r.tel_responsavel
      );

      const comMedicacao = rows.filter((r) => r.ativo && r.medicacao);
      const comAlergia = rows.filter((r) => r.ativo && r.alergia);
      const riscoAlto = rows.filter((r) => r.ativo && (r.classe_risco || "").toLowerCase().includes("alto"));

      const desligamentosPendentes = rows.filter((r) => {
        const datas = [r.data_desligamento_01, r.data_desligamento_02, r.data_desligamento_03].filter(Boolean);
        return datas.some((d: string) => {
          const dt = new Date(d);
          return isWithinInterval(dt, { start: today, end: in7 });
        });
      });

      const semDocumento = rows.filter((r) => r.ativo && !r.cpf && !r.rg && !r.num_termo);

      return { aniversariantes, semContato, comMedicacao, comAlergia, riscoAlto, desligamentosPendentes, semDocumento, total: rows.length };
    },
  });
}

function Section({ title, icon: Icon, color, items, render, empty }: any) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`size-9 rounded-lg flex items-center justify-center ${color}`}><Icon className="size-4" /></div>
        <div>
          <h3 className="font-display font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{items.length} {items.length === 1 ? "beneficiário" : "beneficiários"}</p>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty ?? "Nada por aqui — tudo em ordem ✓"}</p>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {items.slice(0, 50).map((b: any) => (
            <Link
              key={b.id}
              to="/beneficiarios/$id"
              params={{ id: b.id }}
              className="flex items-center justify-between gap-3 p-2 rounded hover:bg-muted transition text-sm"
            >
              <span className="font-medium truncate">{b.nome}</span>
              <span className="text-xs text-muted-foreground shrink-0">{render?.(b)}</span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

function AlertsPage() {
  const { data, isLoading } = useAlerts();
  if (isLoading || !data) return <div className="p-10 text-muted-foreground">Carregando alertas...</div>;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <AlertTriangle className="size-8 text-amber-500" /> Central de Alertas
        </h1>
        <p className="text-muted-foreground mt-1">Tudo que precisa da sua atenção nesta semana, em um só lugar.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Section
          title="Aniversariantes da semana"
          icon={Cake}
          color="bg-pink-100 text-pink-700"
          items={data.aniversariantes}
          render={(b: any) => {
            const d = new Date(b.data_nascimento);
            const idade = differenceInYears(new Date(), d) + (new Date().getMonth() > d.getMonth() ? 0 : 1);
            return `${format(d, "dd/MM", { locale: ptBR })} · ${idade} anos`;
          }}
        />
        <Section
          title="Sem contato cadastrado"
          icon={PhoneOff}
          color="bg-red-100 text-red-700"
          items={data.semContato}
          render={() => "sem telefone"}
        />
        <Section
          title="Sem documento (CPF/RG/Certidão)"
          icon={ShieldAlert}
          color="bg-orange-100 text-orange-700"
          items={data.semDocumento}
        />
        <Section
          title="Uso de medicação contínua"
          icon={Pill}
          color="bg-teal-100 text-teal-700"
          items={data.comMedicacao}
          render={(b: any) => b.nome_medico ?? ""}
        />
        <Section
          title="Possuem alergia"
          icon={AlertTriangle}
          color="bg-amber-100 text-amber-700"
          items={data.comAlergia}
        />
        <Section
          title="Risco alto"
          icon={ShieldAlert}
          color="bg-rose-100 text-rose-700"
          items={data.riscoAlto}
        />
        <Section
          title="Desligamentos próximos (7 dias)"
          icon={UserMinus}
          color="bg-slate-200 text-slate-700"
          items={data.desligamentosPendentes}
          render={(b: any) => {
            const d = [b.data_desligamento_01, b.data_desligamento_02, b.data_desligamento_03]
              .filter(Boolean).map((x: string) => new Date(x)).find((dt) => dt >= new Date());
            return d ? format(d, "dd/MM", { locale: ptBR }) : "";
          }}
        />
        <Card className="p-5 bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="size-5 text-teal-700" />
            <h3 className="font-display font-semibold">Resumo</h3>
          </div>
          <ul className="text-sm space-y-1 text-teal-900">
            <li>Total de beneficiários: <b>{data.total}</b></li>
            <li>Atenção nesta semana: <b>{data.aniversariantes.length + data.desligamentosPendentes.length}</b></li>
            <li>Pendências de dados: <b>{data.semContato.length + data.semDocumento.length}</b></li>
            <li>Necessidades de saúde: <b>{data.comMedicacao.length + data.comAlergia.length}</b></li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
