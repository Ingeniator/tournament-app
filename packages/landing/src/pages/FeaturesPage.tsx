import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function FeaturesPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>Free Padel Tournament Planner & Live Scoring</h1>
        <p className={styles.lead}>
          PadelDay is the free tournament manager for padel, tennis, and racket sports. No account needed. Works offline. Runs on any phone.
        </p>

        <h2>What You Get</h2>
        <div className={styles.cardGrid}>
          <div className={styles.card}>
            <div className={styles.cardEmoji}>🎯</div>
            <div className={styles.cardName}>15 Tournament Formats</div>
            <div className={styles.cardDesc}>
              Americano, Mexicano, Mixicano, Team variants, King of the Court, and Club modes. Every social and competitive format in one app. <a href="/formats">See all formats</a>.
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardEmoji}>🔄</div>
            <div className={styles.cardName}>Automatic Pairings</div>
            <div className={styles.cardDesc}>
              The algorithm generates fair partner and opponent assignments every round. No manual spreadsheets, no formula errors, no arguments.
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardEmoji}>📱</div>
            <div className={styles.cardName}>Live Scoring</div>
            <div className={styles.cardDesc}>
              Enter scores on your phone. Standings update instantly for all players. No paper scorecards, no waiting for results.
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardEmoji}>🏆</div>
            <div className={styles.cardName}>41 Awards</div>
            <div className={styles.cardDesc}>
              Tap-to-reveal ceremony at the end. Champion, Most Consistent, Comeback King, and 38 more. The highlight of every tournament. <a href="/awards">See all awards</a>.
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardEmoji}>🃏</div>
            <div className={styles.cardName}>Curse Cards (Maldiciones)</div>
            <div className={styles.cardDesc}>
              Optional handicap cards for social events. 17 cards across 3 difficulty levels. Add chaos and laughs to your tournament. <a href="/maldiciones">Learn more</a>.
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardEmoji}>📡</div>
            <div className={styles.cardName}>Works Offline</div>
            <div className={styles.cardDesc}>
              A Progressive Web App that works without internet. Perfect for outdoor courts with no wifi. Load once, play anywhere.
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardEmoji}>🌍</div>
            <div className={styles.cardName}>7 Languages</div>
            <div className={styles.cardDesc}>
              English, Spanish, French, Italian, Portuguese, Serbian, and Swedish. The interface adapts to your language automatically.
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardEmoji}>🎨</div>
            <div className={styles.cardName}>16 Themes</div>
            <div className={styles.cardDesc}>
              Customize the look. Dark, light, and colorful themes. Match your club branding or just pick your favorite color.
            </div>
          </div>
        </div>

        <h2>How It Works</h2>
        <ol>
          <li><strong>Open PadelDay</strong> — add players, pick a format, set the number of courts and points per match.</li>
          <li><strong>Play rounds</strong> — enter scores on any phone after each match. The app generates the next round automatically.</li>
          <li><strong>View standings</strong> — live leaderboard updates after every score. Run the awards ceremony when the tournament ends.</li>
        </ol>

        <h2>Tournament Planner</h2>
        <p>
          The <a href="/plan">tournament planner</a> lets you organize events before they start:
        </p>
        <ul>
          <li><strong>Create a tournament</strong> with a shareable link.</li>
          <li><strong>Players join</strong> by scanning a QR code or entering a short 6-character code.</li>
          <li><strong>See registrations</strong> in real-time as players sign up.</li>
          <li><strong>Launch the tournament</strong> when everyone is ready — pairings are generated instantly.</li>
          <li><strong>No accounts, no downloads, no fees.</strong> Everything runs in the browser.</li>
        </ul>

        <h2>Compared to Alternatives</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th></th>
                <th>Spreadsheets</th>
                <th>Paid Apps</th>
                <th>Chat Groups</th>
                <th>PadelDay</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Automatic pairings</strong></td>
                <td>No</td>
                <td>Yes</td>
                <td>No</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td><strong>Live standings</strong></td>
                <td>Manual</td>
                <td>Yes</td>
                <td>No</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td><strong>Works offline</strong></td>
                <td>Partial</td>
                <td>Varies</td>
                <td>No</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td><strong>No account needed</strong></td>
                <td>No</td>
                <td>No</td>
                <td>Yes</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td><strong>Free</strong></td>
                <td>Yes</td>
                <td>No</td>
                <td>Yes</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td><strong>Awards ceremony</strong></td>
                <td>No</td>
                <td>Rarely</td>
                <td>No</td>
                <td>41 awards</td>
              </tr>
              <tr>
                <td><strong>Fair rotation</strong></td>
                <td>Error-prone</td>
                <td>Yes</td>
                <td>No</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td><strong>Mobile-friendly</strong></td>
                <td>No</td>
                <td>Yes</td>
                <td>Yes</td>
                <td>Yes</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>Who Uses PadelDay</h2>
        <ul>
          <li><strong>Club organizers</strong> running weekly Americano and Mexicano events.</li>
          <li><strong>Friend groups</strong> organizing weekend padel without the spreadsheet hassle.</li>
          <li><strong>Corporate event planners</strong> who need a turnkey tournament for team-building days.</li>
          <li><strong>Padel coaches</strong> running training tournaments and tracking player progress.</li>
        </ul>

        <h2>Frequently Asked Questions</h2>
        <h3>Is PadelDay really free?</h3>
        <p>
          Yes. There are no paid tiers, no ads, and no account required. All features — including tournament planning, live scoring, and 41 awards — are available at no cost.
        </p>
        <h3>Do I need to create an account?</h3>
        <p>
          No. Open the app in your browser, add players, and start playing. The tournament planner also works without registration.
        </p>
        <h3>Does it work offline?</h3>
        <p>
          Yes. PadelDay is a Progressive Web App (PWA) that works without internet. Once loaded, you can run an entire tournament offline.
        </p>
        <h3>What formats are supported?</h3>
        <p>
          15 formats including Americano, Mexicano, Mixicano, Team Americano, Team Mexicano, King of the Court, and Club modes. <a href="/formats">See the full list</a>.
        </p>
        <h3>Can players follow on their own phones?</h3>
        <p>
          Yes. With the tournament planner, players join by scanning a QR code or entering a short code. They see pairings and standings in real-time.
        </p>
        <h3>Does it work for other sports?</h3>
        <p>
          Yes. While designed for padel, PadelDay works for tennis, pickleball, badminton, and any racket sport. The scoring and pairing system is sport-agnostic.
        </p>

        <div className={styles.cta}>
          <p>Start planning your tournament — free, no signup.</p>
          <a className={styles.ctaButton} href="/plan">Open Tournament Planner →</a>
          <p style={{ marginTop: 'var(--space-md)', fontSize: 'var(--text-sm)' }}>
            Or <a href="/play">run a tournament right now</a> — no planning needed.
          </p>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
