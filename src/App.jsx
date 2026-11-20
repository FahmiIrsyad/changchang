import { useEffect, useMemo, useRef, useState } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams, Navigate, Link, useLocation } from 'react-router-dom';
import { actions, toSyllables, useApp, useContent } from './store';
import { ACHIEVEMENTS, TONE_INFO } from './data';
import { CHAR_MS, recognise, speak } from './audio';
import Admin from './Admin';

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
      <div className="screen">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/song/:id" element={<SongLesson />} />
          <Route path="/song/:id/done" element={<Complete />} />
          <Route path="/premium" element={<Paywall />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
      {showTabs && <TabBar />}
    </div>
  );
}

function TabBar() {
  const { pathname } = useLocation();
  const tabs = [
    ['/', '🏠', 'Learn'],
    ['/premium', '💎', 'Premium'],
    ['/profile', '👤', 'Me'],
  ];
  return (
    <nav className="tabbar">
      {tabs.map(([to, ic, label]) => (
        <Link key={to} to={to} className={pathname === to ? 'on' : ''} data-testid={`tab-${label}`}>
          <span>{ic}</span>
          {label}
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
  const submit = (e) => {
    e.preventDefault();
    if (!email || !pw) return;
    actions.login(name || email.split('@')[0], email);
    nav('/');
  };
  return (
    <div className="login">
      <div className="login-hero">
        <div className="logo-badge">唱</div>
        <h1>ChangChang</h1>
        <p>Learn Mandarin through songs.<br />Sing → Read Pinyin → Speak.</p>
      </div>
      <form onSubmit={submit} className="card form">
        <div className="seg">
          <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => setMode('register')}>Sign up</button>
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>Log in</button>
        </div>
        {mode === 'register' && (
          <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} data-testid="name" />
        )}
        <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="email" />
        <input placeholder="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} data-testid="password" />
        <button className="btn primary big" data-testid="submit">{mode === 'register' ? 'Create account' : 'Log in'}</button>
        <div className="or">or</div>
        <div className="social">
          <button type="button" className="btn ghost">Continue with Google</button>
          <button type="button" className="btn ghost">Continue with Apple</button>
        </div>
        <Link to="/admin" className="muted small center">Education team? Open the admin portal →</Link>
      </form>
    </div>
  );
}

/* ---------------- Home ---------------- */
function Home() {
  const app = useApp();
  const songs = useContent().filter((s) => s.published);
  const nav = useNavigate();
  const pct = Math.min(100, Math.round((app.todayXp / app.dailyGoal) * 100));
  const next = songs.find((s) => !app.progress[s.id]?.completed && (!s.premium || app.plan === 'premium')) || songs[0];
  return (
    <div className="page home">
      <header className="home-top">
        <div>
          <div className="muted small">你好, {app.user?.name} 👋</div>
          <h2>Let's sing today</h2>
        </div>
        <div className="chips">
          <span className="chip fire" data-testid="streak">🔥 {app.streak}</span>
          <span className="chip xp">⭐ {app.xp}</span>
        </div>
      </header>

      <div className="card goal">
        <Ring pct={pct} />
        <div>
          <div className="goal-title">Daily goal</div>
          <div className="muted small">{app.todayXp} / {app.dailyGoal} XP today</div>
          <div className="week">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <span key={i} className={i < app.streak ? 'hit' : ''}>{d}</span>
            ))}
          </div>
        </div>
      </div>

      {next && (
        <button className="card continue" style={{ '--c': next.color }} onClick={() => nav(`/song/${next.id}`)} data-testid="continue">
          <div className="cont-emoji">{next.emoji}</div>
          <div className="grow">
            <div className="muted small">Continue</div>
            <div className="cont-title">{next.title} <span>{next.titleEn}</span></div>
            <Progress song={next} />
          </div>
          <div className="play">▶</div>
        </button>
      )}

      <h3 className="section">Song library</h3>
      <div className="songs">
        {songs.map((s) => {
          const locked = s.premium && app.plan !== 'premium';
          const done = app.progress[s.id]?.completed;
          return (
            <button
              key={s.id}
              className={`song-card ${locked ? 'locked' : ''}`}
              style={{ '--c': s.color }}
              onClick={() => nav(locked ? '/premium' : `/song/${s.id}`)}
              data-testid={`song-${s.id}`}
            >
              <div className="song-emoji">{s.emoji}</div>
              <div className="song-zh">{s.title}</div>
              <div className="song-en">{s.titleEn}</div>
              <div className="song-meta">
                {locked ? <span className="tag pro">🔒 Premium</span> : done ? <span className="tag ok">✓ Done</span> : <span className="tag">{s.level}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Ring({ pct }) {
  const r = 30, c = 2 * Math.PI * r;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" className="ring">
      <circle cx="38" cy="38" r={r} stroke="#F1E6DA" strokeWidth="8" fill="none" />
      <circle cx="38" cy="38" r={r} stroke="var(--red)" strokeWidth="8" fill="none" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} transform="rotate(-90 38 38)" style={{ transition: 'stroke-dashoffset .8s' }} />
      <text x="38" y="43" textAnchor="middle" fontSize="15" fontWeight="800" fill="var(--ink)">{pct}%</text>
    </svg>
  );
}

function Progress({ song }) {
  const app = useApp();
  const done = app.progress[song.id]?.done?.length || 0;
  const pct = Math.round((done / song.lines.length) * 100);
  return (
    <div className="bar"><i style={{ width: `${pct}%` }} /></div>
  );
}

/* ---------------- Lesson: Song → Pinyin → Speak ---------------- */
function SongLesson() {
  const { id } = useParams();
  const song = useContent().find((s) => s.id === id);
  const app = useApp();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  if (!song) return <Navigate to="/" />;
  if (song.premium && app.plan !== 'premium') return <Navigate to="/premium" />;
  const steps = ['Song', 'Pinyin', 'Speak'];
  return (
    <div className="page lesson" style={{ '--c': song.color }}>
      <header className="lesson-top">
        <button className="icon-btn" onClick={() => nav('/')}>✕</button>
        <div className="stepper">
          {steps.map((s, i) => (
            <button key={s} className={`st ${i === step ? 'on' : ''} ${i < step ? 'past' : ''}`} onClick={() => setStep(i)} data-testid={`step-${s}`}>
              <b>{i + 1}</b>{s}
            </button>
          ))}
        </div>
      </header>
      {step === 0 && <SongStep song={song} onNext={() => setStep(1)} />}
      {step === 1 && <PinyinStep song={song} onNext={() => setStep(2)} />}
      {step === 2 && <SpeakStep song={song} onDone={() => { actions.completeSong(song.id); actions.addXp(20); nav(`/song/${song.id}/done`); }} />}
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

function SongStep({ song, onNext }) {
  const lines = useMemo(() => song.lines.map((l) => ({ ...l, syl: toSyllables(l.zh) })), [song]);
  const [pos, setPos] = useState({ line: -1, ch: -1 });
  const [playing, setPlaying] = useState(false);
  const [showPy, setShowPy] = useState(true);
  const stop = useRef(false);

  const play = async () => {
    if (playing) { stop.current = true; return; }
    stop.current = false;
    setPlaying(true);
    for (let li = 0; li < lines.length && !stop.current; li++) {
      speak(lines[li].zh);
      for (let ci = 0; ci < lines[li].syl.length && !stop.current; ci++) {
        setPos({ line: li, ch: ci });
        await wait(CHAR_MS);
      }
      await wait(250);
    }
    setPlaying(false);
    setPos({ line: -1, ch: -1 });
  };
  useEffect(() => () => { stop.current = true; window.speechSynthesis?.cancel(); }, []);

  return (
    <div className="step-body">
      <div className="song-hero">
        <div className={`disc ${playing ? 'spin' : ''}`}>{song.emoji}</div>
        <div>
          <h2>{song.title}</h2>
          <div className="muted">{song.titleEn}</div>
        </div>
      </div>
      <div className="lyrics">
        {lines.map((l, li) => (
          <div key={li} className={`lyric ${pos.line === li ? 'cur' : ''}`}>
            <div className="hz">
              {l.syl.map((s, ci) => (
                <Syl key={ci} s={s} showPy={showPy} active={pos.line === li && ci <= pos.ch} />
              ))}
            </div>
            <div className="en">{l.en}</div>
          </div>
        ))}
      </div>
      <div className="controls">
        <label className="toggle"><input type="checkbox" checked={showPy} onChange={() => setShowPy(!showPy)} /> Pinyin</label>
        <button className="btn round" onClick={play} data-testid="play">{playing ? '❚❚' : '▶'}</button>
        <button className="btn primary" onClick={onNext} data-testid="next">Next: Pinyin →</button>
      </div>
    </div>
  );
}

function PinyinStep({ song, onNext }) {
  const lines = useMemo(() => song.lines.map((l) => ({ ...l, syl: toSyllables(l.zh) })), [song]);
  const [sel, setSel] = useState({ li: 0, ci: 0 });
  const s = lines[sel.li].syl[sel.ci];
  const info = TONE_INFO[s.tone];
  return (
    <div className="step-body">
      <div className="card tone-card" style={{ '--tc': info.color }}>
        <div className="tc-ch">{s.ch}</div>
        <div className="grow">
          <div className="tc-py">{s.py}</div>
          <div className="tc-name">{info.name} — {info.desc}</div>
          <ToneCurve tone={s.tone} />
        </div>
        <button className="icon-btn" onClick={() => speak(s.ch, 0.6)} title="Listen">🔊</button>
      </div>
      <div className="legend">
        {[1, 2, 3, 4, 0].map((t) => (
          <span key={t} className={`lg t${t}`}>{TONE_INFO[t].name}</span>
        ))}
      </div>
      <div className="lyrics compact">
        {lines.map((l, li) => (
          <div key={li} className="lyric">
            <div className="hz">
              {l.syl.map((x, ci) => (
                <Syl key={ci} s={x} big active={sel.li === li && sel.ci === ci} onClick={() => { setSel({ li, ci }); speak(x.ch, 0.6); }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="controls">
        <span className="muted small">Tap any character to hear it</span>
        <button className="btn primary" onClick={onNext} data-testid="next">Next: Speak →</button>
      </div>
    </div>
  );
}

function ToneCurve({ tone }) {
  const paths = {
    1: 'M6 10 L94 10',
    2: 'M6 30 Q60 26 94 6',
    3: 'M6 16 Q40 40 60 34 T94 8',
    4: 'M6 6 L94 36',
    0: 'M44 24 L56 24',
  };
  return (
    <svg viewBox="0 0 100 42" className="curve">
      <path d={paths[tone]} stroke="var(--tc)" strokeWidth="5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function SpeakStep({ song, onDone }) {
  const lines = useMemo(() => song.lines.map((l) => ({ ...l, syl: toSyllables(l.zh) })), [song]);
  const [li, setLi] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle | listening | recording | scoring | result
  const [result, setResult] = useState(null);
  const line = lines[li];

  const listen = async () => {
    setPhase('listening');
    await speak(line.zh);
    setPhase('idle');
  };
  const record = async () => {
    setResult(null);
    setPhase('recording');
    await wait(window.__REC_MS ?? 2200);
    setPhase('scoring');
    const r = await recognise(line.zh, `${song.id}-${li}`, line.syl);
    actions.recordLine(song.id, li, r.score);
    actions.addXp(r.score === 100 ? 10 : 5);
    setResult(r);
    setPhase('result');
  };
  const next = () => {
    if (li < lines.length - 1) { setLi(li + 1); setResult(null); setPhase('idle'); }
    else onDone();
  };
  const missIdx = result ? result.perChar.findIndex((x) => !x) : -1;
  const miss = missIdx >= 0 ? line.syl[missIdx] : null;

  return (
    <div className="step-body speak">
      <div className="muted small center">Line {li + 1} of {lines.length} · Listen & repeat</div>
      <div className="dots">{lines.map((_, i) => <i key={i} className={i < li ? 'done' : i === li ? 'cur' : ''} />)}</div>
      <div className="card speak-card">
        <div className="hz">
          {line.syl.map((s, ci) => (
            <Syl key={ci} s={s} big state={result ? (result.perChar[ci] ? 'good' : 'bad') : ''} />
          ))}
        </div>
        <div className="en center">{line.en}</div>
        <button className="btn ghost" onClick={listen} disabled={phase === 'recording'} data-testid="listen">
          {phase === 'listening' ? '🔊 Playing…' : '🔊 Listen'}
        </button>
      </div>

      {phase === 'recording' && <Wave />}
      {phase === 'scoring' && <div className="scoring">AI is checking your tones…</div>}

      {result && (
        <div className={`card feedback ${result.score === 100 ? 'perfect' : ''}`} data-testid="feedback">
          <div className="score-ring" style={{ '--p': result.score }}><span>{result.score}</span></div>
          <div className="grow">
            {result.score === 100 ? (
              <>
                <div className="fb-title">完美! Perfect tones 🎉</div>
                <div className="muted small">+10 XP · every syllable matched</div>
              </>
            ) : (
              <>
                <div className="fb-title">Almost! Check <b className={`t${miss?.tone}`}>{miss?.ch} {miss?.py}</b></div>
                <div className="muted small">AI coach: {TONE_INFO[miss?.tone ?? 0].name} — {TONE_INFO[miss?.tone ?? 0].desc.toLowerCase()}. Try again slowly.</div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="mic-row">
        {phase === 'result' && result.score < 100 ? (
          <button className="btn ghost" onClick={next}>Skip</button>
        ) : <span />}
        <button className={`mic ${phase === 'recording' ? 'rec' : ''}`} onClick={record} disabled={phase === 'recording' || phase === 'scoring'} data-testid="mic">
          🎤
        </button>
        {phase === 'result' ? (
          <button className="btn primary" onClick={next} data-testid="next-line">{li < lines.length - 1 ? 'Next →' : 'Finish'}</button>
        ) : <span />}
      </div>
      <div className="muted small center">{phase === 'recording' ? 'Recording… sing it back!' : 'Tap the mic and repeat the line'}</div>
    </div>
  );
}

function Wave() {
  return (
    <div className="wave">
      {Array.from({ length: 28 }).map((_, i) => <i key={i} style={{ animationDelay: `${(i % 7) * 0.08}s` }} />)}
    </div>
  );
}

/* ---------------- Complete / Rewards ---------------- */
function Complete() {
  const { id } = useParams();
  const song = useContent().find((s) => s.id === id);
  const app = useApp();
  const nav = useNavigate();
  const best = Object.values(app.progress[id]?.best || {});
  const avg = best.length ? Math.round(best.reduce((a, b) => a + b, 0) / best.length) : 0;
  const earned = 20 + best.reduce((a, b) => a + (b === 100 ? 10 : 5), 0);
  return (
    <div className="page complete" style={{ '--c': song?.color }}>
      <Confetti />
      <div className="trophy">🏆</div>
      <h2>Song complete!</h2>
      <p className="muted">{song?.title} · {song?.titleEn}</p>
      <div className="stats">
        <div><b>+{earned}</b><span>XP earned</span></div>
        <div><b>{avg}%</b><span>Accuracy</span></div>
        <div><b>🔥 {app.streak}</b><span>Day streak</span></div>
      </div>
      <div className="card new-badge">
        <span className="badge-ic">🎵</span>
        <div><b>Achievement unlocked</b><div className="muted small">First Song — finish your first song</div></div>
      </div>
      <button className="btn primary big" onClick={() => nav('/')} data-testid="continue-home">Continue</button>
    </div>
  );
}

function Confetti() {
  const colors = ['#E8453C', '#F5A623', '#1FA971', '#7B61FF', '#1E88E5'];
  return (
    <div className="confetti">
      {Array.from({ length: 40 }).map((_, i) => (
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
    await wait(1400); // Stripe / Google Play Billing / App Store IAP via backend in production
    actions.upgrade();
    setPaying(false);
  };
  if (app.plan === 'premium')
    return (
      <div className="page paywall">
        <div className="pw-hero"><div className="crown">👑</div><h2>You're Premium!</h2><p className="muted">All songs and AI speaking feedback unlocked.</p></div>
        <button className="btn primary big" onClick={() => nav('/')} data-testid="go-learn">Start learning</button>
      </div>
    );
  return (
    <div className="page paywall">
      <div className="pw-hero">
        <div className="crown">👑</div>
        <h2>ChangChang Premium</h2>
        <p className="muted">Unlock every song and unlimited AI speaking feedback.</p>
      </div>
      <table className="compare">
        <thead><tr><th></th><th>Free</th><th>Premium</th></tr></thead>
        <tbody>
          <tr><td>Starter songs</td><td>2</td><td>All</td></tr>
          <tr><td>Pinyin & tone guide</td><td>✓</td><td>✓</td></tr>
          <tr><td>AI speaking feedback</td><td>5 / day</td><td>Unlimited</td></tr>
          <tr><td>Offline audio</td><td>—</td><td>✓</td></tr>
        </tbody>
      </table>
      <div className="plans">
        <button className={`plan ${plan === 'month' ? 'on' : ''}`} onClick={() => setPlan('month')}>
          <b>Monthly</b><span>RM 14.90 / mo</span>
        </button>
        <button className={`plan ${plan === 'year' ? 'on' : ''}`} onClick={() => setPlan('year')} data-testid="plan-year">
          <em>Save 33%</em><b>Yearly</b><span>RM 119 / yr</span>
        </button>
      </div>
      <button className="btn primary big" onClick={buy} disabled={paying} data-testid="subscribe">
        {paying ? 'Processing payment…' : 'Start 7-day free trial'}
      </button>
      <div className="muted tiny center">Cancel anytime · Secure payment via App Store / Google Play / FPX</div>
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
    <div className="page profile">
      <div className="prof-top">
        <div className="avatar">{app.user?.name?.[0]?.toUpperCase()}</div>
        <div>
          <h2>{app.user?.name}</h2>
          <div className="muted small">{app.user?.email}</div>
          <span className={`tag ${app.plan === 'premium' ? 'pro' : ''}`}>{app.plan === 'premium' ? '👑 Premium' : 'Free plan'}</span>
        </div>
      </div>
      <div className="stats">
        <div><b>🔥 {app.streak}</b><span>Streak</span></div>
        <div><b>⭐ {app.xp}</b><span>Total XP</span></div>
        <div><b>{completed}/{songs.length}</b><span>Songs</span></div>
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
      <h3 className="section">Reminders</h3>
      <div className="card row">
        <div className="grow"><b>Daily practice reminder</b><div className="muted small">Every day at {app.reminderTime}</div></div>
        <button className={`switch ${app.reminders ? 'on' : ''}`} onClick={actions.toggleReminders}><i /></button>
      </div>
      <button className="btn ghost" onClick={() => { actions.logout(); nav('/login'); }}>Log out</button>
    </div>
  );
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
