import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Download, Loader2 } from "lucide-react";
import { isBackupOverdue, daysSinceBackup, runFullBackup } from "@/lib/backup";

export function BackupReminder() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    if (isBackupOverdue()) {
      setDays(daysSinceBackup());
      setOpen(true);
    }
  }, []);

  const handleBackup = async () => {
    setBusy(true);
    await runFullBackup();
    setBusy(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v); }}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="size-12 rounded-xl bg-warning/20 text-warning-foreground flex items-center justify-center mb-2">
            <ShieldAlert className="size-6" />
          </div>
          <DialogTitle className="text-xl font-display">Backup semanal necessário</DialogTitle>
          <DialogDescription className="text-base pt-2">
            {days === null
              ? "Você ainda não fez nenhum backup. "
              : `O último backup foi há ${days} dia(s). `}
            Para proteger todos os dados dos beneficiários contra qualquer falha,
            <strong> baixe agora o backup completo</strong> em Excel e PDF. Guarde os arquivos em local seguro.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1.5">
          <div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-primary" /> Backup em <strong>Excel</strong> com todas as informações</div>
          <div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-primary" /> Backup em <strong>PDF</strong> resumido para impressão</div>
          <div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-primary" /> Próximo aviso em <strong>7 dias</strong></div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Lembrar mais tarde
          </Button>
          <Button onClick={handleBackup} disabled={busy} size="lg" className="flex-1">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Baixar backup agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
