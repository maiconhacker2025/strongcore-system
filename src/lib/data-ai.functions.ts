import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Columns the AI is allowed to filter, group by or select
const ALLOWED_COLUMNS = [
  "codigo", "nome", "ativo", "classe_risco", "genero", "escolaridade", "turno",
  "escola", "bairro", "estado", "cep", "pais", "ano_anterior", "mora_com",
  "renda", "assistente_social", "psicologa", "possui_beneficios",
  "possui_dificuldades", "alergia", "medicacao", "responsavel", "residencia",
  "reside_em", "numero_comodos", "numero_irmaos", "nome_mae", "nome_pai",
  "profissao_mae", "profissao_pai", "escolaridade_pai", "trabalha_mae",
  "trabalha_pai", "data_nascimento",
  "data_ingresso_01", "data_ingresso_02", "data_ingresso_03",
  "data_desligamento_01", "data_desligamento_02", "data_desligamento_03",
  "internet", "computador", "geladeira", "energia_eletrica", "agua", "esgoto",
  "celular", "whatsapp", "email", "rua", "circunscricao", "distrito",
] as const;

const ALLOWED_SET = new Set<string>(ALLOWED_COLUMNS);

type Filter = {
  column: string;
  op: "eq" | "neq" | "ilike" | "gte" | "lte" | "gt" | "lt" | "is_null" | "is_not_null" | "year_eq";
  value?: string | number | boolean;
};

function applyFilters(q: any, filters: Filter[]) {
  for (const f of filters) {
    if (!ALLOWED_SET.has(f.column)) continue;
    switch (f.op) {
      case "eq": q = q.eq(f.column, f.value); break;
      case "neq": q = q.neq(f.column, f.value); break;
      case "ilike": q = q.ilike(f.column, `%${String(f.value)}%`); break;
      case "gte": q = q.gte(f.column, f.value as any); break;
      case "lte": q = q.lte(f.column, f.value as any); break;
      case "gt": q = q.gt(f.column, f.value as any); break;
      case "lt": q = q.lt(f.column, f.value as any); break;
      case "is_null": q = q.is(f.column, null); break;
      case "is_not_null": q = q.not(f.column, "is", null); break;
      case "year_eq": {
        const y = Number(f.value);
        if (Number.isFinite(y)) {
          q = q.gte(f.column, `${y}-01-01`).lte(f.column, `${y}-12-31`);
        }
        break;
      }
    }
  }
  return q;
}

async function runTool(name: string, args: any): Promise<any> {
  const filters: Filter[] = Array.isArray(args?.filters) ? args.filters : [];

  if (name === "consultar_beneficiarios") {
    const action = args?.action as "count" | "list" | "group_by";
    if (action === "count") {
      let q = supabaseAdmin.from("beneficiarios").select("*", { count: "exact", head: true });
      q = applyFilters(q, filters);
      const { count, error } = await q;
      if (error) return { error: error.message };
      return { count: count ?? 0 };
    }
    if (action === "list") {
      const DEFAULT_FIELDS = [
        "codigo", "nome", "data_nascimento", "genero", "classe_risco", "ativo",
        "escolaridade", "turno", "escola", "bairro", "responsavel", "nome_mae",
        "celular", "whatsapp",
      ];
      const fields: string[] = Array.isArray(args?.fields) && args.fields.length
        ? args.fields.filter((c: string) => ALLOWED_SET.has(c))
        : DEFAULT_FIELDS;
      const limit = Math.min(Math.max(Number(args?.limit) || 200, 1), 1000);
      let q = supabaseAdmin.from("beneficiarios").select(fields.join(","));
      q = applyFilters(q, filters);
      q = q.order("nome", { ascending: true }).limit(limit);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { columns: fields, rows: data ?? [] };
    }
    if (action === "group_by") {
      const col = String(args?.group_by ?? "");
      if (!ALLOWED_SET.has(col)) return { error: `Coluna inválida: ${col}` };
      let q = supabaseAdmin.from("beneficiarios").select(col);
      q = applyFilters(q, filters);
      const { data, error } = await q.limit(10000);
      if (error) return { error: error.message };
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        const v = (row as any)[col];
        const key = v === null || v === undefined || v === "" ? "(vazio)" : String(v);
        counts[key] = (counts[key] ?? 0) + 1;
      }
      const rows = Object.entries(counts)
        .map(([k, v]) => ({ valor: k, total: v }))
        .sort((a, b) => b.total - a.total);
      return { group_by: col, rows };
    }
    return { error: "Ação desconhecida" };
  }
  return { error: `Ferramenta desconhecida: ${name}` };
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "consultar_beneficiarios",
      description:
        "Consulta a base de beneficiários. Use action='count' para contar registros, " +
        "action='list' para listar dados, action='group_by' para agrupar por uma coluna (ex: escolaridade, classe_risco, bairro, escola, ativo, genero). " +
        "Para perguntas de ano (ex: desligados em 2023), use op='year_eq' na coluna de data correspondente.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["count", "list", "group_by"] },
          filters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                column: { type: "string", enum: [...ALLOWED_COLUMNS] },
                op: {
                  type: "string",
                  enum: ["eq", "neq", "ilike", "gte", "lte", "gt", "lt", "is_null", "is_not_null", "year_eq"],
                },
                value: {},
              },
              required: ["column", "op"],
              additionalProperties: false,
            },
          },
          group_by: { type: "string", enum: [...ALLOWED_COLUMNS] },
          fields: { type: "array", items: { type: "string", enum: [...ALLOWED_COLUMNS] } },
          limit: { type: "number" },
        },
        required: ["action"],
        additionalProperties: false,
      },
    },
  },
];

