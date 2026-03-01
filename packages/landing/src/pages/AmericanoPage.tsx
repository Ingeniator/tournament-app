import { useState, useEffect } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function AmericanoPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  useEffect(() => { document.title = 'Americano Padel — Rules, Format & How to Play | PadelDay'; }, []);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>Americano Padel — Rules, Format & How to Play</h1>
        <p className={styles.lead}>
          The Americano format is the most popular social padel tournament format worldwide. Players rotate partners every round, making it perfect for groups of all skill levels.
        </p>

        <h2>What is Americano?</h2>
        <p>
          In Americano, every player plays with a different partner each round. Partners and opponents are randomly assigned, so you'll play with (and against) as many people as possible. Standings are individual — each player accumulates their own points across all matches.
        </p>

        <h2>What You Need</h2>
        <ul>
          <li><strong>Players:</strong> 4 to 32 (must be even). 8–16 is ideal.</li>
          <li><strong>Courts:</strong> 1 court per 4 players. 8 players = 2 courts, 16 players = 4 courts.</li>
          <li><strong>Points per match:</strong> Typically 16, 24, or 32 points. Shorter games = more rotation.</li>
          <li><strong>Rounds:</strong> Usually 5–8 rounds. More rounds = fairer standings.</li>
        </ul>

        <h2>How to Play — Step by Step</h2>
        <ol>
          <li><strong>Set up the tournament.</strong> Enter player names, choose number of courts and points per match. The app handles everything else.</li>
          <li><strong>Round 1 begins.</strong> Players are randomly assigned to pairs and courts. Each court plays one match to the target point total.</li>
          <li><strong>Score the match.</strong> Both teams' scores are entered (e.g., 16–12). Both scores should add up to the point total, but you can also play to a fixed number per team.</li>
          <li><strong>Partners rotate.</strong> After every round, new random pairs are formed. No one plays with the same partner twice (when possible).</li>
          <li><strong>Individual standings update.</strong> Each player's points from every match accumulate. The leaderboard shows total points, wins, and game differential.</li>
          <li><strong>Final standings.</strong> After all rounds, the player with the most points wins. In case of a tie, win count is the tiebreaker.</li>
        </ol>

        <h2>Scoring</h2>
        <p>
          In each match, teams play to a set point total (e.g., 32 points total). When one team scores, the running total advances. Both teams' scores always add up to the point total (16–16, 20–12, etc.). Points scored count toward individual standings.
        </p>

        <h2>Tips for Organizers</h2>
        <ul>
          <li><strong>Use 5+ rounds</strong> for fair standings. Fewer rounds means more luck involved.</li>
          <li><strong>16 points per match</strong> is the sweet spot — games finish in about 15 minutes.</li>
          <li><strong>Let the app handle pairings.</strong> Manual pairings are error-prone. The algorithm ensures maximum partner variety.</li>
          <li><strong>End with the awards ceremony.</strong> 41 automatically computed awards make the ending memorable.</li>
        </ul>

        <h2>Americano vs Mexicano</h2>
        <p>
          The key difference is how opponents are chosen. In Americano, matchups are random. In <a href="/mexicano">Mexicano</a>, matchups are based on current standings — top players face top players. Americano is more social; Mexicano is more competitive.
        </p>

        <h2>Variations</h2>
        <ul>
          <li><strong>Mixed Americano:</strong> Partners are cross-group (e.g., one man + one woman per pair).</li>
          <li><strong>Team Americano:</strong> Partners are fixed throughout the tournament.</li>
        </ul>

        <div className={styles.cta}>
          <p>Run an Americano tournament in seconds — no signup required.</p>
          <a className={styles.ctaButton} href="/play">Run Americano Now →</a>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
