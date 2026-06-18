import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export type Beneficiario = Record<string, any>;

type Field = { name: string; label: string; type?: "text" | "date" | "number" | "textarea" | "bool"; full?: boolean; suggest?: boolean };

const sections: { title: string; fields: Field[] }[] = [
  {
    title: "Identificação",
    fields: [
      { name: "nome", label: "Nome completo", full: true },
      { name: "codigo", label: "Código", type: "number" },
      { name: "cpf", label: "CPF (opcional)" },
      { name: "rg", label: "RG (opcional)" },
      { name: "data_nascimento", label: "Data de nascimento", type: "date" },
      { name: "genero", label: "Gênero" },
      { name: "classe_risco", label: "Classe de risco" },
      { name: "ativo", label: "Beneficiário ativo", type: "bool" },
    ],
  },
  {
    title: "Certidão de nascimento (quando não houver CPF/RG)",
    fields: [
      { name: "num_termo", label: "Nº do termo" },
      { name: "num_livro", label: "Nº do livro" },
      { name: "num_folha", label: "Nº da folha" },
      { name: "circunscricao", label: "Circunscrição / Cartório" },
      { name: "distrito", label: "Distrito" },
    ],
  },
  {
    title: "Datas do projeto",
    fields: [
      { name: "data_ingresso_01", label: "Ingresso 01", type: "date" },
      { name: "data_desligamento_01", label: "Desligamento 01", type: "date" },
      { name: "data_ingresso_02", label: "Ingresso 02", type: "date" },
      { name: "data_desligamento_02", label: "Desligamento 02", type: "date" },
      { name: "data_ingresso_03", label: "Ingresso 03", type: "date" },
      { name: "data_desligamento_03", label: "Desligamento 03", type: "date" },
      { name: "assistente_social", label: "Assistente social", suggest: true },
      { name: "psicologa", label: "Psicóloga", suggest: true },
    ],
  },
  {
    title: "Contato",
    fields: [
      { name: "whatsapp", label: "WhatsApp" },
      { name: "celular", label: "Celular" },
      { name: "residencial", label: "Residencial" },
      { name: "email", label: "E-mail" },
      { name: "tel_emergencia_01", label: "Emergência 01" },
      { name: "tel_emergencia_02", label: "Emergência 02" },
    ],
  },
  {
    title: "Endereço",
    fields: [
      { name: "rua", label: "Rua", full: true },
      { name: "bairro", label: "Bairro" },
      { name: "cep", label: "CEP" },
      { name: "estado", label: "Estado" },
      { name: "pais", label: "País" },
    ],
  },
  {
    title: "Escolaridade",
    fields: [
      { name: "escola", label: "Escola", full: true },
      { name: "escolaridade", label: "Escolaridade" },
      { name: "turno", label: "Turno" },
      { name: "ano_anterior", label: "Ano anterior" },
      { name: "possui_dificuldades", label: "Possui dificuldades" },
    ],
  },
  {
    title: "Família",
    fields: [
      { name: "responsavel", label: "Responsável" },
      { name: "nome_responsavel", label: "Nome do responsável" },
      { name: "tel_responsavel", label: "Telefone do responsável" },
      { name: "mora_com", label: "Mora com" },
      { name: "numero_irmaos", label: "Nº de irmãos", type: "number" },
      { name: "nome_mae", label: "Nome da mãe" },
      { name: "nasc_mae", label: "Nascimento da mãe", type: "date" },
      { name: "profissao_mae", label: "Profissão da mãe" },
      { name: "trabalha_mae", label: "Mãe trabalha?" },
      { name: "nome_pai", label: "Nome do pai" },
      { name: "nasc_pai", label: "Nascimento do pai", type: "date" },
      { name: "profissao_pai", label: "Profissão do pai" },
      { name: "escolaridade_pai", label: "Escolaridade do pai" },
      { name: "trabalha_pai", label: "Pai trabalha?" },
    ],
  },
  {
    title: "Saúde",
    fields: [
      { name: "nome_medico", label: "Nome do médico" },
      { name: "tel_medico", label: "Telefone do médico" },
      { name: "alergia", label: "Possui alergia", type: "bool" },
      { name: "medicacao", label: "Usa medicação", type: "bool" },
    ],
  },
  {
    title: "Situação socioeconômica",
    fields: [
      { name: "renda", label: "Renda familiar" },
      { name: "possui_beneficios", label: "Possui benefícios" },
      { name: "reside_em", label: "Reside em" },
      { name: "residencia", label: "Tipo de residência" },
      { name: "numero_comodos", label: "Nº de cômodos" },
      { name: "possui_banheiro", label: "Possui banheiro" },
      { name: "energia_eletrica", label: "Energia elétrica" },
      { name: "agua", label: "Água" },
      { name: "esgoto", label: "Esgoto" },
      { name: "lixo", label: "Coleta de lixo" },
      { name: "transporte_coletivo", label: "Transporte coletivo" },
      { name: "internet", label: "Internet" },
    ],
  },
  {
    title: "Itens da casa",
    fields: [
      { name: "possui_geladeira", label: "Geladeira" },
      { name: "fogao", label: "Fogão" },
      { name: "freezer", label: "Freezer" },
      { name: "micro_ondas", label: "Micro-ondas" },
      { name: "filtro", label: "Filtro de água" },
      { name: "maq_lavar", label: "Máquina de lavar" },
      { name: "tv", label: "Televisão" },
      { name: "som", label: "Aparelho de som" },
      { name: "computador", label: "Computador" },
      { name: "ar_condicionado", label: "Ar-condicionado" },
      { name: "ventilador", label: "Ventilador" },
      { name: "cama_casal", label: "Cama de casal" },
      { name: "cama_filhos", label: "Cama dos filhos" },
      { name: "guarda_roupas", label: "Guarda-roupas" },
      { name: "armario_cozinha", label: "Armário de cozinha" },
      { name: "moveis_estofados", label: "Móveis estofados" },
      { name: "louca_geral", label: "Louça em geral" },
      { name: "roupa_cama", label: "Roupa de cama" },
      { name: "tenis_atividades", label: "Tênis para atividades" },
    ],
  },
  {
    title: "Observações",
    fields: [{ name: "observacoes", label: "Observações", type: "textarea", full: true }],
  },
];

