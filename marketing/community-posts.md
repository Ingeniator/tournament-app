# Community Posts — Reddit, Facebook, Forums

Templates for posting in relevant communities. Adapt tone per community.

---

## Reddit

### r/padel — "I built a free tool for running Americano/Mexicano tournaments"

> Hey r/padel,
>
> I play weekly and got tired of spending 20 min with a whiteboard making tournament schedules. So I built a free web app: **Tournament Manager**
>
> What it does:
> - Supports Americano, Mexicano, Mixicano, Team Americano, Team Mexicano, and King of the Court
> - Generates fair schedules that balance partner variety, opponent matchups, rest, and court distribution
> - Live scoring and standings on your phone
> - Works fully offline at the court
> - Awards ceremony at the end (26+ auto-generated awards based on stats)
>
> No app install, no signup, no payment. Just open the link in your browser:
> tm.padel.wiki/play
>
> It's open source if anyone's curious about the code.
>
> Would love feedback — especially on which formats you use most and whether the fairness metrics make sense for your group size.

### r/Pickleball — "Free tournament organizer that works offline"

> Been using this for padel but it works perfectly for pickleball too.
>
> **Tournament Manager** — free web app, no install needed. Open the link, add players, pick a format, and it generates a fair schedule automatically.
>
> Supports round-robin style formats (Americano, Mexicano, King of the Court, etc.) where everyone plays and individual points accumulate.
>
> Standout features:
> - Offline mode (important for outdoor courts)
> - Algorithm balances partners, opponents, rest, and courts
> - Auto-generated awards at the end (adds a fun competitive element)
>
> Free, open source: tm.padel.wiki/play
>
> Curious if anyone here runs tournaments like this for pickleball?

### r/SideProject or r/webdev — "Show HN style"

> Built a PWA for running sports tournaments — here's what I learned about combinatorial scheduling.
>
> **Tournament Manager** generates fair round-robin schedules for padel/pickleball tournaments. The interesting part: the scheduling algorithm has to simultaneously optimize 5 competing criteria (partner variety, opponent balance, rest fairness, court distribution, and never-shared-court pairs).
>
> The approach: generate candidate schedules, score each against all 5 criteria, and iterate. For larger tournaments (16+ players), it runs a multi-pass optimization that reshuffles unscored rounds while preserving completed matches.
>
> Stack: React 19, TypeScript, Vite, Cloudflare Pages. The scoring app is a PWA that works fully offline (localStorage + service worker). Pre-tournament planner uses Firebase Realtime DB with anonymous auth and shareable short codes.
>
> Open source, free: tm.padel.wiki/play
>
> Happy to discuss the scheduling algorithm, PWA architecture, or anything else.

---

## Facebook Group Posts

### Padel Community Groups

> Hi everyone! Sharing a free tool I've been using to organize our weekly Americano tournaments.
>
> It's called Tournament Manager — you open a link on your phone, add player names, and it generates a fair schedule automatically. No app to download.
>
> What I like:
> - Actually fair matchups (not the same partners every time)
> - Works without WiFi at the court
> - Standings update in real time
> - Fun awards at the end!
>
> Supports Americano, Mexicano, Mixicano, Team formats, and King of the Court.
>
> Link: tm.padel.wiki/play
>
> Try it at your next session and let me know what you think!

### General Sports / Social Groups

> If anyone here organizes casual sports tournaments (padel, pickleball, etc.), this free tool is a game-changer:
>
> tm.padel.wiki/play
>
> No signup, no payment, works offline. Just add player names and it creates a fair schedule. We've been using it for months and it saves so much time.
