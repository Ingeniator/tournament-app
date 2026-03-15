import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function InterClubPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>Inter-Club Padel Tournaments — How to Organize Club vs Club</h1>
        <p className={styles.lead}>
          Inter-club events are the highlight of any padel community. Here's how to run them fairly and smoothly.
        </p>

        <h2>Choosing a Format</h2>

        <h3>Team Americano — Best for 2 Clubs</h3>
        <p>
          Fixed pairs from each club, rotating opponents. Every pair plays against every other pair over the course of the tournament. Club standings are calculated as the sum of all pairs' points — so every match matters for the team. This is the go-to format for inter-club rivalry. <a href="/team-americano">Learn more about Team Americano</a>.
        </p>

        <h3>Team Mexicano — More Competitive Variant</h3>
        <p>
          Same fixed-pair structure, but opponents are assigned based on current standings. Top pairs face top pairs, creating increasingly competitive matches as the tournament progresses. Better for clubs with similar overall skill levels where you want tight, meaningful games.
        </p>

        <h3>Mixed Inter-Club — Building Community</h3>
        <p>
          Pairs are formed across clubs — one player from each club per team. This turns a rivalry into a mixer. Great for the first inter-club event when you want to build relationships between clubs, or as a warm-up event before the competitive main draw.
        </p>

        <h3>Americano Free-for-All — Social Mixer</h3>
        <p>
          Individual standings with partners rotating across both clubs. Everyone plays with everyone. The most social option — by the end, every player has partnered with members of the other club. Best for casual inter-club meetups where the goal is connection, not competition.
        </p>

        <h2>Logistics</h2>
        <ul>
          <li><strong>Hosting rotation</strong> — alternate which club hosts. The home club handles court booking and setup; the visiting club brings players.</li>
          <li><strong>Court booking</strong> — 1 court per 4 players. For 16 players (8 per club), book 4 courts for 3 hours.</li>
          <li><strong>Player registration</strong> — use <a href="/plan">the planner</a> to create a tournament and share the join link. Players register themselves, saving the organizer from collecting names manually.</li>
          <li><strong>Scheduling</strong> — weekday evenings (18:00-21:00) or weekend mornings work best. Avoid peak hours when courts are expensive.</li>
        </ul>

        <h2>Scoring for Inter-Club Events</h2>
        <p>
          In Team Americano and Team Mexicano, scoring works at two levels:
        </p>
        <ul>
          <li><strong>Pair standings</strong> — each fixed pair accumulates points across all rounds. This determines the top pair of the event.</li>
          <li><strong>Club standings</strong> — sum all pairs' points from a club. The club with the higher total wins the inter-club match. This is the number that matters for bragging rights.</li>
        </ul>
        <p>
          For Americano Free-for-All, standings are individual. You can still calculate club totals by summing individual scores per club.
        </p>

        <h2>Sample Inter-Club Event</h2>
        <p>
          Here's a concrete plan for a standard inter-club match:
        </p>
        <ul>
          <li><strong>Clubs:</strong> 2 clubs, 8 players each (16 total)</li>
          <li><strong>Courts:</strong> 4 courts</li>
          <li><strong>Format:</strong> Team Americano</li>
          <li><strong>Points per match:</strong> 24</li>
          <li><strong>Rounds:</strong> 7</li>
        </ul>

        <h3>Timeline</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Activity</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>18:00</td>
                <td>Arrival, introductions, warm-up</td>
                <td>20 min</td>
              </tr>
              <tr>
                <td>18:20</td>
                <td>Format briefing, team photos</td>
                <td>5 min</td>
              </tr>
              <tr>
                <td>18:25</td>
                <td>Rounds 1-3</td>
                <td>55 min</td>
              </tr>
              <tr>
                <td>19:20</td>
                <td>Water break</td>
                <td>5 min</td>
              </tr>
              <tr>
                <td>19:25</td>
                <td>Rounds 4-7</td>
                <td>75 min</td>
              </tr>
              <tr>
                <td>20:40</td>
                <td>Awards ceremony</td>
                <td>10 min</td>
              </tr>
              <tr>
                <td>20:50</td>
                <td>Social time / drinks</td>
                <td>open</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>Total organized time: approximately 2 hours 50 minutes.</p>

        <h2>Running a League</h2>
        <p>
          Monthly inter-club events with cumulative standings create a season-long competition that keeps both clubs engaged. Here's how to structure it:
        </p>
        <ul>
          <li><strong>Monthly matches</strong> — one event per month, alternating host clubs.</li>
          <li><strong>Cumulative club points</strong> — track the club standings total from each event. The club leading the cumulative total holds the "trophy" until the next event.</li>
          <li><strong>Use Club mode</strong> — PadelDay's <a href="/club">Club mode</a> tracks results across sessions automatically, building a season leaderboard without spreadsheets.</li>
          <li><strong>Season finale</strong> — end the season with a special event: more rounds, awards, and social time.</li>
        </ul>

        <h2>Tips for Successful Inter-Club Events</h2>
        <ul>
          <li><strong>Neutral hosting</strong> — if possible, use a neutral venue occasionally. It removes home-court advantage and feels more like a proper competition.</li>
          <li><strong>Balanced court allocation</strong> — when hosting, make sure visiting players feel welcome. Share court assignments, locker info, and parking details in advance.</li>
          <li><strong>Social time after</strong> — the tournament ends, but the event doesn't. Plan for drinks, food, or at minimum a gathering area. This is where the real community building happens.</li>
          <li><strong>Rotate home/away</strong> — strict alternation keeps it fair and gives both clubs a chance to showcase their venue.</li>
          <li><strong>Consistent team sizes</strong> — agree on player count in advance (e.g., 8 per club). Last-minute dropouts disrupt the format, so have a standby list.</li>
        </ul>

        <div className={styles.cta}>
          <p>Set up your inter-club tournament — share the join link with both clubs.</p>
          <a className={styles.ctaButton} href="/plan">Set Up Inter-Club Event →</a>
        </div>

        <h2>Related Guides</h2>
        <ul>
          <li><a href="/team-americano">Team Americano format guide</a> — rules, scoring, and tips</li>
          <li><a href="/club">Club mode</a> — track results across sessions</li>
          <li><a href="/organize">How to organize a padel tournament</a> — general organizing guide</li>
        </ul>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
