import { supabase } from "@/integrations/supabase/client";

export type ReportSettings = {
  ai_enabled: boolean;
  ai_daily_limit: number;
  updated_at?: string;
};

export type ReportLog = {
  id: string;
  kind: "template" | "ai";
  title: string;
  question: string | null;
  filters: any;
  row_count: number | null;
  export_format: string | null;
  created_at: string;
};

export async function getReportSettings(): Promise<ReportSettings> {
  const { data, error } = await supabase
    .from("report_settings")
    .select("ai_enabled, ai_daily_limit, updated_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return data ?? { ai_enabled: true, ai_daily_limit: 50 };
}

export async function updateReportSettings(patch: Partial<ReportSettings>) {
  const { error } = await supabase
    .from("report_settings")
    .upsert({ id: 1, ...patch, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function logReport(entry: {
  kind: "template" | "ai";
  title: string;
  question?: string | null;
  filters?: any;
  row_count?: number | null;
  export_format?: string | null;
}) {
  try {
    await supabase.from("report_logs").insert({
      kind: entry.kind,
      title: entry.title,
      question: entry.question ?? null,
      filters: entry.filters ?? null,
      row_count: entry.row_count ?? null,
      export_format: entry.export_format ?? null,
    });
  } catch (e) {
    console.warn("logReport failed", e);
  }
}

export async function listReportLogs(limit = 100): Promise<ReportLog[]> {
  const { data, error } = await supabase
    .from("report_logs")
    .select("id, kind, title, question, filters, row_count, export_format, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ReportLog[];
}

export async function deleteReportLog(id: string) {
  const { error } = await supabase.from("report_logs").delete().eq("id", id);
  if (error) throw error;
}

export async function clearReportLogs() {
  const { error } = await supabase.from("report_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw error;
}

export async function countAiToday(): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from("report_logs")
    .select("*", { count: "exact", head: true })
    .eq("kind", "ai")
    .gte("created_at", start.toISOString());
  if (error) throw error;
  return count ?? 0;
}
