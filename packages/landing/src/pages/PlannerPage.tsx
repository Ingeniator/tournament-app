import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function PlannerPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>Padel Tournament Planner Online</h1>
        <p className={styles.lead}>
          Create a tournament, share the link, and let players register themselves. When everyone's in, launch the tournament with one tap. Free, no account needed.
        </p>

        <h2>How It Works</h2>
        <ol>
          <li><strong>Create.</strong> Open <a href="/plan">PadelDay Planner</a>, set the tournament name, date, format, and player limit.</li>
          <li><strong>Share.</strong> Get a short code and QR code. Share it in your WhatsApp or Telegram group. Players open the link and tap "Join".</li>
          <li><strong>Watch registrations.</strong> See who's signed up in real time. Close registration when you're ready.</li>
          <li><strong>Launch.</strong> One tap to start the live tournament. Pairings generate automatically. Players score on their phones.</li>
        </ol>

        <h2>Why Use the Planner</h2>
        <p>
          Instead of manually collecting names and answering "who's coming?" messages, let the planner handle it:
        </p>
        <ul>
          <li><strong>Players register themselves</strong> — no back-and-forth in the group chat</li>
          <li><strong>Shareable link and QR code</strong> — works in any chat group or social media</li>
          <li><strong>Real-time registration list</strong> — see who's in at a glance</li>
          <li><strong>No signup required</strong> — not for the organizer, not for the players</li>
          <li><strong>Works on any device</strong> — phone, tablet, laptop. No app download.</li>
        </ul>

        <h2>What You Can Configure</h2>
        <ul>
          <li><strong>Tournament name and date</strong></li>
          <li><strong>Format</strong> — <a href="/americano">Americano</a>, <a href="/mexicano">Mexicano</a>, <a href="/team-americano">Team Americano</a>, <a href="/king-of-the-court">King of the Court</a>, and more</li>
          <li><strong>Number of courts</strong></li>
          <li><strong>Points per match</strong></li>
          <li><strong>Player limit</strong></li>
          <li><strong>Registration open/close</strong></li>
        </ul>

        <h2>After Launch — Live Tournament</h2>
        <p>
          Once you launch, the planner becomes a live tournament. Everything runs automatically:
        </p>
        <ul>
          <li><strong>Automatic pairings</strong> every round — fair matchups, no spreadsheets</li>
          <li><strong>Players enter scores</strong> on their own phones</li>
          <li><strong>Live leaderboard</strong> visible to everyone in real time</li>
          <li><strong>41 awards</strong> computed at the end — <a href="/awards">see all awards</a></li>
          <li><strong>Works offline</strong> once loaded — perfect for courts with no wifi</li>
        </ul>

        <h2>Planner vs Running Directly</h2>
        <p>
          PadelDay offers two ways to start a tournament:
        </p>
        <ul>
          <li><strong>Planner (<a href="/plan">/plan</a>)</strong> — use when you're organizing in advance and want players to self-register. Create the tournament, share the link, wait for signups, then launch.</li>
          <li><strong>Runner (<a href="/play">/play</a>)</strong> — use when you're already at the courts and want to start immediately. Add player names yourself and go.</li>
        </ul>
        <p>
          Both are free. Both work the same way once the tournament is running. The only difference is how players get added.
        </p>

        <div className={styles.cta}>
          <p>Create your tournament and share the link — players register themselves.</p>
          <a className={styles.ctaButton} href="/plan">Create Your Tournament Now →</a>
          <p style={{ marginTop: '0.75rem' }}>
            Or <a href="/play">start a tournament instantly</a> if you're already at the courts.
          </p>
        </div>

        <p>
          Related: <a href="/organize">How to organize a padel tournament</a> · <a href="/features">All features</a> · <a href="/which-format">Which format should I choose?</a>
        </p>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
