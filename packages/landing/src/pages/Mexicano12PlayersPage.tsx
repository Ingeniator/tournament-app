import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function Mexicano12PlayersPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>Mexicano Padel for 12 Players — The Ideal Setup</h1>
        <p className={styles.lead}>
          12 players on 3 courts is where Mexicano truly shines. Enough players for meaningful standings-based matchups, enough courts for everyone to play every round, and enough rounds to separate skill levels fairly.
        </p>

        <h2>Why 12 Players is Perfect for Mexicano</h2>
        <p>
          With 12 players, the algorithm has enough data after just 2-3 rounds to create genuinely balanced matches. The top court becomes a competitive battle between the best players. The middle court stays challenging but accessible. And the bottom court keeps things fun for players who are still developing their game.
        </p>
        <p>
          Compare that to 8 players, where the algorithm has fewer players to work with and less room to create meaningful skill tiers. At 12, you get three distinct courts of play — and that separation is what makes Mexicano feel fair and exciting for everyone.
        </p>

        <h2>The Setup</h2>
        <ul>
          <li><strong>Players:</strong> 12</li>
          <li><strong>Courts:</strong> 3 (all play simultaneously)</li>
          <li><strong>Round 1:</strong> Random pairings (no standings data yet)</li>
          <li><strong>Round 2+:</strong> Standings-based matchups — top players on court 1, middle on court 2, bottom on court 3</li>
          <li><strong>Points per match:</strong> 24 recommended (keeps rounds short, fits more rounds)</li>
        </ul>

        <h2>How the Algorithm Works with 12 Players</h2>
        <p>
          After round 1, all 12 players are ranked by their total points. The app then assigns players to courts based on their position in the standings:
        </p>
        <ul>
          <li><strong>Court 1 (top table):</strong> Players ranked 1st through 4th</li>
          <li><strong>Court 2 (middle table):</strong> Players ranked 5th through 8th</li>
          <li><strong>Court 3 (bottom table):</strong> Players ranked 9th through 12th</li>
        </ul>
        <p>
          Within each court, the algorithm creates balanced teams. For example, on court 1 it might pair the 1st-ranked player with the 4th-ranked, against the 2nd and 3rd. This keeps individual matches close while the overall structure ensures you play against people near your level.
        </p>
        <p>
          As more rounds are played, the standings become more accurate and the matchups get tighter. By round 5, the courts are well-separated by skill level.
        </p>

        <h2>Sample Timeline</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Phase</th>
                <th>Duration</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Arrival & warm-up</td>
                <td>15 min</td>
                <td>Brief players on the format, stretch, hit a few balls</td>
              </tr>
              <tr>
                <td>Rounds 1-3</td>
                <td>~54 min</td>
                <td>18 min each (15 min play + 3 min changeover). Algorithm is still sorting players.</td>
              </tr>
              <tr>
                <td>Rounds 4-7</td>
                <td>~72 min</td>
                <td>Courts are now well-separated by skill. Matches get competitive.</td>
              </tr>
              <tr>
                <td>Rounds 8-9 (optional)</td>
                <td>~36 min</td>
                <td>Extra rounds for the fairest possible final standings.</td>
              </tr>
              <tr>
                <td>Awards ceremony</td>
                <td>15 min</td>
                <td>41 auto-generated awards. Tap-to-reveal format.</td>
              </tr>
              <tr>
                <td><strong>Total</strong></td>
                <td><strong>~3 hours</strong></td>
                <td>With 7 rounds. Add ~35 min for 9 rounds.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>How Many Rounds?</h2>
        <p>
          7 rounds is the minimum for a meaningful 12-player Mexicano. At 7 rounds, most players will have played with 6-7 different partners and against a wide range of opponents. The standings will be reasonably fair.
        </p>
        <p>
          9 rounds is the ideal target. With 9 rounds, the final standings are much more reliable — there is less luck involved and more skill differentiation. If you have the time and court availability, always aim for 9.
        </p>
        <p>
          Below 7 rounds, the standings have too much randomness from the early rounds. Above 9 rounds, you get diminishing returns and players may start to fatigue.
        </p>

        <h2>Tips for 12-Player Mexicano</h2>
        <ul>
          <li><strong>Use 24 points per match</strong> instead of 32. Shorter matches mean you can fit 9 rounds into 3 hours instead of 7 rounds with longer games. More rounds = fairer standings.</li>
          <li><strong>Let the app calculate everything.</strong> Manual standings-based pairings for 12 players are nearly impossible to do correctly and fairly. The algorithm handles tiebreakers, partner variety, and court assignments instantly.</li>
          <li><strong>Designate one person as the scorer.</strong> After each round, collect scores from all 3 courts and enter them in the app. This prevents delays between rounds.</li>
          <li><strong>Keep changeover time under 3 minutes.</strong> Announce the next round's court assignments as soon as scores are entered. Players should move immediately — no extended breaks between rounds.</li>
          <li><strong>Have water available at each court.</strong> With 12 players rotating across 3 courts, there is no sitting-out time. Players need to hydrate during changeovers.</li>
        </ul>

        <h2>Mexicano vs Americano for 12 Players</h2>
        <p>
          At 12 players, Mexicano is clearly the better choice. In Americano, matchups are random — so a beginner might face the best player in round 7, which is not fun for either of them. In Mexicano, by round 3-4, skill levels are separated across courts. Everyone plays competitive, close games.
        </p>
        <p>
          The one exception: if your group is very similar in skill level, Americano works fine because there is no meaningful skill gap to separate. But for most mixed-level groups of 12, <a href="/americano-vs-mexicano">Mexicano is the better format</a>.
        </p>

        <div className={styles.cta}>
          <p>Start a 12-player Mexicano in seconds — no signup required.</p>
          <a className={styles.ctaButton} href="/play">Start a 12-Player Mexicano →</a>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
