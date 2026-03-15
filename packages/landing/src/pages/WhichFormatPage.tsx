import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function WhichFormatPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>Which Padel Tournament Format Should You Choose?</h1>
        <p className={styles.lead}>
          The right format depends on your group, time, and vibe. Here's a quick guide to help you pick.
        </p>

        <h2>Quick Decision Guide</h2>
        <div className={styles.cardGrid}>
          <div className={styles.card}>
            <div className={styles.cardName}>First time organizing?</div>
            <div className={styles.cardDesc}>
              <a href="/americano"><strong>Americano</strong></a>. Simplest format, everyone plays with everyone. Easy to explain, impossible to mess up.
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardName}>Competitive group, similar levels?</div>
            <div className={styles.cardDesc}>
              <a href="/mexicano"><strong>Mexicano</strong></a>. Standings-based matchups create tighter games. Top players face top players.
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardName}>Mixed men & women?</div>
            <div className={styles.cardDesc}>
              <a href="/formats"><strong>Mixicano</strong></a>. Ensures every team has one player from each group (e.g., one man + one woman).
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardName}>Couples or fixed pairs?</div>
            <div className={styles.cardDesc}>
              <a href="/formats"><strong>Team Americano</strong></a>. Partners stay together the whole tournament. Opponents rotate.
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardName}>Short on time or odd player count?</div>
            <div className={styles.cardDesc}>
              <a href="/formats"><strong>King of the Court</strong></a>. Fast rounds, flexible player count. The only format that handles odd numbers natively.
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardName}>Running a league or weekly event?</div>
            <div className={styles.cardDesc}>
              <a href="/club"><strong>Club formats</strong></a>. Track standings across multiple sessions. Perfect for recurring groups.
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardName}>Want maximum chaos and fun?</div>
            <div className={styles.cardDesc}>
              Add <a href="/maldiciones"><strong>Maldiciones</strong></a> (curse cards) to any format. Random handicaps keep every round unpredictable.
            </div>
          </div>
        </div>

        <h2>By Group Size</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Players</th>
                <th>Courts</th>
                <th>Best Format</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>4-6</td>
                <td>1</td>
                <td><a href="/formats">King of the Court</a> or <a href="/americano">Americano</a></td>
              </tr>
              <tr>
                <td>8</td>
                <td>2</td>
                <td><a href="/americano">Americano</a> or <a href="/mexicano">Mexicano</a></td>
              </tr>
              <tr>
                <td>12</td>
                <td>3</td>
                <td><a href="/mexicano">Mexicano</a> — standings-based matching shines with more players</td>
              </tr>
              <tr>
                <td>16+</td>
                <td>4+</td>
                <td>Any format — you have enough players for full rotation</td>
              </tr>
              <tr>
                <td>Odd number</td>
                <td>1+</td>
                <td><a href="/formats">King of the Court</a> — the only format that handles odd counts natively</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>By Event Type</h2>
        <ul>
          <li><strong>After-work social:</strong> <a href="/americano">Americano</a> + <a href="/maldiciones">curse cards</a>. Low-stakes fun with random handicaps.</li>
          <li><strong>Club championship:</strong> <a href="/mexicano">Mexicano</a>. Standings-based matchups reward consistency and skill.</li>
          <li><strong>Couples night:</strong> <a href="/formats">Team Americano</a> or <a href="/formats">Mixed Team Americano</a>. Fixed pairs, rotating opponents.</li>
          <li><strong>Charity or corporate event:</strong> <a href="/americano">Americano</a>. Simplest to explain to newcomers — zero learning curve.</li>
          <li><strong>Weekly recurring:</strong> <a href="/club">Club Americano or Club Mexicano</a>. Cumulative standings across sessions keep players coming back.</li>
        </ul>

        <h2>By Time Available</h2>
        <ul>
          <li><strong>1 hour:</strong> <a href="/formats">King of the Court</a>. Quick rotations, no wasted time.</li>
          <li><strong>2 hours:</strong> <a href="/americano">Americano</a> (5 rounds). The sweet spot for most groups.</li>
          <li><strong>3 hours:</strong> <a href="/mexicano">Mexicano</a> (7 rounds). More rounds means fairer standings and tighter competition.</li>
          <li><strong>Half day:</strong> Run multiple formats in sequence — start with Americano to warm up, finish with Mexicano for the main event.</li>
        </ul>

        <h2>Still Not Sure?</h2>
        <p>
          Check out the <a href="/formats">full format encyclopedia</a> for detailed rules, scoring, and strategy for every format. Or read the <a href="/organize">organizer guide</a> for tips on running a smooth tournament regardless of format.
        </p>

        <div className={styles.cta}>
          <p>Pick a format and start in 30 seconds — no signup required.</p>
          <a className={styles.ctaButton} href="/play">Start a Tournament Now →</a>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
