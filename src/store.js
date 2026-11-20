// Tiny client store. Mirrors the shape of the real API so the mock layer can be
// swapped for Laravel endpoints (auth, progress, subscriptions, content).
import { useSyncExternalStore } from 'react';
import { pinyin } from 'pinyin-pro';
import { SEED_SONGS } from './data';

const KEY = 'changchang_v1';
const CONTENT_KEY = 'changchang_content_v1';
const listeners = new Set();

const today = () => new Date().toISOString().slice(0, 10);

const defaultState = () => ({
  user: null, // { name, email }
  plan: 'free', // 'free' | 'premium'
  xp: 40,
  streak: 2,
  lastActive: null,
  dailyGoal: 30,
  todayXp: 0,
  progress: {}, // songId -> { done: [lineIdx], best: {lineIdx: score}, completed }
  achievements: [],
  reminders: true,
  reminderTime: '20:00',
});

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback();
  } catch {
    return fallback();
  }
}

let state = load(KEY, defaultState);
let content = load(CONTENT_KEY, () => SEED_SONGS);

function emit() {
  listeners.forEach((l) => l());
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    localStorage.setItem(CONTENT_KEY, JSON.stringify(content));
  } catch {}
}

// Sync between the app and the admin portal (other tab / iframe) live.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === CONTENT_KEY) content = load(CONTENT_KEY, () => SEED_SONGS);
    if (e.key === KEY) state = load(KEY, defaultState);
    emit();
  });
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useApp() {
  return useSyncExternalStore(subscribe, () => state);
}
export function useContent() {
  return useSyncExternalStore(subscribe, () => content);
}

function set(patch) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  persist();
  emit();
}

export const actions = {
  login(name, email) {
    set({ user: { name, email }, lastActive: today() });
  },
  logout() {
    set({ user: null });
  },
  upgrade() {
    set({ plan: 'premium' });
  },
  toggleReminders() {
    set((s) => ({ reminders: !s.reminders }));
  },
  addXp(n) {
    set((s) => {
      const xp = s.xp + n;
      const ach = new Set(s.achievements);
      if (xp >= 100) ach.add('xp-100');
      return { xp, todayXp: s.todayXp + n, achievements: [...ach] };
    });
  },
  recordLine(songId, lineIdx, score) {
    set((s) => {
      const p = s.progress[songId] || { done: [], best: {} };
      const done = Array.from(new Set([...p.done, lineIdx]));
      const best = { ...p.best, [lineIdx]: Math.max(score, p.best[lineIdx] || 0) };
      const ach = new Set(s.achievements);
      if (score === 100) ach.add('perfect');
      return { progress: { ...s.progress, [songId]: { ...p, done, best } }, achievements: [...ach] };
    });
  },
  completeSong(songId) {
    set((s) => {
      const p = s.progress[songId] || { done: [], best: {} };
      const first = !p.completed;
      const ach = new Set(s.achievements);
      ach.add('first-song');
      const streak = s.lastActive === today() && s.streak > 2 ? s.streak : s.streak + 1;
      if (streak >= 3) ach.add('streak-3');
      return {
        progress: { ...s.progress, [songId]: { ...p, completed: true } },
        streak,
        lastActive: today(),
        achievements: [...ach],
        _newlyCompleted: first,
      };
    });
  },
  // ---- admin / CMS ----
  saveSong(song) {
    const exists = content.some((c) => c.id === song.id);
    content = exists ? content.map((c) => (c.id === song.id ? song : c)) : [...content, song];
    persist();
    emit();
  },
  togglePublish(id) {
    content = content.map((c) => (c.id === id ? { ...c, published: !c.published } : c));
    persist();
    emit();
  },
  reset() {
    state = defaultState();
    content = SEED_SONGS;
    persist();
    emit();
  },
};

// Hanzi -> [{ ch, py, tone }] using pinyin-pro (auto-generated, editable by teachers).
export function toSyllables(zh) {
  const chars = [...zh];
  const py = pinyin(zh, { type: 'array' });
  const nums = pinyin(zh, { type: 'array', toneType: 'num' });
  return chars.map((ch, i) => {
    const n = nums[i] || '';
    const m = n.match(/(\d)$/);
    let tone = m ? Number(m[1]) : 0;
    // 们 / 的 / 友 in 朋友 etc. are usually neutral in speech
    if (['们', '的'].includes(ch) || (ch === '友' && chars[i - 1] === '朋')) tone = 0;
    let p = py[i] || '';
    if (tone === 0) p = p.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return { ch, py: p, tone };
  });
}
