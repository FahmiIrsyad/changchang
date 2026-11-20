// Tiny client store. Mirrors the shape of the real API so the mock layer can be
// swapped for Laravel endpoints (auth, progress, subscriptions, content).
import { useSyncExternalStore } from 'react';
import { pinyin } from 'pinyin-pro';
import { SEED_SONGS } from './data';

const KEY = 'changchang_v2';
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
  hearts: 5,
  referrals: [],
  referralCode: null,
  gems: 120,
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
  login(name, email, refCode) {
    const base = (name || email).replace(/[^a-z]/gi, '').toUpperCase().slice(0, 5) || 'FRIEND';
    let h = 0;
    for (const c of email) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const code = `${base}-${h.toString(36).toUpperCase().slice(-3)}`;
    const patch = { user: { name, email }, lastActive: today(), referralCode: code };
    if (refCode) Object.assign(patch, { referredBy: refCode.toUpperCase(), plan: 'premium', trialEnds: Date.now() + 7 * 864e5 });
    set(patch);
  },
  // ---- referrals (production: /api/referrals, rewards granted by backend on signup / first payment) ----
  invite(channel) {
    set((s) => ({ referrals: [...(s.referrals || []), { id: Date.now(), channel, status: 'invited', name: null }] }));
  },
  // demo only: simulates the backend webhook when a friend signs up / subscribes with the code
  demoFriendEvent() {
    const names = ['Mei Ling', 'Hafiz', 'Jia Hui', 'Arjun', 'Nurul'];
    let msg = '';
    set((s) => {
      const list = [...(s.referrals || [])];
      const i = list.findIndex((r) => r.status === 'invited');
      const j = list.findIndex((r) => r.status === 'joined');
      let gems = s.gems;
      if (i >= 0) {
        const name = names[list.filter((r) => r.name).length % names.length];
        list[i] = { ...list[i], status: 'joined', name };
        gems += 50;
        msg = `${name} joined with your code! +50 💎`;
      } else if (j >= 0) {
        list[j] = { ...list[j], status: 'subscribed' };
        msg = `${list[j].name} went Premium — you earned 1 week free! 👑`;
      }
      const joined = list.filter((r) => r.status !== 'invited').length;
      const ach = new Set(s.achievements);
      if (joined >= 1) ach.add('friend');
      return { referrals: list, gems, achievements: [...ach] };
    });
    return msg;
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
  // Duolingo-style path: each song (unit) has nodes song → pinyin → speak → chest
  completeNode(songId, node) {
    set((s) => {
      const p = s.progress[songId] || { done: [], best: {} };
      const np = { ...p, [node]: true };
      const all = np.song && np.pinyin && np.speak;
      const ach = new Set(s.achievements);
      const extend = s.streakDay !== today();
      const streak = extend ? s.streak + 1 : s.streak;
      if (all) { np.completed = true; ach.add('first-song'); }
      if (streak >= 3) ach.add('streak-3');
      return { progress: { ...s.progress, [songId]: np }, streak, streakDay: today(), _streakJustExtended: extend, lastActive: today(), achievements: [...ach] };
    });
  },
  loseHeart() {
    set((s) => ({ hearts: s.plan === 'premium' ? s.hearts : Math.max(0, s.hearts - 1) }));
  },
  refillHearts() {
    set({ hearts: 5 });
  },
  addGems(n) {
    set((s) => ({ gems: s.gems + n }));
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