const SYSTEM_PROMPT = `Você é a assistente de dados do Espaço Progredir — uma ONG que atende crianças e adolescentes em situação de vulnerabilidade. Responda SEMPRE em português do Brasil, com tom profissional, gentil e claro.

PENSE COMO UM(A) GESTOR(A) DE ONG: ao responder, antecipe o que a coordenação realmente precisa saber — não dê só números, dê NOMES, contatos e contexto suficiente para agir.

REGRA PRINCIPAL — RESPONDA SEMPRE EM FORMATO DE RELATÓRIO COMPLETO:

# 📊 Relatório — <título curto e descritivo>

**Pergunta:** <repita a pergunta do usuário>
**Data:** <data de hoje em formato dd/mm/aaaa>

## Resumo executivo
<3 a 5 linhas com a resposta direta, números principais em **negrito**, e o que isso significa na prática para a ONG (ex: "isso representa X% dos ativos", "recomenda-se atenção a Y")>

## Dados detalhados
<SEMPRE liste os NOMES dos beneficiários quando a pergunta for sobre pessoas. Use tabela markdown rica com colunas úteis: Código, Nome, Idade, Gênero, Escola, Bairro, Responsável, Contato, Risco, Status. NUNCA mostre só códigos sem nome. Se for distribuição/agrupamento, mostre tabela com categoria + total + % do total.>

## Análise (visão de gestor)
<2 a 4 bullets interpretando os dados: padrões, alertas, comparações, grupos que merecem atenção>

## Observações
<dados ausentes, ressalvas, qualidade da informação — 1 a 3 bullets>

## Próximos passos sugeridos
- Posso gerar este relatório em **PDF**, **Word** ou **Excel** com a lista completa para enviar à Milly.
- Sugestões de cruzamento relevantes (ex: "Quer ver por escola? Por faixa etária? Por classe de risco?")

REGRAS TÉCNICAS OBRIGATÓRIAS:
1. SEMPRE use a ferramenta 'consultar_beneficiarios' para obter dados reais — JAMAIS invente nomes, números ou dados.
2. Quando a pergunta envolver pessoas (lista, quem são, mostre, quais), use action='list' com fields ricos: ["codigo","nome","data_nascimento","genero","classe_risco","ativo","escolaridade","turno","escola","bairro","responsavel","nome_mae","celular","whatsapp"]. Use limit=500 quando a lista puder ser grande.
3. Quando for distribuição/contagem por categoria, use action='group_by'.
4. Quando for apenas um número total, use action='count'.
5. Se a pergunta envolver ano, use op='year_eq' nas colunas de data (data_desligamento_01, data_ingresso_01, data_nascimento).
6. Se a pergunta for ambígua (ex: "desligados" sem ano), faça UMA pergunta curta de esclarecimento ANTES de consultar.
7. Para perguntas amplas (ex: "me dê um panorama"), faça MÚLTIPLAS chamadas: total, ativos/inativos, por escola, por risco, e monte um relatório consolidado.
8. SEMPRE traduza booleanos: ativo=true → "Ativo"; alergia=true → "Sim".
9. SEMPRE calcule e mostre a idade quando tiver data_nascimento.
10. Se não houver dados, diga "Nenhum registro encontrado" no Resumo mas mantenha o formato do relatório.

COLUNAS DISPONÍVEIS:
- Identificação: nome, codigo, genero, data_nascimento, cpf, rg
- Situação: ativo, classe_risco (Alto/Médio/Baixo)
- Ingresso/Desligamento: data_ingresso_01/02/03, data_desligamento_01/02/03
- Escolar: escolaridade, turno, escola, ano_anterior, possui_dificuldades
- Família: nome_mae, nome_pai, mora_com, numero_irmaos, responsavel, profissao_mae, profissao_pai, trabalha_mae, trabalha_pai, escolaridade_pai
- Endereço: rua, bairro, estado, cep, pais
- Socioeconômico: renda, possui_beneficios, residencia, reside_em, numero_comodos
- Saúde: alergia, medicacao
- Contato: celular, whatsapp, email
- Equipe: assistente_social, psicologa
- Infraestrutura: internet, computador, geladeira, energia_eletrica, agua, esgoto`;

