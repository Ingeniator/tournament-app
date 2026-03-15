import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function AmericanoVsMexicanoPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>Americano vs Mexicano — Which Padel Format Is Right for You?</h1>
        <p className={styles.lead}>
          Americano and Mexicano are the two most popular social padel tournament formats. Both use rotating partners and individual scoring — but they create very different experiences on court. Here's how they differ and when to use each.
        </p>

        <h2>Quick Answer</h2>
        <p>
          <strong>Americano</strong> is fully random — great for social events and mixed skill levels. <strong>Mexicano</strong> matches opponents by standings, so games get tighter and more competitive each round. If your group just wants to have fun, go Americano. If they want to compete, go Mexicano.
        </p>

        <h2>How Americano Works</h2>
        <p>
          In Americano, partners and opponents are randomly assigned every round. You play with a different partner each match, and everyone faces as many different opponents as possible. Individual points accumulate across all rounds. The randomness keeps things social and ensures everyone mingles. <a href="/americano">Full Americano guide →</a>
        </p>

        <h2>How Mexicano Works</h2>
        <p>
          Mexicano starts the same way — random pairings in round one. But from round two onward, opponents are matched based on the current standings. The top-ranked players face each other, and lower-ranked players play against each other. This creates progressively balanced and competitive games. <a href="/mexicano">Full Mexicano guide →</a>
        </p>

        <h2>Side-by-Side Comparison</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Americano</th>
                <th>Mexicano</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Partner assignment</strong></td>
                <td>Random each round</td>
                <td>Random each round</td>
              </tr>
              <tr>
                <td><strong>Opponent assignment</strong></td>
                <td>Random</td>
                <td>Based on standings</td>
              </tr>
              <tr>
                <td><strong>Standings type</strong></td>
                <td>Individual</td>
                <td>Individual</td>
              </tr>
              <tr>
                <td><strong>Competitiveness</strong></td>
                <td>Social / casual</td>
                <td>Progressively competitive</td>
              </tr>
              <tr>
                <td><strong>Best for</strong></td>
                <td>Mixed levels, first events</td>
                <td>Competitive groups, repeat events</td>
              </tr>
              <tr>
                <td><strong>Match balance</strong></td>
                <td>Random, varies</td>
                <td>Improves each round</td>
              </tr>
              <tr>
                <td><strong>Organizer effort</strong></td>
                <td>Minimal</td>
                <td>Minimal — app handles matchups</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>When to Choose Americano</h2>
        <ul>
          <li><strong>Mixed skill levels.</strong> When your group ranges from beginners to advanced players, random matchups keep things fair and fun for everyone.</li>
          <li><strong>First-time events.</strong> People don't know each other yet? Americano forces maximum social mixing — everyone plays with everyone.</li>
          <li><strong>Short on time.</strong> With random pairings, there's zero wait between rounds. No standings calculations needed to determine matchups.</li>
          <li><strong>Large casual groups.</strong> Company events, club socials, birthday padel — Americano is the default for a reason.</li>
          <li><strong>Kids or beginners.</strong> Nobody gets stuck playing against the strongest pair every round. The randomness is forgiving.</li>
        </ul>

        <h2>When to Choose Mexicano</h2>
        <ul>
          <li><strong>Competitive groups.</strong> When everyone wants to be challenged, standings-based matchups deliver tighter games from round two onward.</li>
          <li><strong>Regular playing groups.</strong> If your group plays weekly, Mexicano adds a competitive edge that keeps things interesting.</li>
          <li><strong>Similar skill levels.</strong> When the group is already roughly matched, Mexicano fine-tunes the balance each round.</li>
          <li><strong>Playoff-style finish.</strong> The final round of Mexicano naturally pits the leaders against each other — it feels like a final without needing a separate bracket.</li>
          <li><strong>Players who want to prove themselves.</strong> In Mexicano, you earn your ranking by beating the players closest to you. No lucky draws.</li>
        </ul>

        <h2>Can You Mix Both?</h2>
        <p>
          Some organizers run Americano for the first round to seed initial standings, then switch to Mexicano for the remaining rounds. This gives you the social mixing of Americano early on, with the competitive tightening of Mexicano as the tournament progresses. The PadelDay app supports both formats, so you can experiment and see what your group prefers.
        </p>

        <h2>What About Mixed & Team Variants?</h2>
        <p>
          Both Americano and Mexicano have popular variations:
        </p>
        <ul>
          <li><strong><a href="/mexicano">Mixicano</a></strong> — like Mexicano, but partners are always cross-group (e.g., one man + one woman). Standings-based opponents with enforced mixed teams.</li>
          <li><strong>Team Americano</strong> — fixed partner pairs throughout the tournament with random opponents. Great when people want to play as a duo.</li>
          <li><strong>Team Mexicano</strong> — fixed pairs with standings-based opponents. The most competitive team format.</li>
        </ul>
        <p>
          All five formats are available in the PadelDay app with automatic pairings and scoring.
        </p>

        <div className={styles.cta}>
          <p>Try both formats — no signup required.</p>
          <a className={styles.ctaButton} href="/play">Run a Tournament Now →</a>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
