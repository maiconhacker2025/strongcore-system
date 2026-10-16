import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: minimal-ui)").matches ||
    (navigator as any).standalone === true
  );
}

export function InstallAppButton({ className, variant = "header" }: { className?: string; variant?: "header" | "card" }) {
  const [promptEvent, setPromptEvent] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onBip = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const instalar = async () => {
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === "accepted") setInstalled(true);
      } catch {
        /* usuário cancelou */
      }
      setPromptEvent(null);
      return;
    }
    setHint(true);
  };

  if (variant === "card") {
    return (
      <div className={cn("rounded-3xl border-2 border-amber-300/60 bg-amber-50 p-4", className)}>
        <div className="flex items-center gap-3">
          <span className="size-10 rounded-2xl bg-amber-400 grid place-items-center text-[#063b38] shrink-0">
            <Download className="size-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[15px] text-[#063b38]">Instalar no telefone</p>
            <p className="text-xs text-slate-600 leading-snug">
              Coloque o app de chamada na tela inicial e abra em tela cheia, como um aplicativo de verdade.
            </p>
          </div>
          <button onClick={instalar} className="shrink-0 h-10 px-4 rounded-xl bg-[#063b38] text-white font-bold text-sm active:scale-95 transition-transform">
            Instalar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={instalar}
        className={cn(
          "h-9 px-3 rounded-full bg-amber-400 text-[#063b38] font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-transform shrink-0",
          className,
        )}
      >
        <Download className="size-4" />
        Instalar
      </button>

      {hint && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setHint(false)}>
          <div className="bg-white text-slate-900 rounded-3xl p-5 w-full max-w-sm animate-in fade-in slide-in-from-bottom-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-display font-bold text-lg">Instalar no iPhone</p>
              <button onClick={() => setHint(false)} className="size-8 rounded-full bg-slate-100 grid place-items-center">
                <X className="size-4" />
              </button>
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3 items-start">
                <span className="size-6 rounded-full bg-[#063b38] text-white grid place-items-center text-xs font-bold shrink-0 mt-0.5">1</span>
                <p>Toque no botão de <strong>compartilhar</strong> <Share2 className="inline size-4 text-slate-500" /> na barra do Safari (embaixo no iPhone).</p>
              </li>
              <li className="flex gap-3 items-start">
                <span className="size-6 rounded-full bg-[#063b38] text-white grid place-items-center text-xs font-bold shrink-0 mt-0.5">2</span>
                <p>Role a lista e toque em <strong>"Adicionar à Tela de Início"</strong>.</p>
              </li>
              <li className="flex gap-3 items-start">
                <span className="size-6 rounded-full bg-[#063b38] text-white grid place-items-center text-xs font-bold shrink-0 mt-0.5">3</span>
                <p>Toque em <strong>"Adicionar"</strong> no canto superior direito. Pronto!</p>
              </li>
            </ol>
            <button onClick={() => setHint(false)} className="mt-4 w-full h-11 rounded-xl bg-[#063b38] text-white font-bold">
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