const Input = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ).min(1).max(40),
});

type Msg = { role: string; content: string; tool_calls?: any[]; tool_call_id?: string; name?: string };

export const askDataAi = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { reply: "LOVABLE_API_KEY não configurada.", tables: [] };

    // Enforce settings: AI toggle + daily limit
    const { data: settings } = await supabaseAdmin
      .from("report_settings").select("ai_enabled, ai_daily_limit").eq("id", 1).maybeSingle();
    const aiEnabled = settings?.ai_enabled ?? true;
    const dailyLimit = settings?.ai_daily_limit ?? 50;
    if (!aiEnabled) {
      return { reply: "A assistente de IA está **desativada** nas configurações de Relatórios. Ative-a para consultar dados por linguagem natural.", tables: [] };
    }
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const { count: usedToday } = await supabaseAdmin
      .from("report_logs").select("*", { count: "exact", head: true })
      .eq("kind", "ai").gte("created_at", startOfDay.toISOString());
    if ((usedToday ?? 0) >= dailyLimit) {
      return { reply: `Limite diário de **${dailyLimit} consultas de IA** atingido. Ajuste em Relatórios → Configurações ou tente novamente amanhã.`, tables: [] };
    }

    const tables: { title: string; columns: string[]; rows: any[] }[] = [];


    const convo: Msg[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...data.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    for (let i = 0; i < 6; i++) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: convo,
          tools: TOOLS,
        }),
      });

      if (res.status === 429) return { reply: "Limite de requisições atingido. Tente novamente em alguns instantes.", tables };
      if (res.status === 402) return { reply: "Créditos de IA esgotados. Adicione créditos em Configurações > Workspace > Uso.", tables };
      if (!res.ok) {
        const t = await res.text();
        console.error("AI gateway error", res.status, t);
        return { reply: "Erro ao consultar a IA.", tables };
      }

      const json = await res.json();
      const msg = json?.choices?.[0]?.message;
      if (!msg) return { reply: "Resposta vazia da IA.", tables };

      const toolCalls = msg.tool_calls;
      if (toolCalls && toolCalls.length) {
        convo.push({ role: "assistant", content: msg.content ?? "", tool_calls: toolCalls });
        for (const tc of toolCalls) {
          let args: any = {};
          try { args = JSON.parse(tc.function?.arguments || "{}"); } catch {}
          const result = await runTool(tc.function?.name, args);

          // Collect tables for export
          if (result?.rows && result?.columns) {
            const filterDesc = Array.isArray(args.filters) && args.filters.length
              ? " (" + args.filters.map((f: any) => `${f.column} ${f.op} ${f.value ?? ""}`).join(", ") + ")"
              : "";
            tables.push({ title: `Lista${filterDesc}`, columns: result.columns, rows: result.rows });
          } else if (result?.rows && result?.group_by) {
            tables.push({
              title: `Agrupamento por ${result.group_by}`,
              columns: [result.group_by, "total"],
              rows: result.rows.map((r: any) => ({ [result.group_by]: r.valor, total: r.total })),
            });
          }

          convo.push({
            role: "tool",
            tool_call_id: tc.id,
            name: tc.function?.name,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      return { reply: String(msg.content ?? ""), tables };
    }

    return { reply: "Não consegui concluir a consulta. Tente reformular a pergunta.", tables };
  });
