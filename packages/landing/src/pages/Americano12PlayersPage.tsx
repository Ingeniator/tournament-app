import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function Americano12PlayersPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>Americano Padel for 12 Players</h1>
        <p className={styles.lead}>
          12 players on 3 courts — the sweet spot for club events and social gatherings. Big enough for variety, small enough to finish in an afternoon.
        </p>

        <h2>The Setup</h2>
        <p>
          12 players, 3 padel courts. Each round, 4 players are assigned to each court (2 teams of 2). All 12 players are active every round — 6 matches happen per round (2 per court, but each court hosts 1 match at a time, so 3 simultaneous matches). Partners rotate after every round.
        </p>

        <h2>Sample Schedule</h2>
        <p>
          The app generates optimized pairings automatically. Here is what a typical 7-round schedule looks like with 12 players (A through L):
        </p>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Round</th>
                <th>Court 1</th>
                <th>Court 2</th>
                <th>Court 3</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>1</td><td>A + B vs C + D</td><td>E + F vs G + H</td><td>I + J vs K + L</td></tr>
              <tr><td>2</td><td>A + E vs I + K</td><td>B + G vs J + L</td><td>C + F vs D + H</td></tr>
              <tr><td>3</td><td>A + G vs F + L</td><td>B + I vs D + K</td><td>C + H vs E + J</td></tr>
              <tr><td>4</td><td>A + J vs H + K</td><td>B + F vs C + I</td><td>D + L vs E + G</td></tr>
              <tr><td>5</td><td>A + L vs D + F</td><td>B + H vs E + K</td><td>C + J vs G + I</td></tr>
              <tr><td>6</td><td>A + C vs G + J</td><td>B + K vs F + H</td><td>D + I vs E + L</td></tr>
              <tr><td>7</td><td>A + H vs E + I</td><td>B + D vs G + L</td><td>C + K vs F + J</td></tr>
            </tbody>
          </table>
        </div>

        <h3>Timeline</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Activity</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>0:00</td><td>Arrival + warm-up</td></tr>
              <tr><td>0:15</td><td>Round 1</td></tr>
              <tr><td>0:33</td><td>Round 2</td></tr>
              <tr><td>0:51</td><td>Round 3</td></tr>
              <tr><td>1:09</td><td>Round 4</td></tr>
              <tr><td>1:27</td><td>Round 5</td></tr>
              <tr><td>1:45</td><td>Round 6</td></tr>
              <tr><td>2:03</td><td>Round 7</td></tr>
              <tr><td>2:21</td><td>Awards ceremony</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          This assumes 32 points per match (~15 min games + 3 min transition). With 24 points per match, subtract about 20 minutes from the total. Expect roughly 2.5 to 3 hours total.
        </p>

        <h2>How Many Rounds?</h2>
        <p>
          With 12 players, each player has 11 possible partners. A full rotation would take 11 rounds — that is about 3.5 hours, which is too long for most groups.
        </p>
        <p>
          <strong>7 rounds</strong> is the recommended minimum. Each player gets 7 different partners out of 11 possible — enough for fair standings.
        </p>
        <p>
          <strong>9 rounds</strong> is ideal if you have the time. More data means standings are more accurate, and players experience greater partner variety.
        </p>
        <p>
          <strong>5 rounds</strong> works for time-limited events (under 2 hours), but standings will have more variance.
        </p>

        <h2>Court Management</h2>
        <p>
          All 3 courts play simultaneously each round. The main challenge is synchronization: you need to wait for the slowest court to finish before starting the next round, since pairings change.
        </p>
        <p>
          Tips for smooth transitions:
        </p>
        <ul>
          <li><strong>Post the draw visibly.</strong> Show the next round's pairings on a screen or whiteboard so players know where to go.</li>
          <li><strong>Set a round timer.</strong> If one court finishes early, those players can rest and hydrate. Start the next round when all courts are done.</li>
          <li><strong>Designate a scorer.</strong> One person enters scores on the app as courts finish. This avoids delays between rounds.</li>
          <li><strong>Keep water courtside.</strong> With 12 players, transition breaks are only 2-3 minutes. No time for trips to the bar.</li>
        </ul>

        <h2>Consider Mexicano</h2>
        <p>
          With 12 players, <a href="/mexicano">Mexicano</a> is a strong alternative. Its standings-based matchmaking creates progressively balanced games: strong players face strong opponents, and players who are struggling get more evenly matched games.
        </p>
        <p>
          The difference between Americano and Mexicano is more noticeable with 12 players than with 8, because there are more possible matchups for the algorithm to optimize. If your group has a wide range of skill levels, Mexicano gives a better experience. See our <a href="/americano-vs-mexicano">Americano vs Mexicano comparison</a> for details.
        </p>

        <h2>What If You Have 11 or 13?</h2>
        <p>
          <strong>11 players:</strong> Use 3 courts but one player sits out each round. Over 11 rounds, each player rests exactly once. For 7 rounds, 4 players will rest once and 7 will play every round. The app distributes rest rounds fairly.
        </p>
        <p>
          <strong>13 players:</strong> Same approach — one player rests per round across 3 courts. Over 13 rounds each person rests once. For shorter events, the app balances who sits out.
        </p>
        <p>
          <strong>10 players:</strong> Drop to 2 courts. Two players sit out each round. This actually works well — resting players get recovery time, and the tournament stays organized.
        </p>

        <div className={styles.cta}>
          <p>Start a 12-player Americano in seconds — no signup required.</p>
          <a className={styles.ctaButton} href="/play">Start a 12-Player Americano →</a>
        </div>

        <h3>Related</h3>
        <ul>
          <li><a href="/americano">Americano Padel — Full Rules & Guide</a></li>
          <li><a href="/americano-8-players">Americano for 8 Players</a> — the classic 2-court setup</li>
          <li><a href="/mexicano">Mexicano Padel</a> — standings-based alternative</li>
          <li><a href="/americano-vs-mexicano">Americano vs Mexicano</a> — which to choose</li>
          <li><a href="/organize">Organizer Guide</a> — tips for running any tournament</li>
        </ul>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
