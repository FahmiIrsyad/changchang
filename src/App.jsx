import { useEffect, useMemo, useRef, useState } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams, Navigate, Link, useLocation } from 'react-router-dom';
import { actions, toSyllables, useApp, useContent } from './store';
import { ACHIEVEMENTS, TONE_INFO } from './data';
import { CHAR_MS, chime, recognise, singLine, speak, stopSpeaking } from './audio';
import { MascotHero, Trophy3D, VinylStage, VoiceOrb } from './three3d';
import Admin from './Admin';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/admin/*" element={<Admin />} />
        <Route path="/*" element={<MobileShell />} />
      </Routes>
    </HashRouter>
  );
}

function MobileShell() {
  const app = useApp();
  const loc = useLocation();
  if (!app.user && loc.pathname !== '/login') return <Navigate to="/login" replace />;
  const showTabs = ['/', '/profile', '/premium'].includes(loc.pathname);
  return (
    <div className="phone">
      <ScrollTop path={loc.pathname} />
      <div className="screen">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/lesson/:id/:node" element={<Lesson />} />
          <Route path="/done/:id/:node" element={<LessonDone />} />
          <Route path="/premium" element={<Paywall />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/invite" element={<Invite />} />
        </Routes>
      </div>
      {showTabs && <TabBar />}
    </div>
  );
}

function ScrollTop({ path }) {
  useEffect(() => {
    if (path !== '/') document.querySelector('.screen')?.scrollTo(0, 0);
  }, [path]);
  return null;
}

function TabBar() {
  const { pathname } = useLocation();
  const tabs = [
    ['/', '🏠', 'Learn'],
    ['/premium', '👑', 'Premium'],
    ['/profile', '😊', 'Me'],
  ];
  return (
    <nav className="tabbar">
      {tabs.map(([to, ic, label]) => (
        <Link key={to} to={to} className={pathname === to ? 'on' : ''} data-testid={`tab-${label}`}>
          <span>{ic}</span>
        </Link>
      ))}
    </nav>
  );
}

/* ---------------- Auth ---------------- */
function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [ref, setRef] = useState(() => new URLSearchParams(window.location.search).get('ref') || '');
  const submit = (e) => {
    e.preventDefault();
    if (!email || !pw) return;
    actions.login(name || email.split('@')[0], email, ref.trim());
    nav('/');
  };
  return (
    <div className="login">
      <div className="login-hero">
        <MascotHero height={200} />
        <h1>ChangChang</h1>
        <p>Learn Mandarin by singing.<br />Fun, free and five minutes a day.</p>
      </div>
      <form onSubmit={submit} className="form">
        <div className="seg">
          <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => setMode('register')}>Sign up</button>
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>Log in</button>
        </div>
        {mode === 'register' && <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} data-testid="name" />}
        <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="email" />
        <input placeholder="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} data-testid="password" />
        {mode === 'register' && <input className="ref-input" placeholder="🎁 Referral code (optional)" value={ref} onChange={(e) => setRef(e.target.value)} data-testid="ref" />}
        <button className="btn3d primary" data-testid="submit">{mode === 'register' ? 'Get started' : 'Log in'}</button>
        <div className="social">
          <button type="button" className="btn3d ghost">Google</button>
          <button type="button" className="btn3d ghost">Apple</button>
        </div>
        <Link to="/admin" className="admin-link">Education team? Open the admin portal →</Link>
      </form>
    </div>
  );
}

/* ---------------- Top status bar ---------------- */
function StatusBar() {
  const app = useApp();
  return (
    <div className="statusbar">
      <span className="lang-chip">中</span>
      <span className="stat fire" data-testid="streak">🔥 {app.streak}</span>
      <span className="stat gem">⭐ {app.xp}</span>
      <span className="stat heart">❤️ {app.plan === 'premium' ? '∞' : app.hearts}</span>
    </div>
  );
}

