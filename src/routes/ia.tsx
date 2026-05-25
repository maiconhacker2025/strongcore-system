import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Sparkles, Send, Loader2, FileText, FileSpreadsheet, FileType2, Bot, User, FileBarChart2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { askDataAi } from "@/lib/data-ai.functions";
import { exportPdf, exportDocx, exportXlsx, type ReportTable, type ReportData } from "@/lib/export-report";

export const Route = createFileRoute("/ia")({
  component: () => <AppShell><IAPage /></AppShell>,
});

type Msg = {
  role: "user" | "assistant";
  content: string;
  tables?: ReportTable[];
  question?: string;
};

const SUGGESTIONS = [
  "Quantos beneficiários estão ativos hoje?",
  "Quantas crianças foram desligadas em 2023?",
  "Mostre a distribuição por escolaridade",
  "Quantos têm classe de risco Alto?",
  "Liste as crianças do bairro Centro",
];

function IAPage() {
  const ask = useServerFn(askDataAi);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Olá! 👋 Sou a assistente de dados do projeto. Posso responder perguntas sobre os beneficiários cadastrados — quantos estão ativos, quantos foram desligados em determinado ano, distribuição por escolaridade, classe de risco, bairro, e muito mais.\n\nQuando quiser, posso transformar a resposta em um **relatório bonito em PDF, Word ou Excel** para enviar à Milly. O que gostaria de saber?",
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const mut = useMutation({
    mutationFn: async (text: string) => {
      const history = [...messages, { role: "user" as const, content: text }]
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));
      return ask({ data: { messages: history } });
    },
    onSuccess: (res, text) => {
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply, tables: res.tables, question: text }]);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao consultar a IA"),
  });

  const send = (text: string) => {
    if (!text.trim() || mut.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    mut.mutate(text);
  };

  return (
    <div className="flex flex-col h-screen max-h-screen">
      <header className="border-b px-6 md:px-10 py-5 bg-background">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold leading-tight">Assistente de Dados</h1>
            <p className="text-xs text-muted-foreground">Pergunte qualquer coisa sobre os beneficiários e gere relatórios</p>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-10 py-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {messages.map((m, i) => (
            <MessageBubble key={i} msg={m} />
          ))}
          {mut.isPending && (
            <div className="flex gap-3 items-center text-muted-foreground text-sm">
              <div className="size-8 rounded-full bg-primary-soft text-primary flex items-center justify-center">
                <Bot className="size-4" />
              </div>
              <Loader2 className="size-4 animate-spin" /> Consultando a base...
            </div>
          )}

          {messages.length <= 1 && (
            <div className="pt-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Sugestões</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-sm px-3 py-2 rounded-lg border bg-card hover:bg-muted transition-colors text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t bg-background px-4 md:px-10 py-4">
        <div className="max-w-4xl mx-auto flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Pergunte algo sobre os beneficiários... (Enter para enviar)"
            className="resize-none min-h-[52px] max-h-40"
            rows={1}
            disabled={mut.isPending}
          />
          <Button size="lg" onClick={() => send(input)} disabled={mut.isPending || !input.trim()}>
            {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
        isUser ? "bg-foreground text-background" : "bg-primary-soft text-primary"
      }`}>
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>
      <div className={`max-w-[85%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-2`}>
        <Card className={`px-4 py-3 ${isUser ? "bg-primary text-primary-foreground" : ""}`}>
          <div className="prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        </Card>

        {!isUser && msg.tables && msg.tables.length > 0 && (
          <div className="space-y-2 w-full">
            {msg.tables.map((t, i) => (
              <DataTable key={i} table={t} />
            ))}
          </div>
        )}

        {!isUser && msg.question && (
          <ExportMenu question={msg.question} answer={msg.content} tables={msg.tables ?? []} />
        )}
      </div>
    </div>
  );
}

function DataTable({ table }: { table: ReportTable }) {
  const rows = table.rows.slice(0, 10);
  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-2 border-b text-xs font-medium text-muted-foreground bg-muted/50">
        {table.title} · {table.rows.length} linha(s)
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>{table.columns.map((c) => <th key={c} className="px-3 py-2 text-left font-semibold">{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r, i) => (
              <tr key={i}>
                {table.columns.map((c) => {
                  const v = (r as any)[c];
                  const display = v === null || v === undefined || v === "" ? "—"
                    : typeof v === "boolean" ? (v ? "Sim" : "Não") : String(v);
                  return <td key={c} className="px-3 py-2 text-muted-foreground">{display}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {table.rows.length > rows.length && (
          <div className="px-4 py-2 text-xs text-muted-foreground border-t">
            +{table.rows.length - rows.length} linha(s) — exporte para ver tudo
          </div>
        )}
      </div>
    </Card>
  );
}

function ExportMenu({ question, answer, tables }: { question: string; answer: string; tables: ReportTable[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<null | "pdf" | "docx" | "xlsx">(null);
  const data: ReportData = {
    title: `Relatório — ${question.slice(0, 60)}`,
    question,
    answer,
    tables,
  };

  const totalRows = tables.reduce((acc, t) => acc + t.rows.length, 0);

  const run = async (fmt: "pdf" | "docx" | "xlsx") => {
    setBusy(fmt);
    try {
      if (fmt === "pdf") await exportPdf(data);
      if (fmt === "docx") await exportDocx(data);
      if (fmt === "xlsx") await exportXlsx(data);
      setTimeout(() => setOpen(false), 400);
    } finally {
      setBusy(null);
    }
  };

  const formats: { id: "pdf" | "docx" | "xlsx"; label: string; desc: string; Icon: any; color: string }[] = [
    { id: "pdf",  label: "PDF",   desc: "Pronto para imprimir ou enviar por e-mail", Icon: FileType2,       color: "bg-red-500/10 text-red-600" },
    { id: "docx", label: "Word",  desc: "Editável no Word / Google Docs (.docx)",     Icon: FileText,        color: "bg-blue-500/10 text-blue-600" },
    { id: "xlsx", label: "Excel", desc: "Planilha com todas as tabelas (.xlsx)",      Icon: FileSpreadsheet, color: "bg-emerald-500/10 text-emerald-600" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card className="p-3 w-full bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <FileBarChart2 className="size-4" />
            </div>
            <div>
              <p className="font-semibold leading-tight">Relatório pronto para Milly</p>
              <p className="text-xs text-muted-foreground">
                {tables.length} tabela(s) · {totalRows} registro(s)
              </p>
            </div>
          </div>
          <Button onClick={() => setOpen(true)} size="sm" className="shadow-md">
            <FileBarChart2 className="size-4" /> Gerar Relatório
          </Button>
        </div>
      </Card>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileBarChart2 className="size-5 text-primary" /> Gerar relatório completo
          </DialogTitle>
          <DialogDescription>
            Escolha o formato. O arquivo incluirá a pergunta, a resposta da IA e todas as tabelas com {totalRows} registro(s).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          {formats.map((f) => {
            const isBusy = busy === f.id;
            return (
              <button
                key={f.id}
                disabled={!!busy}
                onClick={() => run(f.id)}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/60 transition-colors text-left disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className={`size-10 rounded-lg flex items-center justify-center ${f.color}`}>
                  <f.Icon className="size-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
                {isBusy ? <Loader2 className="size-4 animate-spin text-primary" />
                  : <CheckCircle2 className="size-4 text-muted-foreground/40" />}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground border-t pt-3">
          💡 Dica: você pode pedir à IA para refinar a pergunta antes (ex: filtrar por ano, escola ou bairro) e gerar um relatório ainda mais específico.
        </p>
      </DialogContent>
    </Dialog>
  );
}
