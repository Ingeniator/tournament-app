import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function Mexicano8PlayersPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>Mexicano Padel for 8 Players</h1>
        <p className={styles.lead}>
          8 players, 2 courts, standings-based matchups. Mexicano automatically balances games so competitive players face each other and everyone has fun.
        </p>

        <h2>The Setup</h2>
        <p>
          You need 8 players and 2 padel courts — the same setup as <a href="/americano-8-players">8-player Americano</a>. The difference is how matchups are decided. In Americano, pairings are random. In Mexicano, pairings are based on the current standings after round 1.
        </p>
        <p>
          Round 1 is always random since there are no standings yet. From round 2 onwards, the app uses the leaderboard to create balanced matchups.
        </p>

        <h2>How Matchups Work</h2>
        <p>
          After each round, the app ranks all 8 players by total points. Then it splits them into two groups:
        </p>
        <ul>
          <li><strong>Top court:</strong> Players ranked 1st through 4th play on Court 1.</li>
          <li><strong>Bottom court:</strong> Players ranked 5th through 8th play on Court 2.</li>
        </ul>
        <p>
          Within each court, the app pairs players as partners while avoiding repeat pairings. For example, on the top court: 1st pairs with 4th against 2nd + 3rd — so the strongest player carries the weakest in the group, creating a balanced match.
        </p>
        <p>
          The result: every round, games are closer. Strong players are challenged by strong opponents. Players who have scored fewer points get more evenly matched games instead of being outclassed.
        </p>

        <h2>Sample Tournament Flow</h2>
        <p>
          Unlike Americano, you cannot pre-print a Mexicano schedule because matchups depend on results. Here is what a typical 8-player Mexicano looks like round by round:
        </p>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Round</th>
                <th>What happens</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>Random pairs. Scores vary widely — some teams win 18-6, others 13-11.</td>
              </tr>
              <tr>
                <td>2</td>
                <td>First standings-based matchup. Top scorers face each other. Scores start tightening.</td>
              </tr>
              <tr>
                <td>3</td>
                <td>Clear leaders emerge. Top court games become close battles (14-10, 13-11).</td>
              </tr>
              <tr>
                <td>4</td>
                <td>Mid-tournament. Rankings are stabilizing. Both courts have competitive matches.</td>
              </tr>
              <tr>
                <td>5</td>
                <td>The algorithm has solid data. Games are tight across both courts.</td>
              </tr>
              <tr>
                <td>6</td>
                <td>Late-stage battles. The top 2-3 players are separated by a few points.</td>
              </tr>
              <tr>
                <td>7</td>
                <td>Final round. The leader needs a strong result to hold position. Exciting finish.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Timeline</h3>
        <p>
          The timeline is identical to 8-player Americano: about 2 hours for 7 rounds at 24 points per match, or 2.5 hours at 32 points. The matchmaking calculation is instant — no extra time between rounds.
        </p>

        <h2>How Many Rounds?</h2>
        <p>
          <strong>7 rounds minimum</strong> for Mexicano with 8 players. The algorithm needs enough rounds to generate meaningful standings. Fewer than 7 rounds means the matchmaking does not have enough data to create well-balanced games.
        </p>
        <p>
          <strong>9 rounds</strong> is even better if time allows. The extra rounds let the standings settle and produce a clear, fair winner.
        </p>
        <p>
          Unlike Americano, cutting Mexicano short to 5 rounds is not recommended — you lose the main advantage of the format (progressive balancing).
        </p>

        <h2>Mexicano vs Americano for 8 Players</h2>
        <p>
          With only 8 players, the difference is subtle. Here is a practical comparison:
        </p>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th></th>
                <th>Americano</th>
                <th>Mexicano</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Matchups</strong></td>
                <td>Random every round</td>
                <td>Based on standings from round 2</td>
              </tr>
              <tr>
                <td><strong>Schedule</strong></td>
                <td>Known before round 1</td>
                <td>Generated round by round</td>
              </tr>
              <tr>
                <td><strong>Game balance</strong></td>
                <td>Varies — some lopsided games</td>
                <td>Gets tighter over time</td>
              </tr>
              <tr>
                <td><strong>Best for</strong></td>
                <td>Equal skill groups, casual events</td>
                <td>Mixed skill levels, competitive groups</td>
              </tr>
              <tr>
                <td><strong>Minimum rounds</strong></td>
                <td>5 (fair enough)</td>
                <td>7 (algorithm needs data)</td>
              </tr>
              <tr>
                <td><strong>Excitement</strong></td>
                <td>Consistent throughout</td>
                <td>Builds toward the end</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Bottom line: if your 8 players are roughly the same level, Americano is simpler and works great. If there is a skill gap, Mexicano ensures everyone gets competitive games. Read the full <a href="/americano-vs-mexicano">Americano vs Mexicano comparison</a>.
        </p>

        <h2>Tips for 8-Player Mexicano</h2>
        <ul>
          <li><strong>Let the app handle matchups.</strong> Manual Mexicano is nearly impossible — you need to re-rank 8 players, avoid repeat pairings, and assign courts after every round. The app does this instantly.</li>
          <li><strong>Use 24 or 32 points per match.</strong> 24 points keeps games around 12 minutes — fast and energetic. 32 points gives longer rallies and more strategy. Either works well for Mexicano.</li>
          <li><strong>Do not worry about round 1 results.</strong> The first round is random and often produces uneven scores. The algorithm corrects quickly — by round 3, matchups will feel balanced.</li>
          <li><strong>Play at least 7 rounds.</strong> Mexicano's advantage is progressive balancing. Cutting it short defeats the purpose. If you only have time for 5 rounds, use Americano instead.</li>
          <li><strong>Show live standings between rounds.</strong> Part of the fun of Mexicano is watching the rankings shift. Display standings on a screen or read them out after each round.</li>
        </ul>

        <div className={styles.cta}>
          <p>Start an 8-player Mexicano in seconds — no signup required.</p>
          <a className={styles.ctaButton} href="/play">Start an 8-Player Mexicano →</a>
        </div>

        <h3>Related</h3>
        <ul>
          <li><a href="/mexicano">Mexicano Padel — Full Rules & Guide</a></li>
          <li><a href="/americano-8-players">Americano for 8 Players</a> — random pairings alternative</li>
          <li><a href="/americano-vs-mexicano">Americano vs Mexicano</a> — detailed comparison</li>
          <li><a href="/organize">Organizer Guide</a> — tips for running any tournament</li>
        </ul>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
