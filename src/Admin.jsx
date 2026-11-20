import { useMemo, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { actions, toSyllables, useContent } from './store';

export default function Admin() {
  const { pathname } = useLocation();
  const nav = [
    ['/admin', '📊', 'Dashboard'],
    ['/admin/songs', '🎵', 'Songs & lessons'],
    ['/admin/referrals', '🤝', 'Referrals'],
    ['/admin/users', '👥', 'Learners'],
    ['/admin/costs', '💰', 'Service costs'],
  ];
  return (
    <div className="admin">
      <aside>
        <div className="a-brand"><span className="logo-badge sm">唱</span> ChangChang <small>Admin</small></div>
        {nav.map(([to, ic, label]) => (
          <Link key={to} to={to} className={pathname === to || (to !== '/admin' && pathname.startsWith(to)) ? 'on' : ''}>
            <span>{ic}</span>{label}
          </Link>
        ))}
        <div className="a-foot">Education team · <b>Ms. Lim</b></div>
      </aside>
      <main>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="songs" element={<SongList />} />
          <Route path="songs/:id" element={<SongEditor />} />
          <Route path="referrals" element={<Referrals />} />
          <Route path="users" element={<Dashboard />} />
          <Route path="costs" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}

function Dashboard() {
  const dau = [182, 205, 214, 198, 236, 271, 290];
  const funnel = [
    ['Started song', 100],
    ['Finished Pinyin', 78],
    ['Finished Speaking', 64],
    ['Completed lesson', 58],
  ];
  return (
    <div className="a-page">
      <h1>Dashboard <small className="muted">Last 7 days · sample data</small></h1>
      <div className="kpis">
        <Kpi label="Daily active learners" value="290" delta="+12%" />
        <Kpi label="Lesson completion" value="58%" delta="+4 pts" />
        <Kpi label="Free → paid conversion" value="6.8%" delta="+0.9 pts" />
        <Kpi label="AI + hosting cost / mo" value="RM 412" delta="RM 0.21 / user" neutral />
      </div>
      <div className="a-grid">
        <div className="a-card">
          <h3>Daily active learners</h3>
          <div className="bars">
            {dau.map((v, i) => (
              <div key={i} className="b"><i style={{ height: `${(v / 300) * 100}%` }} /><span>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</span><em>{v}</em></div>
            ))}
          </div>
        </div>
        <div className="a-card">
          <h3>Lesson funnel</h3>
          {funnel.map(([l, v]) => (
            <div key={l} className="fn"><span>{l}</span><div className="fbar"><i style={{ width: `${v}%` }} /></div><b>{v}%</b></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, delta, neutral }) {
  return (
    <div className="a-card kpi">
      <div className="muted small">{label}</div>
      <div className="kv">{value}</div>
      <div className={neutral ? 'muted small' : 'up small'}>{delta}</div>
    </div>
  );
}

function SongList() {
  const songs = useContent();
  const nav = useNavigate();
  return (
    <div className="a-page">
      <h1>Songs & lessons <button className="btn primary" onClick={() => nav('/admin/songs/new')} data-testid="new-song">+ New song</button></h1>
      <div className="a-card">
        <table className="a-table">
          <thead><tr><th>Song</th><th>Lines</th><th>Level</th><th>Access</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {songs.map((s) => (
              <tr key={s.id}>
                <td><span className="em">{s.emoji}</span> <b>{s.title}</b> <span className="muted">{s.titleEn}</span></td>
                <td>{s.lines.length}</td>
                <td>{s.level}</td>
                <td>{s.premium ? <span className="tag pro">Premium</span> : <span className="tag">Free</span>}</td>
                <td>
                  <button className={`pill ${s.published ? 'live' : ''}`} onClick={() => actions.togglePublish(s.id)}>
                    {s.published ? '● Live' : '○ Draft'}
                  </button>
                </td>
                <td><Link to={`/admin/songs/${s.id}`}>Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SongEditor() {
  const { id } = useParams();
  const songs = useContent();
  const nav = useNavigate();
  const existing = songs.find((s) => s.id === id);
  const [title, setTitle] = useState(existing?.title || '');
  const [titleEn, setTitleEn] = useState(existing?.titleEn || '');
  const [emoji, setEmoji] = useState(existing?.emoji || '🐼');
  const [premium, setPremium] = useState(existing?.premium || false);
  const [lyrics, setLyrics] = useState(existing ? existing.lines.map((l) => l.zh).join('\n') : '');
  const [trans, setTrans] = useState(existing ? existing.lines.map((l) => l.en).join('\n') : '');
  const [audio, setAudio] = useState(existing ? `${existing.id}.mp3` : '');
  const [toast, setToast] = useState('');

  const lines = useMemo(() => lyrics.split('\n').map((x) => x.trim()).filter(Boolean), [lyrics]);
  const enLines = trans.split('\n');

  const publish = () => {
    const song = {
      id: existing?.id || `song-${Date.now()}`,
      title, titleEn, emoji, premium, level: 'Beginner',
      color: existing?.color || '#E07A2F',
      published: true,
      lines: lines.map((zh, i) => ({ zh, en: enLines[i] || '' })),
    };
    actions.saveSong(song);
    setToast('Published — live in the app now. No app-store release needed.');
    setTimeout(() => nav('/admin/songs'), 1800);
  };

  return (
    <div className="a-page">
      <h1>{existing ? 'Edit song' : 'New song'}</h1>
      <div className="a-grid editor">
        <div className="a-card form">
          <label>Chinese title<input value={title} onChange={(e) => setTitle(e.target.value)} data-testid="f-title" /></label>
          <label>English title<input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} data-testid="f-title-en" /></label>
          <div className="row2">
            <label>Cover emoji<input value={emoji} onChange={(e) => setEmoji(e.target.value)} /></label>
            <label>Access
              <select value={premium ? 'p' : 'f'} onChange={(e) => setPremium(e.target.value === 'p')}>
                <option value="f">Free</option><option value="p">Premium</option>
              </select>
            </label>
          </div>
          <label>Song audio (MP3)
            <div className="upload">
              <span>{audio || 'No file chosen'}</span>
              <input type="file" accept="audio/*" onChange={(e) => setAudio(e.target.files?.[0]?.name || '')} />
            </div>
          </label>
          <label>Lyrics (one line per row)<textarea rows="3" value={lyrics} onChange={(e) => setLyrics(e.target.value)} data-testid="f-lyrics" /></label>
          <label>English meaning (one line per row)<textarea rows="3" value={trans} onChange={(e) => setTrans(e.target.value)} data-testid="f-trans" /></label>
          <button className="btn primary big" onClick={publish} disabled={!title || !lines.length} data-testid="publish">Publish to app</button>
        </div>
        <div className="a-card preview">
          <h3>Auto-generated Pinyin <small className="muted">editable · tones colour-coded</small></h3>
          {lines.length === 0 && <div className="muted">Type lyrics to see Pinyin…</div>}
          {lines.map((l, i) => (
            <div key={i} className="lyric">
              <div className="hz">
                {toSyllables(l).map((s, ci) => (
                  <span key={ci} className={`syl t${s.tone}`}><small>{s.py}</small><b>{s.ch}</b></span>
                ))}
              </div>
              <div className="en">{enLines[i]}</div>
            </div>
          ))}
          {lines.length > 0 && <div className="muted small ex">✓ {lines.length} listen-and-repeat exercises created automatically</div>}
        </div>
      </div>
      {toast && <div className="toast" data-testid="toast">✅ {toast}</div>}
    </div>
  );
}

function Referrals() {
  const [friendReward, setFriendReward] = useState('7');
  const [referrerReward, setReferrerReward] = useState('7');
  const [gems, setGems] = useState('50');
  const [saved, setSaved] = useState(false);
  const top = [
    ['Mei Ling T.', 'MEILI-4QZ', 14, 9, 5],
    ['Hafiz R.', 'HAFIZ-K2P', 11, 7, 3],
    ['Jia Hui L.', 'JIAHU-81A', 8, 6, 3],
    ['Arjun S.', 'ARJUN-0XC', 6, 4, 1],
    ['Nurul A.', 'NURUL-7DM', 5, 3, 2],
  ];
  const funnel = [['Invites sent', 100], ['Link opened', 61], ['Signed up', 38], ['Subscribed', 14]];
  return (
    <div className="a-page">
      <h1>Referrals <small className="muted">Last 30 days · sample data</small></h1>
      <div className="kpis">
        <Kpi label="Invites sent" value="1,284" delta="+22%" />
        <Kpi label="Sign-ups from referrals" value="488" delta="38% of invites" />
        <Kpi label="Referral → paid" value="14.1%" delta="2.1× organic" />
        <Kpi label="Reward cost" value="RM 0" delta="Paid in Premium days" neutral />
      </div>
      <div className="a-grid">
        <div className="a-card">
          <h3>Top referrers</h3>
          <table className="a-table">
            <thead><tr><th>Learner</th><th>Code</th><th>Invited</th><th>Joined</th><th>Paid</th></tr></thead>
            <tbody>
              {top.map(([n, c, i, j, p]) => (
                <tr key={c}><td><b>{n}</b></td><td><code>{c}</code></td><td>{i}</td><td>{j}</td><td>{p}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="a-card">
          <h3>Referral funnel</h3>
          {funnel.map(([l, v]) => (
            <div key={l} className="fn"><span>{l}</span><div className="fbar"><i style={{ width: `${v}%` }} /></div><b>{v}%</b></div>
          ))}
          <h3 style={{ marginTop: 18 }}>Reward rules</h3>
          <div className="a-card form rules">
            <label>New friend gets (days of Premium)<input value={friendReward} onChange={(e) => setFriendReward(e.target.value)} /></label>
            <label>Referrer gets per paid friend (days)<input value={referrerReward} onChange={(e) => setReferrerReward(e.target.value)} /></label>
            <label>Gems per sign-up<input value={gems} onChange={(e) => setGems(e.target.value)} /></label>
            <button className="btn primary" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1800); }}>{saved ? 'Saved ✓' : 'Save rules'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
