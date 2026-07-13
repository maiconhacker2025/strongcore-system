import { supabase } from "@/integrations/supabase/client";
import type { ReportFilters } from "./reports";

export type ReportView = {
  id: string;
  name: string;
  template_id: string | null;
  filters: ReportFilters;
  created_at: string;
  updated_at: string;
};

export async function listReportViews(): Promise<ReportView[]> {
  const { data, error } = await supabase
    .from("report_views")
    .select("id, name, template_id, filters, created_at, updated_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReportView[];
}

export async function createReportView(v: {
  name: string; template_id: string | null; filters: ReportFilters;
}) {
  const { data, error } = await supabase
    .from("report_views")
    .insert({ name: v.name, template_id: v.template_id, filters: v.filters as any })
    .select().single();
  if (error) throw error;
  return data as unknown as ReportView;
}

export async function updateReportView(id: string, patch: {
  name?: string; template_id?: string | null; filters?: ReportFilters;
}) {
  const { error } = await supabase
    .from("report_views")
    .update({ ...patch, filters: patch.filters as any, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteReportView(id: string) {
  const { error } = await supabase.from("report_views").delete().eq("id", id);
  if (error) throw error;
}
