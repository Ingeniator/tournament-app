import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function BeginnersPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>Best Padel Tournament Format for Beginners</h1>
        <p className={styles.lead}>
          Never organized a padel tournament before? You don't need experience. Pick the right format, and the app does the rest.
        </p>

        <h2>What is a Padel Tournament?</h2>
        <p>
          A padel tournament isn't a single match — it's a series of matches where players accumulate points over several rounds. At the end, someone wins. But the real point is that everyone plays, everyone has fun, and you walk away having played with a bunch of different people.
        </p>

        <h2>The 3 Beginner-Friendly Formats</h2>

        <div className={styles.card}>
          <h3>Americano — Recommended for First-Timers</h3>
          <p>
            Partners rotate every round. Everyone plays with everyone. Standings are individual — each player tracks their own points across all matches.
          </p>
          <p>
            Why it's great for beginners: no one is stuck with a "bad" partner, everyone gets variety, and the randomness keeps things social and relaxed. It's the most popular format for a reason.
          </p>
          <p><a href="/americano">Learn more about Americano →</a></p>
        </div>

        <div className={styles.card}>
          <h3>King of the Court — Fastest to Explain</h3>
          <p>
            Winners stay on court, losers rotate off. No scheduling needed — just show up and play. It's great for casual groups, odd player counts, or when you have limited time.
          </p>
          <p><a href="/king-of-the-court">Learn more about King of the Court →</a></p>
        </div>

        <div className={styles.card}>
          <h3>Team Americano — For Couples & Friends</h3>
          <p>
            Partners stay together throughout the tournament, but opponents rotate. Good when people want to play with their friend, partner, or spouse. Same easy scoring as Americano.
          </p>
          <p><a href="/team-americano">Learn more about Team Americano →</a></p>
        </div>

        <h2>How Scoring Works</h2>
        <p>It's simpler than you think:</p>
        <ul>
          <li>Teams play to a set number of total points (e.g., 32)</li>
          <li>If you win 20–12, you get 20 points and they get 12</li>
          <li>Your points add up across all matches</li>
          <li>The player with the most points at the end wins</li>
        </ul>
        <p>
          That's it. No sets, no games, no deuces. Just rally, score, repeat. Both teams always earn points, so even if you lose a match, you still add to your total.
        </p>

        <h2>Your First Tournament — Step by Step</h2>
        <ol>
          <li><strong>Get 8 friends.</strong> That's the sweet spot for beginners — enough variety, not too chaotic.</li>
          <li><strong>Book 2 padel courts for 2 hours.</strong> One court per 4 players.</li>
          <li><strong>Open PadelDay, add names, pick Americano.</strong> Setup takes about 30 seconds.</li>
          <li><strong>Play 5–7 rounds.</strong> The app tells you who plays with whom and on which court.</li>
          <li><strong>Enter scores after each match.</strong> Tap the score in, and the app updates standings instantly.</li>
          <li><strong>Enjoy the awards ceremony at the end.</strong> The app automatically computes fun awards — not just "first place" but things like best comeback, most consistent, and more.</li>
        </ol>

        <h2>Common Beginner Questions</h2>

        <h3>What if skill levels are very different?</h3>
        <p>
          That's totally fine. Americano rotates partners, so strong players naturally lift weaker ones. Over many rounds, the best players still rise to the top. If you want even more balanced matchups, try <a href="/mexicano">Mexicano</a> — it pairs players based on current standings. Read more about <a href="/balanced-matches">keeping matches balanced</a>.
        </p>

        <h3>What if we have an odd number of players?</h3>
        <p>
          Use King of the Court, where odd numbers work naturally. Or in Americano, one person sits out each round — the app handles this automatically so everyone sits out equally.
        </p>

        <h3>How long will it take?</h3>
        <p>
          With 8 players on 2 courts playing 5 rounds, expect about 2 hours. Each round takes roughly 15–20 minutes including changeovers. <a href="/how-long-padel-tournament">See detailed time estimates</a>.
        </p>

        <h3>Do we need a referee?</h3>
        <p>
          No. Players enter their own scores on the app after each match. It's self-serve — no referee, no pen and paper, no spreadsheet needed.
        </p>

        <h2>What You Don't Need to Worry About</h2>
        <p>You don't need:</p>
        <ul>
          <li>Experience organizing tournaments</li>
          <li>A specific number of players</li>
          <li>Internet on the court (the app works offline)</li>
          <li>Paid software</li>
          <li>Complex rules or manual scheduling</li>
        </ul>
        <p>
          The app handles pairings, scoring, standings, and awards. You just play.
        </p>

        <div className={styles.cta}>
          <p>Run your first tournament — it's free and takes 30 seconds to set up.</p>
          <a className={styles.ctaButton} href="/play">Start Your First Tournament →</a>
        </div>

        <h2>Further Reading</h2>
        <ul>
          <li><a href="/organize">Full organizer guide</a> — everything you need to know about running tournaments</li>
          <li><a href="/which-format">Which format should I pick?</a> — interactive format picker</li>
          <li><a href="/formats">All tournament formats</a> — detailed breakdown of every format</li>
        </ul>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
