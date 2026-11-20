# ChangChang 唱唱 — Mandarin through songs (prototype)

Prototype built by **Mohamad Fahmi Irsyad** for Kunkwan Sdn Bhd's *Senior Full Stack Developer* role.
Learning journey: **Song → Pinyin → Speaking Practice**.

## Run
```bash
npm install
npm run dev        # app at /#/ , admin portal at /#/admin
# Android APK is built by GitHub Actions on every push (see Releases)
npm run build      # single-file build in dist/
```

## JD → what the prototype shows
| JD area | In the prototype |
|---|---|
| 1. App development | Mobile app UI, admin portal, data layer (`store.js`) shaped like the REST API |
| 2. Learning features | Karaoke lyrics with tone-coloured Pinyin, tap-to-hear tones + tone curves, listen-and-repeat with per-syllable scoring and AI coach tips (Web Speech API, demo scorer fallback) |
| 3. Daily engagement | Daily XP goal ring, streak, week tracker, achievements, rewards screen, daily reminder toggle |
| 4. Accounts & subscriptions | Sign up / log in, profile, free vs premium gating, paywall with monthly / yearly plans |
| 5. Content management | Admin song editor: lyrics → auto-generated Pinyin (pinyin-pro) + exercises; publish/draft; goes live without an app release |
| 6. Quality & maintenance | Scripted end-to-end walkthrough (Playwright) used to record the demo video |
| 7. Product collaboration | Dashboard: active learners, lesson funnel, free→paid conversion |
| 8. Technical ownership | AI + hosting cost per learner on the dashboard |
| Growth: referrals | Invite screen (personal code, share sheet / WhatsApp, reward ladder, invite status), code field at sign-up, admin referral analytics + editable reward rules |

## Design & media
- Duolingo-style UX patterns (learning path with unit nodes, one question per screen, check/feedback banner, hearts, streaks, chunky 3D buttons) with ChangChang's own identity.
- **Three.js** (all procedural, no external assets): Deng Deng the lantern mascot, spinning vinyl stage, voice-reactive orb, trophy with confetti.
- **Audio without paid services:** melody generated with Web Audio (each note follows its Mandarin tone); voice uses the device's zh-CN text-to-speech (Capacitor plugin on Android/iOS).

## Production plan
- **Mobile:** React Native (Expo) — one codebase for Android + iOS, offline audio cache, push reminders (FCM/APNs).
- **Backend:** Laravel 11 API + MySQL + Redis queues; Sanctum auth; admin portal in Inertia + React; audio on S3/CDN.
- **Speech & AI:** pronunciation assessment API (e.g. Azure Speech) scored per syllable; LLM for coaching text; usage metered per user to control cost.
- **Payments:** App Store / Google Play billing (RevenueCat for entitlements) + FPX/Stripe for web.
- **Ops:** CI/CD with EAS + GitHub Actions, Sentry monitoring, daily DB backups, PDPA-aligned data protection, everything under company-owned accounts.

### Milestones (proposal)
1. **Weeks 1–2:** audit the existing PoC, set up repos/accounts/CI, API + data model.
2. **Weeks 3–6:** Song → Pinyin → Speaking flow on Android + iOS, speech scoring.
3. **Weeks 7–8:** accounts, subscriptions, CMS for the education team.
4. **Weeks 9–10:** streaks/rewards/reminders, analytics, beta release, store submission.

> Note: lyrics in the prototype are original sample content. Dashboard numbers are sample data.
