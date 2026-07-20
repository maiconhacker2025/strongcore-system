import { useEffect, useState } from "react";
import { loadGam, levelFor, onGamChange, BADGES, type GamState } from "@/lib/gamification";
import { Award, Flame, Trophy, Zap } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";

function fmtMs(ms: number | null) {
  if (!ms) return "—";
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

export function GamificationHUD() {
  const [s, setS] = useState<GamState>(() => loadGam());
  useEffect(() => onGamChange(setS), []);
  const lv = levelFor(s.xp);
  const earned = BADGES.filter((b) => s.badges.includes(b.id));

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="w-full text-left rounded-2xl bg-gradient-to-br from-teal-500/15 to-amber-500/10 border border-white/10 p-3 hover:border-amber-400/40 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="size-8 rounded-lg flex items-center justify-center text-[13px] font-black text-[#063b38] shadow"
              style={{ background: lv.current.color }}
            >
              {lv.current.level}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-widest text-amber-400 font-bold leading-none">
                Nível · {lv.current.name}
              </p>
              <p className="text-[10px] text-teal-100/70 mt-1 tabular-nums">
                {s.xp} XP {lv.next ? `· falta ${lv.next.xpNeeded - s.xp}` : "· máx"}
              </p>
            </div>
            {s.streak > 0 && (
              <div className="flex items-center gap-1 text-amber-400 font-bold text-xs">
                <Flame className="size-3.5" />
                {s.streak}
              </div>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full transition-all"
              style={{ width: `${lv.pct}%`, background: lv.current.color }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-teal-100/60">
            <span>🎖 {earned.length}/{BADGES.length}</span>
            <span>{s.totalSaves} fichas</span>
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Sua jornada</DialogTitle>
          <DialogDescription>Cada ficha salva evolui você. Continue no ritmo!</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Trophy className="size-4 text-amber-500" /> Nível atual
            </div>
            <p className="mt-1 font-display font-bold text-lg">{lv.current.name}</p>
            <p className="text-xs text-muted-foreground">Nível {lv.current.level}</p>
          </div>
          <div className="rounded-xl border p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="size-4 text-teal-600" /> XP total
            </div>
            <p className="mt-1 font-display font-bold text-lg tabular-nums">{s.xp}</p>
            <p className="text-xs text-muted-foreground">
              {lv.next ? `${lv.next.xpNeeded - s.xp} p/ ${lv.next.name}` : "Nível máximo"}
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Flame className="size-4 text-orange-500" /> Streak
            </div>
            <p className="mt-1 font-display font-bold text-lg tabular-nums">{s.streak} dia(s)</p>
          </div>
          <div className="rounded-xl border p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Award className="size-4 text-primary" /> Recorde
            </div>
            <p className="mt-1 font-display font-bold text-lg tabular-nums">{fmtMs(s.bestFillMs)}</p>
            <p className="text-xs text-muted-foreground">último: {fmtMs(s.lastSaveMs)}</p>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2">
            Conquistas ({earned.length}/{BADGES.length})
          </p>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {BADGES.map((b) => {
              const got = s.badges.includes(b.id);
              return (
                <div
                  key={b.id}
                  className={`rounded-lg border p-2.5 flex gap-2 items-start ${got ? "bg-amber-50 border-amber-300" : "opacity-50"}`}
                >
                  <span className="text-2xl leading-none">{b.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-tight">{b.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-snug">{b.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
