// Audio + speech helpers (no paid services).
// - Melody: generated with Web Audio. Each syllable's pitch contour follows its
//   Mandarin tone (1 high-flat, 2 rising, 3 dip, 4 falling) so the tune itself
//   teaches the tones.
// - Voice: the phone's own zh-CN text-to-speech (Capacitor plugin on Android/iOS,
//   Web Speech API in the browser). Production can swap in teacher recordings
//   uploaded through the admin portal.
// - Speaking score: pronunciation-assessment API via backend in production;
//   Web Speech recognition or a deterministic demo scorer in the prototype.
import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

export const CHAR_MS = 520;

/* ---------------- Voice (TTS) ---------------- */
export async function speak(text, rate = 0.8) {
  const fallbackMs = [...text].length * CHAR_MS + 300;
  if (Capacitor.isNativePlatform()) {
    try {
      await TextToSpeech.speak({ text, lang: 'zh-CN', rate: Math.max(0.5, rate), pitch: 1.05, volume: 1, category: 'playback' });
      return;
    } catch {
      return wait(fallbackMs);
    }
  }
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const t = setTimeout(resolve, fallbackMs);
    if (!synth) return;
    try {
      const v = synth.getVoices().find((x) => x.lang?.toLowerCase().startsWith('zh'));
      if (!v) return; // no Mandarin voice installed: timed fallback only
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      u.voice = v;
      u.rate = rate;
      u.onend = () => { clearTimeout(t); resolve(); };
      synth.cancel();
      synth.speak(u);
    } catch {}
  });
}

export function stopSpeaking() {
  try { window.speechSynthesis?.cancel(); } catch {}
  if (Capacitor.isNativePlatform()) TextToSpeech.stop().catch(() => {});
}

/* ---------------- Melody (Web Audio) ---------------- */
let ctx, master, tap;
export function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    try {
      tap = ctx.createMediaStreamDestination(); // lets the demo recorder capture the soundtrack
      comp.connect(tap);
      window.__audioTap = tap.stream;
    } catch {}
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// live level 0..1 for the 3D visualisers
export const level = { value: 0 };

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const PENTA = [0, 2, 4, 7, 9]; // major pentatonic
const CHORDS = [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]]; // I vi IV V

function voiceNote(t, dur, m0, contour, vel = 0.32) {
  const o = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o2.type = 'sine';
  const f = midi(m0);
  // pitch contour by tone
  const set = (osc, mult) => {
    const p = osc.frequency;
    if (contour === 2) { p.setValueAtTime(f * mult * 0.84, t); p.exponentialRampToValueAtTime(f * mult * 1.06, t + dur * 0.8); }
    else if (contour === 3) { p.setValueAtTime(f * mult * 0.94, t); p.exponentialRampToValueAtTime(f * mult * 0.8, t + dur * 0.45); p.exponentialRampToValueAtTime(f * mult * 0.98, t + dur * 0.9); }
    else if (contour === 4) { p.setValueAtTime(f * mult * 1.12, t); p.exponentialRampToValueAtTime(f * mult * 0.82, t + dur * 0.7); }
    else p.setValueAtTime(f * mult, t);
  };
  set(o, 1);
  set(o2, 2);
  const v = contour === 0 ? vel * 0.55 : vel;
  const d = contour === 0 ? dur * 0.55 : dur;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.03);
  g.gain.exponentialRampToValueAtTime(v * 0.6, t + d * 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  const g2 = ctx.createGain();
  g2.gain.value = 0.18;
  o.connect(g).connect(master);
  o2.connect(g2).connect(g);
  o.start(t); o2.start(t);
  o.stop(t + d + 0.05); o2.stop(t + d + 0.05);
}

function pad(t, dur, root, chord) {
  chord.forEach((iv) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = midi(root + iv);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.25);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  });
  // bass
  const b = ctx.createOscillator();
  const bg = ctx.createGain();
  b.type = 'sine';
  b.frequency.value = midi(root + chord[0] - 12);
  bg.gain.setValueAtTime(0.0001, t);
  bg.gain.linearRampToValueAtTime(0.16, t + 0.02);
  bg.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.9);
  b.connect(bg).connect(master);
  b.start(t); b.stop(t + dur);
}

function tick(t, accent) {
  // soft shaker / woodblock
  const len = 0.05;
  const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3);
  const s = ctx.createBufferSource();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  s.buffer = buf;
  f.type = 'highpass';
  f.frequency.value = accent ? 2500 : 5000;
  g.gain.value = accent ? 0.22 : 0.1;
  s.connect(f).connect(g).connect(master);
  s.start(t);
}

// Schedules one sung line. syllables: [{tone}], returns duration in ms.
export function singLine(syllables, lineIdx, key = 60) {
  const c = audioCtx();
  if (!c) return syllables.length * CHAR_MS;
  const beat = CHAR_MS / 1000;
  const t0 = c.currentTime + 0.06;
  const chord = CHORDS[lineIdx % CHORDS.length];
  pad(t0, beat * syllables.length + 0.2, key - 12 + 12, chord);
  syllables.forEach((s, i) => {
    const deg = PENTA[(i + lineIdx * 2) % 5] + (s.tone === 1 ? 7 : s.tone === 3 ? -3 : 0);
    voiceNote(t0 + i * beat, beat * 0.95, key + 12 + deg, s.tone);
    tick(t0 + i * beat, i % 2 === 0);
  });
  // drive the visual level
  const start = performance.now();
  const total = syllables.length * CHAR_MS;
  const loop = () => {
    const e = performance.now() - start;
    if (e > total) { level.value = 0; return; }
    const ph = (e % CHAR_MS) / CHAR_MS;
    level.value = Math.max(0, 1 - ph * 1.4);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return total;
}

export function chime(good = true) {
  const c = audioCtx();
  if (!c) return;
  const t = c.currentTime + 0.02;
  const notes = good ? [72, 76, 79, 84] : [67, 64];
  notes.forEach((m, i) => voiceNote(t + i * 0.09, 0.35, m, 1, 0.22));
}

/* ---------------- Speaking score ---------------- */
const attempts = {};

// Returns { heard, perChar: [bool], score }
export async function recognise(target, key, syllables) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR && !window.__DEMO_MODE && !Capacitor.isNativePlatform()) {
    try {
      const heard = await new Promise((resolve, reject) => {
        const r = new SR();
        r.lang = 'zh-CN';
        r.maxAlternatives = 1;
        r.onresult = (e) => resolve(e.results[0][0].transcript);
        r.onerror = reject;
        r.start();
        setTimeout(() => r.stop(), 4000);
      });
      return grade(target, heard);
    } catch {
      /* fall through to demo */
    }
  }
  // Demo scorer: first try misses one tricky (3rd tone) syllable, retry is perfect.
  await wait(900);
  attempts[key] = (attempts[key] || 0) + 1;
  const chars = [...target];
  if (attempts[key] === 1) {
    let idx = syllables.findIndex((s) => s.tone === 3);
    if (idx < 0) idx = Math.min(2, chars.length - 1);
    return grade(target, chars.map((c, i) => (i === idx ? '？' : c)).join(''));
  }
  return grade(target, target);
}

function grade(target, heard) {
  const t = [...target];
  const h = [...heard.replace(/[，。！,.!\s]/g, '')];
  const perChar = t.map((c, i) => h[i] === c);
  const score = Math.round((perChar.filter(Boolean).length / t.length) * 100);
  return { heard, perChar, score };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
