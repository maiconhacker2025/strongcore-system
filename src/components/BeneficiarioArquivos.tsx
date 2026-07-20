import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Paperclip, Upload, Trash2, FileText, Image as ImageIcon, Download, Loader2 } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";

const BUCKET = "beneficiario-arquivos";

export function BeneficiarioArquivos({ beneficiarioId }: { beneficiarioId: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: arquivos = [] } = useQuery({
    queryKey: ["arquivos", beneficiarioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiario_arquivos" as any)
        .select("*")
        .eq("beneficiario_id", beneficiarioId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${beneficiarioId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (upErr) throw upErr;
        const categoria = file.type.startsWith("image/") ? "foto" : "documento";
        const { error: insErr } = await supabase.from("beneficiario_arquivos" as any).insert({
          beneficiario_id: beneficiarioId,
          nome: file.name,
          categoria,
          path,
          mime: file.type,
          tamanho: file.size,
        });
        if (insErr) throw insErr;
      }
      toast.success("Arquivo(s) enviado(s)");
      qc.invalidateQueries({ queryKey: ["arquivos", beneficiarioId] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const delMut = useMutation({
    mutationFn: async (arq: any) => {
      await supabase.storage.from(BUCKET).remove([arq.path]);
      const { error } = await supabase.from("beneficiario_arquivos" as any).delete().eq("id", arq.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Arquivo removido");
      qc.invalidateQueries({ queryKey: ["arquivos", beneficiarioId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openFile = async (arq: any) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(arq.path, 60 * 5);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const fotos = arquivos.filter((a: any) => a.categoria === "foto");
  const docs = arquivos.filter((a: any) => a.categoria !== "foto");

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Paperclip className="size-5 text-teal-700" />
          <h3 className="font-display font-semibold text-lg">Fotos e documentos</h3>
          <span className="text-xs text-muted-foreground">({arquivos.length})</span>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={(e) => onUpload(e.target.files)}
          />
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Enviar
          </Button>
        </div>
      </div>

      {arquivos.length === 0 && (
        <div className="text-center py-10 text-sm text-muted-foreground">
          Nenhum arquivo anexado. Envie fotos, certidão de nascimento, laudos e outros documentos.
        </div>
      )}

      {fotos.length > 0 && (
        <div className="mb-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Fotos</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {fotos.map((f: any) => <FotoCard key={f.id} arq={f} onOpen={openFile} onDelete={() => delMut.mutate(f)} />)}
          </div>
        </div>
      )}

      {docs.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Documentos</p>
          <div className="space-y-2">
            {docs.map((d: any) => (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <FileText className="size-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.nome}</p>
                  <p className="text-xs text-muted-foreground">{(d.tamanho / 1024).toFixed(1)} KB · {d.mime}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openFile(d)}><Download className="size-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => delMut.mutate(d)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function FotoCard({ arq, onOpen, onDelete }: { arq: any; onOpen: (a: any) => void; onDelete: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    supabase.storage.from(BUCKET).createSignedUrl(arq.path, 60 * 10).then(({ data }) => {
      if (alive && data) setUrl(data.signedUrl);
    });
    return () => { alive = false; };
  }, [arq.path]);
  return (
    <div className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
      {url ? (
        <img src={url} alt={arq.nome} className="size-full object-cover cursor-pointer" onClick={() => onOpen(arq)} />
      ) : (
        <div className="size-full flex items-center justify-center"><ImageIcon className="size-6 text-muted-foreground" /></div>
      )}
      <button
        onClick={onDelete}
        className="absolute top-1.5 right-1.5 size-7 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
