import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";

export type Beneficiario = Record<string, any>;

type Field = { name: string; label: string; type?: "text" | "date" | "number" | "textarea" | "bool"; full?: boolean };

const sections: { title: string; fields: Field[] }[] = [
  {
    title: "Identificação",
    fields: [
      { name: "nome", label: "Nome completo", full: true },
      { name: "codigo", label: "Código", type: "number" },
      { name: "cpf", label: "CPF" },
      { name: "rg", label: "RG" },
      { name: "data_nascimento", label: "Data de nascimento", type: "date" },
      { name: "genero", label: "Gênero" },
      { name: "classe_risco", label: "Classe de risco" },
      { name: "ativo", label: "Beneficiário ativo", type: "bool" },
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
      { name: "assistente_social", label: "Assistente social" },
      { name: "psicologa", label: "Psicóloga" },
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
      { name: "possui_geladeira", label: "Possui geladeira" },
      { name: "energia_eletrica", label: "Energia elétrica" },
      { name: "agua", label: "Água" },
      { name: "esgoto", label: "Esgoto" },
      { name: "lixo", label: "Coleta de lixo" },
      { name: "transporte_coletivo", label: "Transporte coletivo" },
      { name: "internet", label: "Internet" },
      { name: "computador", label: "Computador" },
    ],
  },
  {
    title: "Observações",
    fields: [{ name: "observacoes", label: "Observações", type: "textarea", full: true }],
  },
];

export function BeneficiarioForm({
  value,
  onChange,
}: {
  value: Beneficiario;
  onChange: (next: Beneficiario) => void;
}) {
  const set = (k: string, v: any) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-6">
      {sections.map((sec) => (
        <Card key={sec.title} className="p-6">
          <h3 className="font-display font-semibold text-lg mb-4">{sec.title}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sec.fields.map((f) => {
              const v = value[f.name];
              if (f.type === "bool") {
                return (
                  <div key={f.name} className={`flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3 ${f.full ? "md:col-span-2 lg:col-span-3" : ""}`}>
                    <Label htmlFor={f.name} className="cursor-pointer">{f.label}</Label>
                    <Switch id={f.name} checked={!!v} onCheckedChange={(c) => set(f.name, c)} />
                  </div>
                );
              }
              if (f.type === "textarea") {
                return (
                  <div key={f.name} className={`space-y-2 ${f.full ? "md:col-span-2 lg:col-span-3" : ""}`}>
                    <Label htmlFor={f.name}>{f.label}</Label>
                    <Textarea id={f.name} value={v ?? ""} onChange={(e) => set(f.name, e.target.value || null)} rows={4} />
                  </div>
                );
              }
              return (
                <div key={f.name} className={`space-y-2 ${f.full ? "md:col-span-2 lg:col-span-3" : ""}`}>
                  <Label htmlFor={f.name}>{f.label}</Label>
                  <Input
                    id={f.name}
                    type={f.type ?? "text"}
                    value={v ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (f.type === "number") set(f.name, raw === "" ? null : Number(raw));
                      else set(f.name, raw || null);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
