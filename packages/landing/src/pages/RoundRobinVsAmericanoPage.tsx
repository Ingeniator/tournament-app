import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function RoundRobinVsAmericanoPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>Round Robin vs Americano — Which Padel Format Is Better?</h1>
        <p className={styles.lead}>
          Round robin and Americano are both popular tournament formats, but they solve different problems. Here's when to use each.
        </p>

        <h2>Quick Answer</h2>
        <p>
          <strong>Americano</strong> is better for social padel events. <strong>Round robin</strong> is better for competitive leagues where every team must play every other team.
        </p>

        <h2>What is Round Robin?</h2>
        <p>
          Every team plays every other team exactly once. It's the traditional bracket tournament format. Partners stay fixed throughout. Good for: established teams, league play.
        </p>

        <h2>What is Americano?</h2>
        <p>
          Partners rotate every round. Standings are individual. Matchups are random (or standings-based in <a href="/mexicano">Mexicano</a>). Good for: social events, mixed groups.
        </p>

        <h2>Side-by-Side Comparison</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th></th>
                <th>Round Robin</th>
                <th>Americano</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Partners</strong></td>
                <td>Fixed</td>
                <td>Rotate every round</td>
              </tr>
              <tr>
                <td><strong>Matchups</strong></td>
                <td>Every team vs every team</td>
                <td>Random or standings-based</td>
              </tr>
              <tr>
                <td><strong>Standings</strong></td>
                <td>Team-based</td>
                <td>Individual</td>
              </tr>
              <tr>
                <td><strong>Schedule length</strong></td>
                <td>Grows fast (n teams = n-1 rounds)</td>
                <td>Flexible (choose # of rounds)</td>
              </tr>
              <tr>
                <td><strong>Best for</strong></td>
                <td>Leagues, fixed teams</td>
                <td>Social events, mixed groups</td>
              </tr>
              <tr>
                <td><strong>Odd player count</strong></td>
                <td>Byes needed</td>
                <td>Works naturally</td>
              </tr>
              <tr>
                <td><strong>Organizer effort</strong></td>
                <td>Manual scheduling</td>
                <td>App handles everything</td>
              </tr>
              <tr>
                <td><strong>Social mixing</strong></td>
                <td>Low (same partner)</td>
                <td>High (different partner each round)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>The Scaling Problem with Round Robin</h2>
        <p>
          With 8 teams, round robin needs 7 rounds. With 16 teams, 15 rounds. The schedule grows linearly with the number of teams, making it impractical for larger groups. Americano lets you choose how many rounds to play — 5, 7, or 10 — regardless of player count.
        </p>

        <h2>Why Padel Clubs Prefer Americano</h2>
        <p>
          Partner rotation is the key — everyone plays with everyone, building community. Individual standings reward personal performance rather than relying on one strong partner. It's the reason Americano has become the default format for social padel worldwide.
        </p>

        <h2>When Round Robin Still Makes Sense</h2>
        <ul>
          <li><strong>Club leagues</strong> with fixed teams competing over a season</li>
          <li><strong>Inter-club competitions</strong> with established pairs</li>
          <li><strong>Competitive settings</strong> where every team-vs-team matchup matters for seeding or ranking</li>
        </ul>

        <h2>The Best of Both Worlds</h2>
        <p>
          Want fixed partners but with Americano's flexible scheduling? Use <a href="/team-americano">Team Americano</a> — fixed pairs with random opponents and flexible round counts. Or use <a href="/club">Club formats</a> for league-style cumulative standings across multiple events.
        </p>

        <div className={styles.cta}>
          <p>Try Americano — the modern alternative to round robin.</p>
          <a className={styles.ctaButton} href="/play">Start an Americano Tournament →</a>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
