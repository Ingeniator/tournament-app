import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function Americano8PlayersPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>Americano Padel for 8 Players</h1>
        <p className={styles.lead}>
          The most common Americano setup. 8 players, 2 courts, roughly 2 hours. Everyone plays every round, partners rotate, and the best individual scorer wins.
        </p>

        <h2>The Setup</h2>
        <p>
          You need exactly 8 players and 2 padel courts. Each round, 4 players are assigned to each court as 2 teams of 2. All 8 players are active every round — no one sits out. Partners change after every round so each player eventually pairs with everyone else.
        </p>

        <h2>Sample Schedule</h2>
        <p>
          With 8 players (A through H), here is a full 7-round rotation where every player partners with every other player exactly once:
        </p>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Round</th>
                <th>Court 1</th>
                <th>Court 2</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>1</td><td>A + B vs C + D</td><td>E + F vs G + H</td></tr>
              <tr><td>2</td><td>A + C vs E + G</td><td>B + D vs F + H</td></tr>
              <tr><td>3</td><td>A + D vs F + G</td><td>B + C vs E + H</td></tr>
              <tr><td>4</td><td>A + E vs B + F</td><td>C + G vs D + H</td></tr>
              <tr><td>5</td><td>A + F vs D + G</td><td>B + E vs C + H</td></tr>
              <tr><td>6</td><td>A + G vs D + F</td><td>B + H vs C + E</td></tr>
              <tr><td>7</td><td>A + H vs C + F</td><td>B + G vs D + E</td></tr>
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
              <tr><td>0:30</td><td>Round 2</td></tr>
              <tr><td>0:45</td><td>Round 3</td></tr>
              <tr><td>1:00</td><td>Round 4</td></tr>
              <tr><td>1:15</td><td>Round 5</td></tr>
              <tr><td>1:30</td><td>Round 6</td></tr>
              <tr><td>1:45</td><td>Round 7</td></tr>
              <tr><td>2:00</td><td>Awards ceremony</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          This timeline assumes 24 points per match (~12 min games + 3 min transition). With 32 points per match, add about 30 minutes total.
        </p>

        <h2>How Many Rounds?</h2>
        <p>
          7 rounds is the magic number for 8 players — every player partners with every other player exactly once. This gives the fairest possible standings because no partnership is repeated or missed.
        </p>
        <p>
          If you only have 90 minutes, play 5 rounds instead. Standings will still be meaningful, just with slightly more luck involved. The app optimizes pairings so that even in 5 rounds, partner variety is maximized.
        </p>

        <h2>Points Per Match</h2>
        <p>
          <strong>24 points</strong> is the sweet spot for 8-player Americano. Games finish in about 12 minutes, keeping the full 7-round tournament under 2 hours. It is fast enough to stay energetic but long enough for skill to matter.
        </p>
        <p>
          <strong>32 points</strong> works if your group prefers longer rallies and more strategic play. Games take about 18 minutes, pushing the tournament to 2.5 hours. Good for experienced players who want each match to feel substantial.
        </p>
        <p>
          <strong>16 points</strong> is too short for most groups — games end before you find your rhythm. Save this for very large groups where you need to fit more rounds into limited time.
        </p>

        <h2>Why 8 Players Works Best</h2>
        <p>
          8 is the most popular Americano group size for good reason. Everyone plays every round (no sitting out), you only need 2 courts (easy to book), 7 rounds gives a perfect complete rotation, and the whole event wraps up in about 2 hours. It is big enough for variety — you will have 7 different partners — but small enough to feel social. Everyone knows everyone by the end.
        </p>

        <h2>What If Someone Cancels?</h2>
        <p>
          <strong>Down to 7 players:</strong> Switch to <a href="/king-of-the-court">King of the Court</a> format, where one player sits out each round and rotates in. Or have one player play twice in alternating rounds as a stand-in.
        </p>
        <p>
          <strong>Down to 6 players:</strong> You can still play Americano on 1 or 2 courts. With 2 courts, two players sit out each round. With 1 court, play round-robin style. The app handles both scenarios.
        </p>
        <p>
          <strong>Gained a 9th player:</strong> One player sits out each round. Over 9 rounds, each player rests once. The app manages the rotation automatically.
        </p>

        <div className={styles.cta}>
          <p>Start an 8-player Americano in seconds — no signup required.</p>
          <a className={styles.ctaButton} href="/play">Start an 8-Player Americano →</a>
        </div>

        <h3>Related</h3>
        <ul>
          <li><a href="/americano">Americano Padel — Full Rules & Guide</a></li>
          <li><a href="/mexicano-8-players">Mexicano for 8 Players</a> — standings-based alternative</li>
          <li><a href="/americano-12-players">Americano for 12 Players</a> — scaling up to 3 courts</li>
          <li><a href="/organize">Organizer Guide</a> — tips for running any tournament</li>
        </ul>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
