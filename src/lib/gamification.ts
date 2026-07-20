// Gamificação da Renata — XP, níveis, conquistas, streak.
// Persiste em localStorage. Emite eventos para o HUD reagir.

import confetti from "canvas-confetti";
import { toast } from "sonner";

export type Badge = {
  id: string;
  label: string;
  desc: string;
  icon: string; // emoji
};

export type GamState = {
  xp: number;
  totalSaves: number;
  totalFieldsFilled: number;
  badges: string[]; // ids
  streak: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  bestFillMs: number | null;
  lastSaveMs: number | null;
};

const KEY = "gam-state-v1";
const EVT = "gam:update";

export const BADGES: Badge[] = [
  { id: "first_save", label: "Primeiro Passo", desc: "Salvou o primeiro cadastro", icon: "🌱" },
  { id: "ten_saves", label: "Guardiã dos Dados", desc: "10 cadastros salvos", icon: "🛡️" },
  { id: "fifty_saves", label: "Coração da ONG", desc: "50 cadastros salvos", icon: "💚" },
  { id: "hundred_saves", label: "Lenda Progredir", desc: "100 cadastros salvos", icon: "👑" },
  { id: "complete_profile", label: "Ficha Perfeita", desc: "Preencheu 100% de uma ficha", icon: "✨" },
  { id: "speed_demon", label: "Preenchimento Relâmpago", desc: "Ficha salva em menos de 3 min", icon: "⚡" },
  { id: "streak_3", label: "Trio Poderoso", desc: "3 dias seguidos cadastrando", icon: "🔥" },
  { id: "streak_7", label: "Semana Perfeita", desc: "7 dias seguidos", icon: "🌟" },
  { id: "streak_30", label: "Mês Impecável", desc: "30 dias seguidos", icon: "🏆" },
  { id: "field_500", label: "Mestre dos Campos", desc: "500 campos preenchidos", icon: "🎯" },
];

export const LEVELS = [
  { level: 1, name: "Iniciante", xpNeeded: 0, color: "#94a3b8" },
  { level: 2, name: "Voluntária", xpNeeded: 100, color: "#38bdf8" },
  { level: 3, name: "Cuidadora", xpNeeded: 300, color: "#22c55e" },
  { level: 4, name: "Guardiã", xpNeeded: 700, color: "#eab308" },
  { level: 5, name: "Especialista", xpNeeded: 1500, color: "#f97316" },
  { level: 6, name: "Mestre", xpNeeded: 3000, color: "#a855f7" },
  { level: 7, name: "Lenda Progredir", xpNeeded: 6000, color: "#ec4899" },
];

const empty: GamState = {
  xp: 0,
  totalSaves: 0,
  totalFieldsFilled: 0,
  badges: [],
  streak: 0,
  lastActiveDate: null,
  bestFillMs: null,
  lastSaveMs: null,
};

export function loadGam(): GamState {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    return { ...empty, ...JSON.parse(raw) };
  } catch {
    return empty;
  }
}

function save(s: GamState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent(EVT, { detail: s }));
  } catch {}
}

export function onGamChange(cb: (s: GamState) => void) {
  const h = (e: Event) => cb((e as CustomEvent).detail);
  window.addEventListener(EVT, h);
  return () => window.removeEventListener(EVT, h);
}

export function levelFor(xp: number) {
  let current = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.xpNeeded) current = l;
  const next = LEVELS.find((l) => l.xpNeeded > xp) ?? null;
  const base = current.xpNeeded;
  const cap = next?.xpNeeded ?? current.xpNeeded + 1000;
  const pct = next ? Math.round(((xp - base) / (cap - base)) * 100) : 100;
  return { current, next, pct, base, cap };
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

function fireConfetti(intense = false) {
  try {
    confetti({
      particleCount: intense ? 180 : 80,
      spread: intense ? 100 : 65,
      origin: { y: 0.7 },
      colors: ["#0d9488", "#f59e0b", "#ec4899", "#a855f7"],
    });
  } catch {}
}

function grantBadge(s: GamState, id: string) {
  if (s.badges.includes(id)) return;
  const b = BADGES.find((x) => x.id === id);
  if (!b) return;
  s.badges.push(id);
  toast.success(`${b.icon}  Conquista: ${b.label}`, { description: b.desc, duration: 5000 });
  fireConfetti(true);
}

function checkLevelUp(prevXp: number, s: GamState) {
  const before = levelFor(prevXp).current.level;
  const after = levelFor(s.xp).current.level;
  if (after > before) {
    const nl = levelFor(s.xp).current;
    toast.success(`🎉 Nível ${nl.level} — ${nl.name}!`, {
      description: "Você está evoluindo. Continue assim!",
      duration: 6000,
    });
    fireConfetti(true);
  }
}

function updateStreak(s: GamState) {
  const t = today();
  if (s.lastActiveDate === t) return;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${(y.getMonth() + 1).toString().padStart(2, "0")}-${y.getDate().toString().padStart(2, "0")}`;
  s.streak = s.lastActiveDate === yesterday ? s.streak + 1 : 1;
  s.lastActiveDate = t;
  if (s.streak === 3) grantBadge(s, "streak_3");
  if (s.streak === 7) grantBadge(s, "streak_7");
  if (s.streak === 30) grantBadge(s, "streak_30");
}

/** Chame ao salvar um cadastro. */
export function awardSave(opts: { fieldsFilled: number; totalFields: number; startedAt: number | null }) {
  const s = loadGam();
  const prevXp = s.xp;

  const pct = opts.fieldsFilled / Math.max(1, opts.totalFields);
  const baseXp = 25;
  const fillBonus = Math.round(pct * 50);
  const perfectBonus = pct >= 0.999 ? 75 : 0;
  const gained = baseXp + fillBonus + perfectBonus;

  s.xp += gained;
  s.totalSaves += 1;
  s.totalFieldsFilled += opts.fieldsFilled;

  const elapsed = opts.startedAt ? Date.now() - opts.startedAt : null;
  if (elapsed && elapsed > 5000) {
    s.lastSaveMs = elapsed;
    if (!s.bestFillMs || elapsed < s.bestFillMs) {
      s.bestFillMs = elapsed;
      toast.success("🏁 Novo recorde de velocidade!", {
        description: `Ficha salva em ${(elapsed / 1000).toFixed(1)}s`,
      });
    }
    if (elapsed < 180_000 && pct >= 0.6) grantBadge(s, "speed_demon");
  }

  updateStreak(s);

  if (s.totalSaves === 1) grantBadge(s, "first_save");
  if (s.totalSaves === 10) grantBadge(s, "ten_saves");
  if (s.totalSaves === 50) grantBadge(s, "fifty_saves");
  if (s.totalSaves === 100) grantBadge(s, "hundred_saves");
  if (perfectBonus > 0) grantBadge(s, "complete_profile");
  if (s.totalFieldsFilled >= 500) grantBadge(s, "field_500");

  toast(`+${gained} XP`, {
    description: perfectBonus ? "Ficha perfeita! Bônus incluso." : `${opts.fieldsFilled}/${opts.totalFields} campos preenchidos`,
    duration: 3500,
  });
  fireConfetti(perfectBonus > 0);

  checkLevelUp(prevXp, s);
  save(s);
}

export function resetGam() {
  save({ ...empty });
}