const ORDER_KEY = "form-field-order-v1";

type OrderStats = Record<string, { score: number; count: number }>;

function loadOrder(): OrderStats {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(ORDER_KEY) || "{}"); } catch { return {}; }
}

function saveOrder(o: OrderStats) {
  try { localStorage.setItem(ORDER_KEY, JSON.stringify(o)); } catch {}
}

function recordSequence(seq: string[]) {
  const o = loadOrder();
  seq.forEach((name, idx) => {
    const prev = o[name] ?? { score: 0, count: 0 };
    const newCount = prev.count + 1;
    const newScore = (prev.score * prev.count + idx) / newCount;
    o[name] = { score: newScore, count: newCount };
  });
  saveOrder(o);
}

export function BeneficiarioForm({
  value,
  onChange,
}: {
  value: Beneficiario;
  onChange: (next: Beneficiario) => void;
}) {
  const set = (k: string, v: any) => onChange({ ...value, [k]: v });
  const [adaptive, setAdaptive] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("form-adaptive") !== "off";
  });
  const [stats, setStats] = useState<OrderStats>(() => loadOrder());
  const sessionSeq = useRef<string[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let cancel = false;
    (async () => {
      const cols = ["psicologa", "assistente_social"];
      const out: Record<string, string[]> = {};
      for (const col of cols) {
        const { data } = await supabase
          .from("beneficiarios")
          .select(col)
          .not(col, "is", null)
          .limit(1000);
        const set = new Set<string>();
        (data ?? []).forEach((r: any) => {
          const v = (r?.[col] ?? "").toString().trim();
          if (v) set.add(v);
        });
        out[col] = [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
      }
      if (!cancel) setSuggestions(out);
    })();
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    localStorage.setItem("form-adaptive", adaptive ? "on" : "off");
  }, [adaptive]);

  // When the form is unmounted (save), persist the sequence learned this session
  useEffect(() => {
    return () => {
      if (sessionSeq.current.length >= 3) {
        recordSequence(sessionSeq.current);
      }
    };
  }, []);

  const trackFocus = (name: string) => {
    if (!sessionSeq.current.includes(name)) sessionSeq.current.push(name);
  };

  // Compute adaptive ordering: sort fields within each section by learned score
  const orderedSections = useMemo(() => {
    if (!adaptive) return sections;
    return sections.map((sec) => ({
      ...sec,
      fields: [...sec.fields].sort((a, b) => {
        const sa = stats[a.name];
        const sb = stats[b.name];
        if (!sa && !sb) return 0;
        if (!sa) return 1;
        if (!sb) return -1;
        return sa.score - sb.score;
      }),
    }));
  }, [adaptive, stats]);

  const resetOrder = () => {
    localStorage.removeItem(ORDER_KEY);
    setStats({});
    sessionSeq.current = [];
  };

  const isFilled = (v: any) => v !== null && v !== undefined && v !== "" && v !== false;

  return (
    <div className="space-y-6">
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Sparkles className="size-4" />
          </div>
          <div>
            <p className="font-semibold text-sm">Formulário inteligente</p>
            <p className="text-xs text-muted-foreground">
              {adaptive
                ? "Os campos se reordenam conforme você os preenche — siga a sequência do papel."
                : "Ordem fixa (padrão original)."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border">
            <Label htmlFor="adaptive" className="text-xs cursor-pointer">Adaptar à minha ordem</Label>
            <Switch id="adaptive" checked={adaptive} onCheckedChange={setAdaptive} />
          </div>
          <Button variant="outline" size="sm" onClick={resetOrder} title="Limpar memória de ordem">
            <RotateCcw className="size-3.5" /> Resetar ordem
          </Button>
        </div>
      </Card>

      {orderedSections.map((sec) => {
        const filledCount = sec.fields.filter((f) => isFilled(value[f.name])).length;
        const pct = Math.round((filledCount / sec.fields.length) * 100);
        return (
        <Card key={sec.title} className="p-6 overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/60 to-accent" />
          <div className="flex items-center justify-between mb-4 pl-2">
            <div>
              <h3 className="font-display font-semibold text-lg">{sec.title}</h3>
              <div className="mt-1 h-1.5 w-32 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-success transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {filledCount}/{sec.fields.length} preenchido(s)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sec.fields.map((f) => {
              const v = value[f.name];
              const filled = isFilled(v);
              const flagClass = filled
                ? "ring-1 ring-success/40 bg-success/5"
                : "ring-1 ring-amber-300/40 bg-amber-50/30";

              if (f.type === "bool") {
                return (
                  <div key={f.name} className={cn("flex items-center justify-between gap-3 rounded-lg border px-4 py-3", flagClass, f.full && "md:col-span-2 lg:col-span-3")}>
                    <Label htmlFor={f.name} className="cursor-pointer flex items-center gap-2">
                      {filled && <Check className="size-3.5 text-success" />}
                      {f.label}
                    </Label>
                    <Switch id={f.name} checked={!!v} onCheckedChange={(c) => { trackFocus(f.name); set(f.name, c); }} />
                  </div>
                );
              }
              if (f.type === "textarea") {
                return (
                  <div key={f.name} className={cn("space-y-2 rounded-lg p-2", flagClass, f.full && "md:col-span-2 lg:col-span-3")}>
                    <Label htmlFor={f.name} className="flex items-center gap-2">
                      {filled && <Check className="size-3.5 text-success" />}
                      {f.label}
                    </Label>
                    <Textarea
                      id={f.name}
                      value={v ?? ""}
                      onFocus={() => trackFocus(f.name)}
                      onChange={(e) => set(f.name, e.target.value || null)}
                      rows={4}
                    />
                  </div>
                );
              }
              return (
                <div key={f.name} className={cn("space-y-2 rounded-lg p-2", flagClass, f.full && "md:col-span-2 lg:col-span-3")}>
                  <Label htmlFor={f.name} className="flex items-center gap-2">
                    {filled && <Check className="size-3.5 text-success" />}
                    {f.label}
                    {f.suggest && suggestions[f.name]?.length ? (
                      <span className="text-[10px] text-muted-foreground font-normal">
                        ({suggestions[f.name].length} sugestões)
                      </span>
                    ) : null}
                  </Label>
                  <Input
                    id={f.name}
                    type={f.type ?? "text"}
                    value={v ?? ""}
                    list={f.suggest ? `${f.name}-suggestions` : undefined}
                    onFocus={() => trackFocus(f.name)}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (f.type === "number") set(f.name, raw === "" ? null : Number(raw));
                      else set(f.name, raw || null);
                    }}
                  />
                  {f.suggest && suggestions[f.name] && (
                    <datalist id={`${f.name}-suggestions`}>
                      {suggestions[f.name].map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
        );
      })}
    </div>
  );
}
