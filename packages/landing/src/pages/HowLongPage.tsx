import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function HowLongPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>How Long Does a Padel Tournament Take?</h1>
        <p className={styles.lead}>
          Quick answer — 2 to 4 hours for most formats. Here's exactly how to plan your time.
        </p>

        <h2>Quick Reference: Tournament Duration by Group Size</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Players</th>
                <th>Courts</th>
                <th>Format</th>
                <th>Rounds</th>
                <th>Est. Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>4</td>
                <td>1</td>
                <td>Any</td>
                <td>3-5</td>
                <td>1-1.5 hours</td>
              </tr>
              <tr>
                <td>8</td>
                <td>2</td>
                <td><a href="/americano">Americano</a></td>
                <td>7</td>
                <td>2-2.5 hours</td>
              </tr>
              <tr>
                <td>8</td>
                <td>2</td>
                <td><a href="/mexicano">Mexicano</a></td>
                <td>7</td>
                <td>2-2.5 hours</td>
              </tr>
              <tr>
                <td>8</td>
                <td>1</td>
                <td><a href="/king-of-the-court">King of Court</a></td>
                <td>continuous</td>
                <td>1.5-2 hours</td>
              </tr>
              <tr>
                <td>12</td>
                <td>3</td>
                <td><a href="/americano">Americano</a></td>
                <td>7-9</td>
                <td>2.5-3 hours</td>
              </tr>
              <tr>
                <td>12</td>
                <td>3</td>
                <td><a href="/mexicano">Mexicano</a></td>
                <td>7-9</td>
                <td>2.5-3 hours</td>
              </tr>
              <tr>
                <td>16</td>
                <td>4</td>
                <td><a href="/americano">Americano</a></td>
                <td>7-9</td>
                <td>3-3.5 hours</td>
              </tr>
              <tr>
                <td>16</td>
                <td>4</td>
                <td><a href="/mexicano">Mexicano</a></td>
                <td>9-11</td>
                <td>3.5-4 hours</td>
              </tr>
              <tr>
                <td>20-24</td>
                <td>5-6</td>
                <td>Any</td>
                <td>9-11</td>
                <td>4-5 hours</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>What Affects Duration</h2>
        <p>
          Several factors determine how long your tournament will actually take. The biggest variable is <strong>points per match</strong>:
        </p>
        <ul>
          <li><strong>16 points per match</strong> — about 12 minutes per game. Best for tight schedules and large groups.</li>
          <li><strong>24 points per match</strong> — about 15 minutes per game. The sweet spot for most events.</li>
          <li><strong>32 points per match</strong> — about 20 minutes per game. More competitive, longer rallies.</li>
        </ul>
        <p>Other factors:</p>
        <ul>
          <li><strong>Number of rounds</strong> — more rounds means fairer standings, but more time. 7 rounds is the minimum for meaningful results.</li>
          <li><strong>Time between rounds</strong> — court transitions, water breaks, and score entry. Budget 2-3 minutes between rounds.</li>
          <li><strong>Warm-up</strong> — plan 10-15 minutes for warm-up before the first round.</li>
          <li><strong>Awards ceremony</strong> — the reveal ceremony takes 5-10 minutes and is the highlight of the event. Don't skip it.</li>
        </ul>

        <h2>Time-Saving Tips</h2>
        <ul>
          <li><strong>Use 16-24 points per match</strong> instead of 32. You get more rounds in less time, and standings are fairer with more data points.</li>
          <li><strong>Set a time limit per round</strong> — if a match isn't finished in 15 minutes, current score stands. This keeps the event on track.</li>
          <li><strong>Brief players quickly</strong> — explain format and scoring before the first round, not during. One clear announcement saves 10+ minutes.</li>
          <li><strong>Let the app handle pairings</strong> — manual pairing calculations between rounds waste 3-5 minutes each time. Over 7 rounds, that's 20-35 minutes saved.</li>
        </ul>

        <h2>Planning Template: Work Backwards from Your Venue Booking</h2>
        <p>
          Start with how much time you have, then choose your settings:
        </p>

        <h3>"We have 3 hours and 12 players"</h3>
        <ul>
          <li>Format: Americano or Mexicano on 3 courts</li>
          <li>Points per match: 24</li>
          <li>Rounds: 7</li>
          <li>Warm-up: 15 min</li>
          <li>Play time: 7 rounds x 18 min = ~2 hours 6 min</li>
          <li>Transitions: 7 x 3 min = 21 min</li>
          <li>Awards: 10 min</li>
          <li>Total: ~2 hours 52 min — fits comfortably</li>
        </ul>

        <h3>"We have 2 hours and 8 players"</h3>
        <ul>
          <li>Format: Americano on 2 courts</li>
          <li>Points per match: 16</li>
          <li>Rounds: 5-6</li>
          <li>Warm-up: 10 min</li>
          <li>Play time: 6 rounds x 14 min = ~1 hour 24 min</li>
          <li>Transitions: 6 x 2 min = 12 min</li>
          <li>Awards: 10 min</li>
          <li>Total: ~1 hour 56 min — tight but doable</li>
        </ul>

        <h2>Always Include Buffer Time</h2>
        <p>
          Real events never run perfectly on schedule. Always add 15-20 minutes of buffer for:
        </p>
        <ul>
          <li><strong>Late arrivals</strong> — someone is always 5-10 minutes late. Don't hold up the group.</li>
          <li><strong>Warm-up and introductions</strong> — especially important for groups with newcomers.</li>
          <li><strong>Court transitions</strong> — players need water, bathroom breaks, and a moment to breathe.</li>
          <li><strong>Awards ceremony</strong> — the tap-to-reveal ceremony with 41 awards is the best part. Give it the time it deserves.</li>
        </ul>
        <p>
          For larger groups (16+ players), add 30 minutes of buffer instead. More people means more coordination overhead.
        </p>

        <div className={styles.cta}>
          <p>Plan your tournament now — the app calculates rounds and timing automatically.</p>
          <a className={styles.ctaButton} href="/plan">Plan Your Tournament →</a>
        </div>

        <h2>Related Guides</h2>
        <ul>
          <li><a href="/organize">How to organize a padel tournament</a> — step-by-step guide</li>
          <li><a href="/which-format">Which format should you choose?</a> — comparison of all formats</li>
        </ul>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
