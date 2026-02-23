# Product Hunt Launch Brief

---

## Tagline (60 chars max)
Run padel & pickleball tournaments from your phone — free

## Description

Tournament Manager is a free, open-source web app for running Americano, Mexicano, and other tournament formats for padel, pickleball, and racket sports.

**The problem:** Organizing a fair tournament with rotating partners and balanced matchups is a surprisingly complex scheduling problem. Most organizers use spreadsheets, whiteboards, or expensive apps with subscriptions.

**The solution:** Open a link, add player names, pick a format, and get a mathematically fair schedule in seconds. Score matches on your phone, see live standings, and finish with an auto-generated awards ceremony.

**Key features:**
- 6 tournament formats (Americano, Mexicano, Mixicano, Team Americano, Team Mexicano, King of the Court)
- Fair schedule algorithm optimizing partner variety, opponent balance, rest distribution, and court allocation
- Works completely offline — no WiFi needed at the courts
- 26+ auto-generated awards (Giant Slayer, Clutch Player, Iron Wall, etc.)
- Share results as images or text to WhatsApp, Instagram, etc.
- 8 languages: EN, ES, FR, IT, PT, SR, SV
- PWA — no app install required, works on any phone
- Pre-tournament planner with shareable join codes
- Free, no ads, no signup, open source

**Built with:** React 19, TypeScript, Vite, Cloudflare Pages

## Topics
- Productivity
- Sports
- Open Source
- Web App

## Maker Comment

> I built this because my padel group was spending 20 minutes every week with a whiteboard trying to make fair tournament schedules. Turns out, balancing partner rotation, opponent variety, rest fairness, and court distribution across 12+ players is a real combinatorial optimization problem.
>
> The schedule generator runs thousands of permutations and scores them against 5 fairness criteria. The result: a schedule that's provably fairer than anything you'd make by hand.
>
> The awards system is my favorite part — it analyzes match statistics and generates awards like "Giant Slayer" (lowest-ranked player who beat #1), "Comeback King" (win rate improved >30% from first to second half), and 24 others. Every tournament tells a different story.
>
> It's a PWA that works entirely offline — important because many courts have terrible WiFi. All data stays in your browser's localStorage.
>
> Open source, free forever, no signup. Feedback welcome!

## First Comment (engage voters)

> Happy to answer any questions about the scheduling algorithm, tournament formats, or the tech behind it. And if you play padel — would love to know which format is most popular in your area!
