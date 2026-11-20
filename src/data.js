// Seed content. In production this comes from the Laravel API (GET /api/songs),
// managed by the education team in the admin portal — no app release needed.
// All lyrics below are original, written for this prototype.
export const SEED_SONGS = [
  {
    id: 'hello-friend',
    title: '你好朋友',
    titleEn: 'Hello, Friend',
    level: 'Beginner',
    premium: false,
    color: '#E8453C',
    emoji: '👋',
    published: true,
    lines: [
      { zh: '你好你好我的朋友', en: 'Hello, hello, my friend' },
      { zh: '早上太阳笑一笑', en: 'The morning sun gives a smile' },
      { zh: '我们一起学中文', en: 'Together we learn Chinese' },
      { zh: '天天开心唱首歌', en: "Happy every day, let's sing a song" },
    ],
  },
  {
    id: 'count',
    title: '数一数',
    titleEn: "Let's Count",
    level: 'Beginner',
    premium: false,
    color: '#F5A623',
    emoji: '🔢',
    published: true,
    lines: [
      { zh: '一二三四五', en: 'One, two, three, four, five' },
      { zh: '六七八九十', en: 'Six, seven, eight, nine, ten' },
      { zh: '小手拍一拍', en: 'Little hands, clap clap' },
      { zh: '我们数到十', en: 'We count up to ten' },
    ],
  },
  {
    id: 'rainbow',
    title: '彩虹',
    titleEn: 'Rainbow',
    level: 'Beginner',
    premium: true,
    color: '#7B61FF',
    emoji: '🌈',
    published: true,
    lines: [
      { zh: '红色黄色绿色', en: 'Red, yellow, green' },
      { zh: '天上有彩虹', en: 'There is a rainbow in the sky' },
      { zh: '蓝色紫色白色', en: 'Blue, purple, white' },
      { zh: '真的好漂亮', en: 'It is really beautiful' },
    ],
  },
  {
    id: 'family',
    title: '我的家',
    titleEn: 'My Family',
    level: 'Elementary',
    premium: true,
    color: '#1FA971',
    emoji: '🏠',
    published: true,
    lines: [
      { zh: '爸爸妈妈爱我', en: 'Dad and Mum love me' },
      { zh: '哥哥姐姐陪我', en: 'Big brother and sister stay with me' },
      { zh: '一家人在一起', en: 'The whole family together' },
      { zh: '每天都很快乐', en: 'Every day is very happy' },
    ],
  },
];

export const ACHIEVEMENTS = [
  { id: 'first-song', icon: '🎵', name: 'First Song', desc: 'Finish your first song' },
  { id: 'streak-3', icon: '🔥', name: 'On Fire', desc: '3-day streak' },
  { id: 'perfect', icon: '🎯', name: 'Perfect Tones', desc: 'Score 100% on a line' },
  { id: 'xp-100', icon: '⭐', name: 'Rising Star', desc: 'Earn 100 XP' },
  { id: 'streak-7', icon: '🏆', name: 'Week Warrior', desc: '7-day streak' },
  { id: 'all-songs', icon: '👑', name: 'Song Master', desc: 'Finish every song' },
];

export const TONE_INFO = {
  1: { name: '1st tone', mark: 'ˉ', desc: 'High and flat', color: 'var(--t1)' },
  2: { name: '2nd tone', mark: 'ˊ', desc: 'Rising, like asking “huh?”', color: 'var(--t2)' },
  3: { name: '3rd tone', mark: 'ˇ', desc: 'Dips down then up', color: 'var(--t3)' },
  4: { name: '4th tone', mark: 'ˋ', desc: 'Sharp falling, like “No!”', color: 'var(--t4)' },
  0: { name: 'Neutral', mark: '·', desc: 'Light and short', color: 'var(--t0)' },
};
