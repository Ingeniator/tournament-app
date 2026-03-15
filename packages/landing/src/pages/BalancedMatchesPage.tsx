import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function BalancedMatchesPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>How to Create Balanced Padel Matches</h1>
        <p className={styles.lead}>
          The biggest challenge in organizing padel? Making sure every match is competitive and fun — regardless of skill level. Here's how.
        </p>

        <h2>The Problem</h2>
        <p>
          Random pairings often create lopsided matches. The best player paired with the worst crushes everyone. Beginners feel lost. Advanced players get bored. The result: half the group has a bad time.
        </p>

        <h2>Solution 1: Mexicano (Standings-Based Matchups)</h2>
        <p>
          After round 1, matchups are based on current standings. Top players face top players. Bottom players face bottom players. Every match gets progressively more balanced. This is the simplest and most effective approach. <a href="/mexicano">Learn more about Mexicano</a>.
        </p>

        <h2>Solution 2: Americano with Enough Rounds</h2>
        <p>
          With random pairings, variance averages out over many rounds. 7+ rounds with 8 players gives fair final standings. The randomness IS the feature — surprises keep it fun. <a href="/americano">Learn more about Americano</a>.
        </p>

        <h2>Solution 3: Mixed Formats (Mixicano)</h2>
        <p>
          Cross-group pairing ensures every team has one stronger and one developing player. Perfect for mixed-gender or mixed-level events. Each team on court has exactly one player from each group, creating natural balance.
        </p>

        <h2>How PadelDay's Algorithm Works</h2>
        <p>
          Behind the scenes, the app does more than just match players by standings. Here's what happens every round:
        </p>
        <ul>
          <li><strong>Quality gates</strong> that check pairing fairness before confirming matchups</li>
          <li><strong>Partner variety maximization</strong> — no repeat partners whenever possible</li>
          <li><strong>Opponent balance</strong> — avoid facing the same people twice</li>
          <li><strong>Statistics tracking</strong> to verify fairness across the entire tournament</li>
        </ul>

        <h2>Practical Tips for Organizers</h2>
        <ul>
          <li><strong>Use Mexicano</strong> for the most balanced matches from round 2 onwards</li>
          <li><strong>Use more rounds (7+)</strong> for fairer final standings</li>
          <li><strong>Use 16–24 points per match</strong> — shorter games reduce the impact of any single lopsided match</li>
          <li><strong>Don't manually seed or rig pairings</strong> — the algorithm does it better</li>
          <li><strong>Enable curse cards (Maldiciones)</strong> to add a natural handicap element for social events</li>
        </ul>

        <h2>The Numbers</h2>
        <p>
          In a typical 8-player Mexicano tournament, by round 3, the point differential between opponents drops by ~40% compared to random matchups. By round 5, nearly every match is decided by 4 points or fewer. The algorithm gets smarter as the tournament progresses.
        </p>

        <h2>Related Formats</h2>
        <ul>
          <li><a href="/mexicano">Mexicano</a> — standings-based matchups for maximum balance</li>
          <li><a href="/americano-vs-mexicano">Americano vs Mexicano</a> — detailed comparison of both approaches</li>
          <li><a href="/which-format">Which format should I use?</a> — format selection guide</li>
        </ul>

        <div className={styles.cta}>
          <p>Run balanced matches automatically — no manual scheduling required.</p>
          <a className={styles.ctaButton} href="/play">Run Balanced Matches →</a>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
