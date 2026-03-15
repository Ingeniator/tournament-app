import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function Mexicano16PlayersPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>Mexicano Padel for 16 Players</h1>
        <p className={styles.lead}>
          16 players on 4 courts — the largest common Mexicano setup. More players means more rounds needed for fair standings, but the standings-based matching keeps every game competitive from round 2 onward.
        </p>

        <h2>The Setup</h2>
        <ul>
          <li><strong>Players:</strong> 16</li>
          <li><strong>Courts:</strong> 4 (all play simultaneously)</li>
          <li><strong>Round 1:</strong> Random pairings</li>
          <li><strong>Round 2+:</strong> Standings-based — top 4 on court 1, next 4 on court 2, and so on</li>
          <li><strong>Points per match:</strong> 24 recommended (shorter rounds = more rounds = fairer results)</li>
        </ul>

        <h2>Managing 16 Players</h2>
        <p>
          Communication is the biggest challenge with 16 players. After each round, 16 people need to know which court they are on and who they are playing with. Here is what works:
        </p>
        <ul>
          <li><strong>Use a big screen or TV.</strong> Cast the app to a monitor near the courts so everyone can see their assignment.</li>
          <li><strong>Have players check the app themselves.</strong> Share the tournament link so players can view standings and their next court on their own phones.</li>
          <li><strong>Announce court assignments loudly.</strong> After entering scores, call out "Court 1: Alex, Sam, Jordan, Taylor" and so on for each court.</li>
          <li><strong>Number your courts clearly.</strong> Use signs or tape to label courts 1-4 so there is no confusion about where to go.</li>
        </ul>

        <h2>How Many Courts?</h2>
        <p>
          4 courts means 4 matches per round, with all 16 players active simultaneously. This is the most efficient use of time — no one sits out. Ideally, all courts should finish around the same time. Using a fixed point total (like 24) helps with this, since matches end at roughly the same pace.
        </p>
        <p>
          If you only have 3 courts, 4 players will sit out each round. This still works but adds time and requires more rounds for fair standings. With 16 players, 4 courts is strongly recommended.
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
                <td>Brief all 16 players on the format and court numbering</td>
              </tr>
              <tr>
                <td>Rounds 1-3</td>
                <td>~54 min</td>
                <td>18 min each. Algorithm is sorting players across 4 courts.</td>
              </tr>
              <tr>
                <td>Rounds 4-7</td>
                <td>~72 min</td>
                <td>Standings stabilize. Four distinct skill tiers emerge.</td>
              </tr>
              <tr>
                <td>Rounds 8-9</td>
                <td>~36 min</td>
                <td>Tighter matchups. Close battles for final positions.</td>
              </tr>
              <tr>
                <td>Rounds 10-11 (optional)</td>
                <td>~36 min</td>
                <td>For the fairest final standings with 16 players.</td>
              </tr>
              <tr>
                <td>Awards ceremony</td>
                <td>15 min</td>
                <td>41 auto-generated awards. Great energy with a big group.</td>
              </tr>
              <tr>
                <td><strong>Total (9 rounds)</strong></td>
                <td><strong>~3.5 hours</strong></td>
                <td>Add ~35 min for 11 rounds (~4 hours total).</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>How Many Rounds?</h2>
        <p>
          With 16 players, you need more rounds than a smaller tournament. There are 15 possible partners for each player, and the standings need enough data points to be fair.
        </p>
        <p>
          <strong>9 rounds is the minimum</strong> for reliable standings. At 9 rounds, each player will have played with roughly 9 different partners — enough for the algorithm to place them accurately.
        </p>
        <p>
          <strong>11 rounds is ideal.</strong> The extra rounds reduce the impact of early-round randomness and give players in close positions a chance to settle their ranking through head-to-head play on the same court.
        </p>
        <p>
          Below 9 rounds with 16 players, the final standings will have significant noise. If you are short on time, consider dropping to 12 players on 3 courts for a more compact tournament.
        </p>

        <h2>Scoring Tips</h2>
        <p>
          Use <strong>24 points per match</strong> instead of 32. Here is why: at 32 points, each match takes about 22-25 minutes. At 24 points, matches finish in about 15-17 minutes. That difference adds up fast — over 9 rounds, you save 45-70 minutes. Those saved minutes let you fit 11 rounds into the same time slot that would only allow 8 rounds with 32-point matches.
        </p>
        <p>
          More rounds with shorter matches always produces fairer standings than fewer rounds with longer matches. Each round is a new data point for the algorithm, regardless of the point total.
        </p>

        <h2>What If People Arrive Late or Leave Early?</h2>
        <ul>
          <li><strong>Late arrivals:</strong> A player who arrives late can join from round 2 or 3. They will start with 0 points and work their way up from the bottom court. The algorithm handles this seamlessly.</li>
          <li><strong>Early departures:</strong> If one player leaves, you have 15 players — one person sits out each round on rotation. If two leave, you are at 14, and two sit out. Alternatively, drop to 3 courts with 12 active players.</li>
          <li><strong>Have 1-2 alternates.</strong> For a 16-player event, invite 17-18 people. If everyone shows up, rotate one person out each round. If someone cancels, you still have a full field.</li>
          <li><strong>Set a deadline.</strong> Tell players "round 1 starts at 10:00 sharp." Start on time even if someone is late — they can join the next round.</li>
        </ul>

        <h2>16 Players: Americano or Mexicano?</h2>
        <p>
          At 16 players, both formats work well — but they serve different purposes:
        </p>
        <ul>
          <li><strong>Americano</strong> is simpler to explain. Pairings are random, so there is no need to check standings between rounds. Better for casual groups or when players are unfamiliar with tournament formats.</li>
          <li><strong>Mexicano</strong> rewards better play. After a few rounds, top players compete against top players and developing players get matches at their level. Better for competitive groups or regular club events.</li>
        </ul>
        <p>
          For most groups of 16, we recommend Mexicano. The standings-based matchups create a better experience for everyone — strong players get challenged, and newer players are not overwhelmed. <a href="/americano-vs-mexicano">Read the full Americano vs Mexicano comparison</a>.
        </p>

        <div className={styles.cta}>
          <p>Start a 16-player Mexicano in seconds — no signup required.</p>
          <a className={styles.ctaButton} href="/play">Start a 16-Player Mexicano →</a>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