/* ---------------- Home: learning path ---------------- */
const NODES = [
  { key: 'song', icon: '🎵', label: 'Sing' },
  { key: 'pinyin', icon: '拼', label: 'Pinyin' },
  { key: 'speak', icon: '🎤', label: 'Speak' },
  { key: 'chest', icon: '🎁', label: 'Reward' },
];
const OFFSETS = [0, 62, 0, -62];

function Home() {
  const app = useApp();
  const songs = useContent().filter((s) => s.published);
  const nav = useNavigate();
  const [toast, setToast] = useState('');
  let current = null;
  for (const s of songs) {
    if (s.premium && app.plan !== 'premium') continue;
    const p = app.progress[s.id] || {};
    const n = NODES.find((x) => !p[x.key]);
    if (n) { current = `${s.id}:${n.key}`; break; }
  }
  const open = (song, node, state) => {
    if (state === 'premium') return nav('/premium');
    if (state === 'locked') return;
    if (node.key === 'chest') {
      if (state === 'done') return;
      actions.completeNode(song.id, 'chest');
      actions.addXp(20);
      actions.addGems(15);
      chime(true);
      setToast('🎁 Chest opened! +20 XP · +15 💎');
      setTimeout(() => setToast(''), 2400);
      return;
    }
    nav(`/lesson/${song.id}/${node.key}`);
  };
  useEffect(() => {
    document.querySelector('.node.current')?.scrollIntoView?.({ block: 'center' });
  }, []);

  return (
    <div className="home">
      <StatusBar />
      <div className="path">
        {songs.map((song, ui) => {
          const locked = song.premium && app.plan !== 'premium';
          const p = app.progress[song.id] || {};
          return (
            <section key={song.id} className="unit" style={{ '--c': song.color }}>
              <div className={`unit-banner ${locked ? 'is-locked' : ''}`} data-testid={`unit-${song.id}`}>
                <div>
                  <div className="unit-kicker">UNIT {ui + 1}{locked ? ' · 👑 PREMIUM' : ''}</div>
                  <div className="unit-title">{song.title} <span>{song.titleEn}</span></div>
                </div>
                <button className="guide" onClick={() => (locked ? nav('/premium') : nav(`/lesson/${song.id}/song`))}>{song.emoji}</button>
              </div>
              <div className="nodes">
                {ui === 0 && <div className="path-mascot"><MascotHero height={150} chars={[]} /></div>}
                {NODES.map((node, ni) => {
                  const id = `${song.id}:${node.key}`;
                  const state = locked ? 'premium' : p[node.key] ? 'done' : id === current ? 'current' : 'locked';
                  return (
                    <div key={node.key} className="node-wrap" style={{ transform: `translateX(${OFFSETS[ni]}px)` }}>
                      {state === 'current' && <div className="start-tip">{node.key === 'chest' ? 'OPEN' : 'START'}</div>}
                      <button className={`node ${state} ${node.key}`} onClick={() => open(song, node, state)} data-testid={`node-${song.id}-${node.key}`}>
                        <span>{state === 'done' && node.key !== 'chest' ? '✓' : state === 'premium' ? '🔒' : node.icon}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
              {ui === 0 && (
                <button className="invite-promo" onClick={() => nav('/invite')} data-testid="invite-promo">
                  <span className="ip-ic">🎁</span>
                  <span className="grow"><b>Invite friends, get Premium free</b><small>1 week of Premium for every friend who joins</small></span>
                  <span className="ip-go">›</span>
                </button>
              )}
            </section>
          );
        })}
      </div>
      {toast && <div className="app-toast">{toast}</div>}
    </div>
  );
}

/* ---------------- Lesson shell ---------------- */
function Lesson() {
  const { id, node } = useParams();
  const song = useContent().find((s) => s.id === id);
  const app = useApp();
  const nav = useNavigate();
  const [progress, setProgress] = useState(0);
  if (!song) return <Navigate to="/" />;
  if (song.premium && app.plan !== 'premium') return <Navigate to="/premium" />;
  const finish = (earned) => {
    actions.completeNode(song.id, node);
    actions.addXp(earned);
    nav(`/done/${song.id}/${node}?xp=${earned}`);
  };
  return (
    <div className="lesson" style={{ '--c': song.color }}>
      <header className="lesson-top">
        <button className="x" onClick={() => { stopSpeaking(); nav('/'); }} data-testid="quit">✕</button>
        <div className="pbar"><i style={{ width: `${Math.max(4, progress * 100)}%` }} /></div>
        <span className="hearts">❤️ {app.plan === 'premium' ? '∞' : app.hearts}</span>
      </header>
      {node === 'song' && <SongStep song={song} setProgress={setProgress} onDone={finish} />}
      {node === 'pinyin' && <PinyinQuiz song={song} setProgress={setProgress} onDone={finish} />}
      {node === 'speak' && <SpeakStep song={song} setProgress={setProgress} onDone={finish} />}
    </div>
  );
}

function Syl({ s, active, showPy = true, big, onClick, state }) {
  return (
    <span className={`syl t${s.tone} ${active ? 'active' : ''} ${big ? 'big' : ''} ${state || ''}`} onClick={onClick}>
      {showPy && <small>{s.py}</small>}
      <b>{s.ch}</b>
    </span>
  );
}

/* ----- 1. Song: sing along ----- */
function SongStep({ song, setProgress, onDone }) {
  const lines = useMemo(() => song.lines.map((l) => ({ ...l, syl: toSyllables(l.zh) })), [song]);
  const [pos, setPos] = useState({ line: -1, ch: -1 });
  const [playing, setPlaying] = useState(false);
  const stop = useRef(false);

  const play = async () => {
    if (playing) { stop.current = true; return; }
    stop.current = false;
    setPlaying(true);
    for (let li = 0; li < lines.length && !stop.current; li++) {
      singLine(lines[li].syl, li);
      for (let ci = 0; ci < lines[li].syl.length && !stop.current; ci++) {
        setPos({ line: li, ch: ci });
        setProgress((li + (ci + 1) / lines[li].syl.length) / lines.length);
        await wait(CHAR_MS);
      }
      await wait(250);
    }
    setPlaying(false);
    setPos({ line: -1, ch: -1 });
  };
  useEffect(() => () => { stop.current = true; stopSpeaking(); }, []);

  return (
    <>
      <div className="lesson-body">
        <h2 className="q-title">Listen and sing along</h2>
        <div className="song-stage">
          <VinylStage playing={playing} color={song.color} title={song.title} height={140} />
        </div>
        <div className="lyrics">
          {lines.map((l, li) => (
            <div key={li} className={`lyric ${pos.line === li ? 'cur' : ''}`}>
              <div className="hz">
                {l.syl.map((s, ci) => <Syl key={ci} s={s} active={pos.line === li && ci <= pos.ch} />)}
              </div>
              <div className="en">{l.en}<button className="say" onClick={() => speak(l.zh)} title="Hear it spoken">🔊</button></div>
            </div>
          ))}
        </div>
      </div>
      <footer className="lesson-foot">
        <button className={`btn3d round-play ${playing ? 'on' : ''}`} onClick={play} data-testid="play">{playing ? '❚❚' : '▶'}</button>
        <button className="btn3d primary grow" onClick={() => { stop.current = true; onDone(15); }} data-testid="next">Continue</button>
      </footer>
    </>
  );
}

/* ----- 2. Pinyin quiz ----- */
const VOWEL_MARKS = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', ü: 'ǖǘǚǜ' };
function stripTone(py) {
  return py.normalize('NFD').replace(/[̀́̌̄]/g, '').normalize('NFC');
}
function markTone(base, tone) {
  if (!tone) return base;
  let idx = base.search(/[ae]/);
  if (idx < 0) idx = base.indexOf('ou');
  if (idx < 0) {
    for (let i = base.length - 1; i >= 0; i--) if ('iouü'.includes(base[i])) { idx = i; break; }
  }
  if (idx < 0) return base;
  const v = base[idx];
  return base.slice(0, idx) + VOWEL_MARKS[v][tone - 1] + base.slice(idx + 1);
}
function buildQuiz(song) {
  const all = song.lines.flatMap((l) => toSyllables(l.zh));
  const uniq = [];
  all.forEach((s) => { if (s.tone && !uniq.find((u) => u.ch === s.ch)) uniq.push(s); });
  const pick = [uniq[1], uniq[3], uniq[5], uniq[7]].filter(Boolean);
  return pick.map((s, i) => {
    if (i % 2 === 0) {
      const base = stripTone(s.py);
      const tones = [1, 2, 3, 4].filter((t) => t !== s.tone);
      const opts = [s.py, markTone(base, tones[(i + 1) % 3]), markTone(base, tones[(i + 2) % 3])];
      const order = [[1, 0, 2], [2, 1, 0], [0, 2, 1]][i % 3].map((k) => opts[k]);
      return { type: 'py', s, options: order, answer: s.py };
    }
    return { type: 'tone', s, options: [1, 2, 3, 4], answer: s.tone };
  });
}

function PinyinQuiz({ song, setProgress, onDone }) {
  const qs = useMemo(() => buildQuiz(song), [song]);
  const [qi, setQi] = useState(0);
  const [sel, setSel] = useState(null);
  const [checked, setChecked] = useState(null);
  const [score, setScore] = useState(0);
  const q = qs[qi];
  useEffect(() => { setProgress(qi / qs.length); }, [qi, qs.length, setProgress]);
  const hear = () => { singLine([q.s], 0); setTimeout(() => speak(q.s.ch, 0.6), 450); };
  const check = () => {
    const ok = sel === q.answer;
    setChecked(ok ? 'right' : 'wrong');
    chime(ok);
    if (ok) setScore(score + 1); else actions.loseHeart();
    setProgress((qi + 1) / qs.length);
  };
  const next = () => {
    if (qi < qs.length - 1) { setQi(qi + 1); setSel(null); setChecked(null); }
    else onDone(10 + score * 5);
  };
  return (
    <>
      <div className="lesson-body">
        <span className="new-word">✨ NEW WORD</span>
        <h2 className="q-title">{q.type === 'py' ? 'Choose the correct Pinyin' : 'Which tone is it?'}</h2>
        <button className="char-card" onClick={hear} data-testid="char-card">
          <span className="speaker">🔊</span>
          <b>{q.s.ch}</b>
          {q.type === 'tone' && <small>{stripTone(q.s.py)}</small>}
        </button>
        {q.type === 'py' ? (
          <div className="options">
            {q.options.map((o) => (
              <button key={o} className={`opt ${sel === o ? 'sel' : ''} ${checked && o === q.answer ? 'right' : ''} ${checked === 'wrong' && sel === o ? 'wrong' : ''}`}
                disabled={!!checked} onClick={() => setSel(o)} data-testid={`opt-${o}`} data-ok={o === q.answer ? '1' : '0'}>
                {o}
              </button>
            ))}
          </div>
        ) : (
          <div className="tone-grid">
            {q.options.map((t) => (
              <button key={t} className={`tone-opt t${t} ${sel === t ? 'sel' : ''} ${checked && t === q.answer ? 'right' : ''} ${checked === 'wrong' && sel === t ? 'wrong' : ''}`}
                disabled={!!checked} onClick={() => { setSel(t); singLine([{ tone: t }], 0); }} data-testid={`tone-${t}`} data-ok={t === q.answer ? '1' : '0'}>
                <ToneCurve tone={t} />
                <b>{markTone(stripTone(q.s.py), t)}</b>
                <small>{TONE_INFO[t].name}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      <footer className={`lesson-foot ${checked || ''}`}>
        {checked ? (
          <div className="verdict">
            <div className="v-title">{checked === 'right' ? ['Nice!', 'Great job!', 'Correct!', '太棒了!'][qi % 4] : 'Not quite'}</div>
            {checked === 'wrong' && <div className="v-sub">Correct answer: <b>{q.type === 'py' ? q.answer : `${TONE_INFO[q.answer].name} — ${q.s.py}`}</b></div>}
            <button className={`btn3d primary ${checked === 'right' ? 'green' : ''}`} onClick={next} data-testid="continue">Continue</button>
          </div>
        ) : (
          <button className="btn3d primary grow" disabled={sel === null} onClick={check} data-testid="check">Check</button>
        )}
      </footer>
    </>
  );
}

function ToneCurve({ tone }) {
  const paths = { 1: 'M6 10 L94 10', 2: 'M6 32 Q60 28 94 6', 3: 'M6 14 Q40 40 60 34 T94 8', 4: 'M6 6 L94 36', 0: 'M44 22 L56 22' };
  return (
    <svg viewBox="0 0 100 42" className="curve">
      <path d={paths[tone]} stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ----- 3. Speaking ----- */
function SpeakStep({ song, setProgress, onDone }) {
  const lines = useMemo(() => song.lines.map((l) => ({ ...l, syl: toSyllables(l.zh) })), [song]);
  const [li, setLi] = useState(0);
  const [phase, setPhase] = useState('idle');
  const [result, setResult] = useState(null);
  const [total, setTotal] = useState(0);
  const line = lines[li];
  useEffect(() => { setProgress(li / lines.length); }, [li, lines.length, setProgress]);

  const listen = async () => {
    setPhase('listening');
    singLine(line.syl, li);
    await Promise.all([speak(line.zh), wait(line.syl.length * CHAR_MS)]);
    setPhase('idle');
  };
  const record = async () => {
    setResult(null);
    setPhase('recording');
    await wait(window.__REC_MS ?? 2200);
    setPhase('scoring');
    const r = await recognise(line.zh, `${song.id}-${li}`, line.syl);
    actions.recordLine(song.id, li, r.score);
    chime(r.score === 100);
    setResult(r);
    setPhase('result');
    if (r.score === 100) setProgress((li + 1) / lines.length);
  };
  const next = () => {
    const add = result?.score === 100 ? 10 : 5;
    if (li < lines.length - 1) { setTotal(total + add); setLi(li + 1); setResult(null); setPhase('idle'); }
    else onDone(total + add);
  };
  const missIdx = result ? result.perChar.findIndex((x) => !x) : -1;
  const miss = missIdx >= 0 ? line.syl[missIdx] : null;
  const good = result?.score === 100;

  return (
    <>
      <div className="lesson-body">
        <h2 className="q-title">Speak this sentence</h2>
        <div className="speak-row">
          <div className="mini-lantern"><MascotHero height={118} chars={[]} /></div>
          <button className="say-bubble" onClick={listen} data-testid="listen">
            <span className="speaker">🔊</span>
            <span className="hz">
              {line.syl.map((s, ci) => <Syl key={ci} s={s} state={result ? (result.perChar[ci] ? 'good' : 'bad') : ''} />)}
            </span>
            <small>{line.en}</small>
          </button>
        </div>
        <VoiceOrb height={150} state={phase === 'result' ? (good ? 'good' : 'bad') : phase} />
        <div className="center muted small">{phase === 'recording' ? 'Listening… sing it back!' : phase === 'scoring' ? 'AI is checking your tones…' : phase === 'listening' ? 'Playing the line…' : `Line ${li + 1} of ${lines.length}`}</div>
      </div>
      <footer className={`lesson-foot ${phase === 'result' ? (good ? 'right' : 'wrong') : ''}`}>
        {phase === 'result' ? (
          <div className="verdict">
            <div className="v-title">{good ? '完美! Perfect tones' : `Almost! ${result.score}%`}</div>
            {!good && <div className="v-sub">Check <b>{miss?.ch} {miss?.py}</b> — {TONE_INFO[miss?.tone ?? 0].name.toLowerCase()}, {TONE_INFO[miss?.tone ?? 0].desc.toLowerCase()}.</div>}
            <div className="v-actions">
              {!good && <button className="btn3d ghost" onClick={record} data-testid="retry">Try again</button>}
              <button className={`btn3d primary ${good ? 'green' : ''}`} onClick={next} data-testid="next-line">Continue</button>
            </div>
          </div>
        ) : (
          <button className={`btn3d mic-btn ${phase === 'recording' ? 'rec' : ''}`} onClick={record} disabled={phase === 'recording' || phase === 'scoring'} data-testid="mic">
            🎤 {phase === 'recording' ? 'Listening…' : 'Tap to speak'}
          </button>
        )}
      </footer>
    </>
  );
}

/* ---------------- Lesson complete ---------------- */
function LessonDone() {
  const { id, node } = useParams();
  const loc = useLocation();
  const song = useContent().find((s) => s.id === id);
  const app = useApp();
  const nav = useNavigate();
  const xp = Number(new URLSearchParams(loc.search).get('xp') || 15);
  const best = Object.values(app.progress[id]?.best || {});
  const acc = node === 'speak' && best.length ? Math.round(best.reduce((a, b) => a + b, 0) / best.length) : node === 'pinyin' ? Math.min(100, Math.round(((xp - 10) / 20) * 100)) : 100;
  const unitDone = app.progress[id]?.completed;
  useEffect(() => { chime(true); }, []);
  return (
    <div className="done" style={{ '--c': song?.color }}>
      <Confetti />
      <Trophy3D height={230} />
      <h2>{unitDone ? 'Unit complete!' : 'Lesson complete!'}</h2>
      <p className="muted">{song?.title} · {song?.titleEn}</p>
      <div className="done-stats">
        <div className="ds gold"><span>TOTAL XP</span><b>⭐ {xp}</b></div>
        <div className="ds green"><span>{acc >= 90 ? 'AMAZING' : 'GOOD'}</span><b>🎯 {acc}%</b></div>
        <div className="ds red"><span>STREAK</span><b>🔥 {app.streak}</b></div>
      </div>
      {unitDone && (
        <div className="new-badge">
          <span className="badge-ic">🎵</span>
          <div><b>Achievement unlocked</b><div className="muted small">First Song — finish your first song</div></div>
        </div>
      )}
      <button className="btn3d primary wide" onClick={() => nav('/')} data-testid="continue-home">Continue</button>
    </div>
  );
}

function Confetti() {
  const colors = ['#E8453C', '#F5A623', '#1FA971', '#7B61FF', '#1E88E5'];
  return (
    <div className="confetti">
      {Array.from({ length: 36 }).map((_, i) => (
        <i key={i} style={{ left: `${(i * 37) % 100}%`, background: colors[i % 5], animationDelay: `${(i % 10) * 0.12}s`, animationDuration: `${2 + (i % 5) * 0.4}s` }} />
      ))}
    </div>
  );
}

/* ---------------- Subscription ---------------- */
function Paywall() {
  const app = useApp();
  const [plan, setPlan] = useState('year');
  const [paying, setPaying] = useState(false);
  const nav = useNavigate();
  const buy = async () => {
    setPaying(true);
    await wait(1400); // App Store / Google Play billing or FPX via backend in production
    actions.upgrade();
    actions.refillHearts();
    setPaying(false);
  };
  if (app.plan === 'premium')
    return (
      <div className="paywall">
        <div className="pw-hero"><MascotHero height={170} chars={['会', '员']} /><h2>You're Premium! 👑</h2><p>All songs, unlimited hearts and AI speaking feedback.</p></div>
        <button className="btn3d gold wide" onClick={() => nav('/')} data-testid="go-learn">Start learning</button>
      </div>
    );
  return (
    <div className="paywall">
      <div className="pw-hero">
        <MascotHero height={150} chars={['会', '员']} />
        <h2>ChangChang <span className="pw-tag">PREMIUM</span></h2>
        <p>Every song, unlimited ❤️ hearts and AI speaking feedback.</p>
      </div>
      <div className="pw-list">
        <div><i>🎵</i><b>All songs & units</b><span>Free: 2 songs</span></div>
        <div><i>❤️</i><b>Unlimited hearts</b><span>Free: 5</span></div>
        <div><i>🎤</i><b>Unlimited AI speaking</b><span>Free: 5 / day</span></div>
        <div><i>📴</i><b>Offline audio</b><span>Premium only</span></div>
      </div>
      <div className="plans">
        <button className={`plan ${plan === 'month' ? 'on' : ''}`} onClick={() => setPlan('month')}>
          <b>Monthly</b><span>RM 14.90 / mo</span>
        </button>
        <button className={`plan ${plan === 'year' ? 'on' : ''}`} onClick={() => setPlan('year')} data-testid="plan-year">
          <em>SAVE 33%</em><b>Yearly</b><span>RM 119 / yr</span>
        </button>
      </div>
      <button className="btn3d gold wide" onClick={buy} disabled={paying} data-testid="subscribe">
        {paying ? 'Processing…' : 'Start my free week'}
      </button>
      <div className="fine">Cancel anytime · App Store / Google Play / FPX</div>
    </div>
  );
}

/* ---------------- Profile ---------------- */
function Profile() {
  const app = useApp();
  const songs = useContent();
  const nav = useNavigate();
  const completed = Object.values(app.progress).filter((p) => p.completed).length;
  return (
    <div className="profile">
      <div className="prof-top">
        <div className="avatar">{app.user?.name?.[0]?.toUpperCase()}</div>
        <h2>{app.user?.name}</h2>
        <div className="muted small">{app.user?.email} · {app.plan === 'premium' ? '👑 Premium' : 'Free plan'}</div>
      </div>
      <h3 className="section">Statistics</h3>
      <div className="stat-grid">
        <div><span>🔥</span><b>{app.streak}</b><small>Day streak</small></div>
        <div><span>⭐</span><b>{app.xp}</b><small>Total XP</small></div>
        <div><span>🎵</span><b>{completed}/{songs.length}</b><small>Songs</small></div>
        <div><span>💎</span><b>{app.gems}</b><small>Gems</small></div>
      </div>
      <h3 className="section">Achievements</h3>
      <div className="badges">
        {ACHIEVEMENTS.map((a) => {
          const got = app.achievements.includes(a.id);
          return (
            <div key={a.id} className={`badge ${got ? 'got' : ''}`}>
              <span>{a.icon}</span><b>{a.name}</b><small>{a.desc}</small>
            </div>
          );
        })}
      </div>
      <button className="row-card invite-row" onClick={() => nav('/invite')} data-testid="invite-row">
        <span className="ip-ic sm">🎁</span>
        <div className="grow"><b>Invite friends</b><div className="muted small">Code {app.referralCode} · {(app.referrals || []).filter((r) => r.status !== 'invited').length} joined</div></div>
        <span className="ip-go">›</span>
      </button>
      <h3 className="section">Reminders</h3>
      <div className="row-card">
        <div className="grow"><b>Daily practice reminder</b><div className="muted small">Every day at {app.reminderTime}</div></div>
        <button className={`switch ${app.reminders ? 'on' : ''}`} onClick={actions.toggleReminders}><i /></button>
      </div>
      <button className="btn3d ghost wide" onClick={() => { actions.logout(); nav('/login'); }}>Log out</button>
    </div>
  );
}

/* ---------------- Referral ---------------- */
const MILESTONES = [
  { n: 1, icon: '👑', title: '1 week Premium' },
  { n: 3, icon: '🗓️', title: '1 month Premium' },
  { n: 5, icon: '🏅', title: 'Ambassador badge' },
];

function Invite() {
  const app = useApp();
  const nav = useNavigate();
  const [toast, setToast] = useState('');
  const code = app.referralCode || 'CHANG-001';
  const link = `https://changchang.app/r/${code}`;
  const text = `Let's learn Mandarin by singing on ChangChang 🎵 Use my code ${code} for a free week of Premium!`;
  const refs = app.referrals || [];
  const joined = refs.filter((r) => r.status !== 'invited').length;
  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  const share = async (channel) => {
    try {
      if (channel === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`, '_blank');
      } else if (Capacitor.isNativePlatform()) {
        await Share.share({ title: 'ChangChang', text, url: link, dialogTitle: 'Invite a friend' });
      } else if (navigator.share && !window.__DEMO_MODE) {
        await navigator.share({ title: 'ChangChang', text, url: link });
      } else {
        await navigator.clipboard?.writeText(`${text} ${link}`);
      }
    } catch { /* user closed the share sheet */ }
    actions.invite(channel);
    flash('Invite sent! 📨');
    // DEMO: simulate the backend telling us a friend used the code
    setTimeout(() => { const m = actions.demoFriendEvent(); if (m) flash(m); }, 2600);
  };
  const copy = async () => {
    try { await navigator.clipboard?.writeText(code); } catch {}
    flash('Code copied ✔');
  };

  return (
    <div className="invite">
      <header className="inv-top">
        <button className="x" onClick={() => nav(-1)} data-testid="inv-back">‹</button>
        <b>Invite friends</b>
        <span />
      </header>
      <div className="inv-hero">
        <MascotHero height={150} chars={['朋', '友']} />
        <h2>Learn together, get Premium free</h2>
        <p>Your friend gets <b>1 week of Premium</b>. You get <b>1 week</b> for every friend who joins.</p>
      </div>
      <div className="code-card">
        <small>YOUR CODE</small>
        <b data-testid="ref-code">{code}</b>
        <button className="btn3d ghost" onClick={copy}>Copy</button>
      </div>
      <div className="inv-actions">
        <button className="btn3d wa" onClick={() => share('whatsapp')}>WhatsApp</button>
        <button className="btn3d primary" onClick={() => share('share')} data-testid="share">Share link</button>
      </div>
      <h3 className="section">Rewards</h3>
      <div className="ladder">
        <div className="ladder-bar"><i style={{ width: `${Math.min(100, (joined / 5) * 100)}%` }} /></div>
        {MILESTONES.map((m) => (
          <div key={m.n} className={`rung ${joined >= m.n ? 'got' : ''}`}>
            <span>{joined >= m.n ? '✓' : m.icon}</span>
            <b>{m.n} friend{m.n > 1 ? 's' : ''}</b>
            <small>{m.title}</small>
          </div>
        ))}
      </div>
      <h3 className="section">Your invites <span className="muted small">{joined} joined</span></h3>
      {refs.length === 0 ? (
        <div className="empty">No invites yet — share your code to start earning 🎁</div>
      ) : (
        <div className="friends">
          {[...refs].reverse().map((r) => (
            <div key={r.id} className="friend">
              <span className="f-av">{r.name ? r.name[0] : '✉️'}</span>
              <div className="grow"><b>{r.name || 'Invite sent'}</b><small>via {r.channel === 'whatsapp' ? 'WhatsApp' : 'share link'}</small></div>
              <span className={`f-st ${r.status}`}>{r.status === 'invited' ? 'Pending' : r.status === 'joined' ? 'Joined +50💎' : 'Premium 👑'}</span>
            </div>
          ))}
        </div>
      )}
      {toast && <div className="app-toast">{toast}</div>}
    </div>
  );
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
