// Audio + speech helpers.
// Production: songs/lines are teacher-uploaded audio files on CDN; speech scoring
// goes through a pronunciation-assessment service (e.g. Azure Speech / Whisper)
// via the backend. In the browser prototype we use Web Speech where available
// and fall back to a deterministic demo scorer.

export const CHAR_MS = 520;

export function speak(text, rate = 0.8) {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const fallback = setTimeout(resolve, [...text].length * CHAR_MS + 300);
    if (!synth) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      u.rate = rate;
      const v = synth.getVoices().find((x) => x.lang?.startsWith('zh'));
      if (!v) return; // no Mandarin voice: rely on timed fallback
      u.voice = v;
      u.onend = () => {
        clearTimeout(fallback);
        resolve();
      };
      synth.cancel();
      synth.speak(u);
    } catch {}
  });
}

const attempts = {};

// Returns { heard: string, perChar: [bool], score }
export async function recognise(target, key, syllables) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR && !window.__DEMO_MODE) {
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
  await new Promise((r) => setTimeout(r, 900));
  attempts[key] = (attempts[key] || 0) + 1;
  const chars = [...target];
  if (attempts[key] === 1) {
    let idx = syllables.findIndex((s) => s.tone === 3);
    if (idx < 0) idx = Math.min(2, chars.length - 1);
    const heard = chars.map((c, i) => (i === idx ? '？' : c)).join('');
    return grade(target, heard);
  }
  return grade(target, target);
}

function grade(target, heard) {
  const t = [...target];
  const h = [...heard.replace(/[，。！？,.!?\s]/g, (m) => (m === '？' ? m : ''))];
  const perChar = t.map((c, i) => h[i] === c);
  const score = Math.round((perChar.filter(Boolean).length / t.length) * 100);
  return { heard, perChar, score };
}
