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
      const fields: string[] = Array.isArray(args?.fields) && args.fields.length
        ? args.fields.filter((c: string) => ALLOWED_SET.has(c))
        : ["codigo", "nome", "ativo", "classe_risco", "escola", "bairro"];
      const limit = Math.min(Math.max(Number(args?.limit) || 50, 1), 500);
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

const SYSTEM_PROMPT = `Você é a assistente de dados do sistema de Beneficiários do projeto. Responda sempre em português do Brasil, de forma direta, gentil e profissional.

Você ajuda a equipe (especialmente a Milly) a obter informações sobre as crianças e jovens cadastrados. Use as ferramentas disponíveis para consultar a base de dados real — nunca invente números.

Colunas mais relevantes da tabela "beneficiarios":
- Identificação: nome, codigo, genero, data_nascimento
- Situação: ativo (boolean), classe_risco (Alto/Médio/Baixo)
- Datas de ingresso: data_ingresso_01/02/03
- Datas de desligamento: data_desligamento_01/02/03
- Escolaridade: escolaridade, turno, escola, ano_anterior
- Família: nome_mae, nome_pai, mora_com, numero_irmaos, responsavel
- Endereço: bairro, estado
- Socioeconômico: renda, possui_beneficios, possui_dificuldades
- Saúde: alergia, medicacao

Boas práticas:
1. Se a pergunta for ambígua, faça uma pergunta curta de esclarecimento antes de consultar.
2. Para perguntas tipo "quantos foram desligados em 2023", use a ferramenta com filtros year_eq=2023 em data_desligamento_01 (e some/considere as outras se necessário).
3. Sempre que apresentar números, mostre também um resumo claro. Quando agrupar, devolva os principais grupos.
4. Ao final, ofereça sugestões: "Posso gerar um relatório em PDF, Word ou Excel sobre isso?".
5. Seja concisa e use markdown (listas, **negrito**, tabelas quando útil).`;

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
