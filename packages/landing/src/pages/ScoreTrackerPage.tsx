import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function ScoreTrackerPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>Free Padel Score Tracker</h1>
        <p className={styles.lead}>
          Track scores, standings, and awards in real time. Works on any phone, no download needed. Start scoring in seconds.
        </p>

        <h2>How It Works</h2>
        <ol>
          <li><strong>Open PadelDay on your phone.</strong> No app store, no download — just open the link.</li>
          <li><strong>Enter player names and pick a format.</strong> Choose from 15 tournament formats including Americano, Mexicano, and King of the Court.</li>
          <li><strong>Tap to enter scores after each match.</strong> Standings update instantly. Everyone sees the leaderboard in real time.</li>
        </ol>

        <h2>Live Standings</h2>
        <p>
          After every match, the leaderboard updates automatically. Every player can see where they stand. Points, wins, game differential — all calculated for you. No spreadsheets, no manual math, no mistakes.
        </p>

        <h2>Scoring Options</h2>
        <ul>
          <li><strong>Fixed point total</strong> — e.g., 32 points split between teams (16–16, 20–12, etc.)</li>
          <li><strong>Points per match</strong> — choose 16, 24, or 32 points per game</li>
          <li><strong>Time-based rounds</strong> — set a timer and enter scores manually when it ends</li>
          <li><strong>Score validation</strong> — the app checks your input so you can't make mistakes</li>
        </ul>

        <h2>Works Offline</h2>
        <p>
          PadelDay is a PWA (Progressive Web App) — it works without internet once loaded. Perfect for outdoor courts with no wifi. Scores save to your phone automatically. No data lost, ever.
        </p>

        <h2>No Account Needed</h2>
        <p>
          Open the link, start scoring. No signup, no download, no fees. Ever. Your tournament data stays on your device — private and instant.
        </p>

        <h2>More Than Just Scores</h2>
        <ul>
          <li><strong>Automatic fair pairings</strong> — the algorithm rotates partners so everyone plays with everyone. No spreadsheets needed.</li>
          <li><strong>41 awards</strong> computed at the end — Champion, Most Consistent, Comeback King, and more. <a href="/awards">See all awards</a></li>
          <li><strong>Curse cards</strong> for social events — add fun twists like "switch hands" or "no lobs." <a href="/maldiciones">Learn more</a></li>
          <li><strong>15 tournament formats</strong> — Americano, Mexicano, Mixicano, Team Americano, King of the Court, and more. <a href="/formats">Explore formats</a></li>
        </ul>

        <h2>Works for Any Racket Sport</h2>
        <p>
          Padel, tennis, pickleball, badminton — any sport with point-based scoring. The scoring logic is sport-agnostic. If you can count points, PadelDay tracks them.
        </p>

        <div className={styles.cta}>
          <p>Start scoring now — free, no signup required.</p>
          <a className={styles.ctaButton} href="/play">Start Scoring Now →</a>
          <p style={{ marginTop: '0.75rem', fontSize: '0.95rem' }}>
            <a href="/plan">Or plan a tournament first →</a>
          </p>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
