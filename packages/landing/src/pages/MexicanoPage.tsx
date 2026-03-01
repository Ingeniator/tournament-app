import { useState, useEffect } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function MexicanoPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  useEffect(() => { document.title = 'Mexicano Padel — Rules, Format & How to Play | PadelDay'; }, []);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>Mexicano Padel — Rules, Format & How to Play</h1>
        <p className={styles.lead}>
          Mexicano is the most popular competitive padel tournament format. Unlike Americano, matchups are based on current standings, keeping every round tight and exciting.
        </p>

        <h2>What is Mexicano?</h2>
        <p>
          Mexicano (sometimes called "Mexicano Padel" or "Padel Mexicano") is a rotating-partner format where opponents are assigned based on the current leaderboard. After round 1, the top-ranked player is paired with the bottom-ranked player, and they face the 2nd and 3rd ranked pair. This creates balanced matches where no team is overwhelmingly stronger.
        </p>

        <h2>How Dynamic Matchups Work</h2>
        <p>
          The algorithm groups players by current standings. Within each group of 4, the #1 and #4 ranked players form one team, and #2 and #3 form the other. This means:
        </p>
        <ul>
          <li>Strong players carry weaker partners — evening out the teams.</li>
          <li>Top players always face top competition, but with different partners.</li>
          <li>Bottom players get the benefit of playing with stronger partners.</li>
          <li>Every match stays close and competitive.</li>
        </ul>

        <h2>Step by Step</h2>
        <ol>
          <li><strong>Round 1:</strong> Random pairings, just like Americano. This seeds the initial standings.</li>
          <li><strong>Round 2+:</strong> Players are ranked by total points. The pairing algorithm creates balanced teams based on current standings.</li>
          <li><strong>Score each match.</strong> Both teams' points are recorded and added to individual totals.</li>
          <li><strong>Repeat.</strong> Each round re-evaluates standings and creates new balanced pairings.</li>
          <li><strong>Final standings:</strong> Total individual points determine the winner.</li>
        </ol>

        <h2>Americano vs Mexicano</h2>
        <p>The two formats share the same structure but differ in one key way:</p>
        <ul>
          <li><strong>Americano:</strong> Random opponents → more social, less predictable</li>
          <li><strong>Mexicano:</strong> Standings-based opponents → more competitive, tighter matches</li>
        </ul>
        <p>
          Choose Americano for casual events where mixing is the priority. Choose Mexicano when everyone wants competitive, fair matches.
        </p>

        <h2>When to Use Mexicano</h2>
        <ul>
          <li>Mixed skill levels — the algorithm balances teams automatically.</li>
          <li>Competitive groups who want every match to matter.</li>
          <li>Regular club events where rankings should reflect true skill.</li>
          <li>When you want the standings to be meaningful, not luck-driven.</li>
        </ul>

        <h2>Variations</h2>
        <ul>
          <li><strong>Mixicano:</strong> Mexicano with cross-group pairing (e.g., one man + one woman per pair). Standings-based opponents with group constraints.</li>
          <li><strong>Team Mexicano:</strong> Fixed pairs (no rotation), but opponents are assigned by standings.</li>
          <li><strong>Club Mexicano:</strong> Inter-club competition with standings-based matchups.</li>
        </ul>

        <h2>Tips</h2>
        <ul>
          <li><strong>6+ rounds recommended</strong> for the algorithm to create truly balanced matches.</li>
          <li><strong>Works best with 8+ players</strong> — more players = better matchmaking.</li>
          <li><strong>The first round is random</strong> — standings become meaningful from round 2.</li>
        </ul>

        <div className={styles.cta}>
          <p>Try Mexicano — balanced matches, zero hassle.</p>
          <a className={styles.ctaButton} href="/play">Try Mexicano Free →</a>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
