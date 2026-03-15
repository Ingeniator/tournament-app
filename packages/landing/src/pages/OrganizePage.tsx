import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function OrganizePage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
        <a className={styles.navLink} href="/es/organizar-torneo-padel" lang="es">Español</a>
      </nav>
      <article className={styles.article}>
        <h1>How to Organize a Padel Tournament</h1>
        <p className={styles.lead}>
          The definitive guide for anyone tasked with organizing a padel tournament — whether it's your first time or your fiftieth. Bookmark this page, share it with your group, and use the checklists on the day.
        </p>

        <h2>Before the Event</h2>
        <p>
          Most tournament problems happen because of poor planning, not poor play. Sort out these four things in advance and the event runs itself.
        </p>

        <h3>1. Book Courts</h3>
        <p>
          The golden rule: <strong>1 court per 4 players</strong>. This ensures everyone plays every round with no waiting. If you have more players than courts, players will rotate in and out — workable, but slower.
        </p>
        <p>
          Always book <strong>15–30 minutes of extra time</strong> beyond what you think you need. You'll use it for warmup, transitions between rounds, and the awards ceremony at the end.
        </p>

        <h3>2. Gather Players</h3>
        <p>
          The hardest part of organizing is getting firm headcounts. Send a message to your group with the date, time, location, and cost per person. Set a <strong>deadline for confirming</strong> — 48 hours before the event works well.
        </p>
        <p>
          Aim for <strong>player counts divisible by 4</strong> (8, 12, 16, 20, 24). If you end up with an odd number, the app can handle it, but even numbers make for smoother scheduling. Keep 1–2 backup players on standby for last-minute cancellations.
        </p>
        <p>
          You can also use PadelDay's <a href="/plan">planning tool</a> — create a tournament, share the link, and players register themselves. No WhatsApp spreadsheet needed.
        </p>

        <h3>3. Choose a Format</h3>
        <p>
          Pick based on your group:
        </p>
        <ul>
          <li><strong><a href="/americano">Americano</a></strong> — rotating partners, individual standings. Best for social groups with mixed skill levels.</li>
          <li><strong><a href="/mexicano">Mexicano</a></strong> — standings-based matchups. Best for competitive groups where everyone wants close games.</li>
          <li><strong><a href="/team-americano">Team Americano</a></strong> — fixed pairs, team standings. Best when people come as duos.</li>
          <li><strong><a href="/mixicano">Mixicano</a></strong> — mixed-gender pairs, standings-based. Best for events where you want every team to be one man + one woman.</li>
        </ul>
        <p>
          Not sure? Use the <a href="/which-format">format decision tree</a> to find the right one for your group.
        </p>

        <h3>4. Equipment Checklist</h3>
        <ul>
          <li><strong>Balls:</strong> 3 new balls per court. Budget balls are fine for social play.</li>
          <li><strong>Scoring device:</strong> A phone or tablet with PadelDay open. One device is enough — the organizer enters scores.</li>
          <li><strong>Portable speaker</strong> (optional): Useful for announcing pairings and calling players to courts.</li>
          <li><strong>Extra grips and overgrips:</strong> Someone always needs one.</li>
          <li><strong>Water and snacks:</strong> Coordinate who brings what, or arrange with the club.</li>
          <li><strong>Backup rackets:</strong> Most clubs rent them, but confirm in advance.</li>
        </ul>

        <h2>Organizer Checklist</h2>
        <p>
          Print this or screenshot it. Go through it the day before and again on the morning of the event.
        </p>
        <ul>
          <li>Courts booked (1 per 4 players, plus 15–30 min buffer)</li>
          <li>Player list confirmed (ideally divisible by 4)</li>
          <li>1–2 backup players on standby</li>
          <li>Format chosen and understood</li>
          <li>New balls purchased (3 per court)</li>
          <li>Phone/tablet charged for scoring</li>
          <li>PadelDay tournament created with player names</li>
          <li>Start time communicated to all players</li>
          <li>Court location and parking details shared</li>
          <li>Water, snacks, and any post-tournament plans arranged</li>
          <li>Extra grips and backup rackets available</li>
        </ul>

        <h2>Sample Tournament Schedules</h2>
        <p>
          These are real-world tested timelines. Adjust the points per match if you need to speed things up or slow them down.
        </p>

        <h3>Quick Social — 8 players, 2 courts, 2 hours</h3>
        <p>
          The weeknight special. Fast, fun, and everyone gets plenty of playing time.
        </p>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Activity</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>0:00</td><td>Arrival, warmup, set up tournament in PadelDay</td></tr>
              <tr><td>0:15</td><td>Round 1 (16 points per match, ~12 min)</td></tr>
              <tr><td>0:30</td><td>Round 2</td></tr>
              <tr><td>0:45</td><td>Round 3</td></tr>
              <tr><td>1:00</td><td>Round 4</td></tr>
              <tr><td>1:15</td><td>Round 5</td></tr>
              <tr><td>1:30</td><td>Round 6</td></tr>
              <tr><td>1:45</td><td>Awards ceremony + cool down</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          <strong>Settings:</strong> Americano or Mexicano, 16 points per match, 6 rounds. Every player plays every round — no sitting out.
        </p>

        <h3>Standard Event — 12 players, 3 courts, 3 hours</h3>
        <p>
          The most common setup for club events and friend groups. Room for longer games and a short break.
        </p>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Activity</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>0:00</td><td>Arrival, warmup, briefing</td></tr>
              <tr><td>0:20</td><td>Round 1 (24 points per match, ~18 min)</td></tr>
              <tr><td>0:40</td><td>Round 2</td></tr>
              <tr><td>1:00</td><td>Round 3</td></tr>
              <tr><td>1:20</td><td>Short break (water, regroup)</td></tr>
              <tr><td>1:30</td><td>Round 4</td></tr>
              <tr><td>1:50</td><td>Round 5</td></tr>
              <tr><td>2:10</td><td>Round 6</td></tr>
              <tr><td>2:30</td><td>Round 7 (optional, if time allows)</td></tr>
              <tr><td>2:45</td><td>Awards ceremony</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          <strong>Settings:</strong> Americano or Mexicano, 24 points per match, 6–7 rounds. With 12 players on 3 courts, all 12 play every round.
        </p>

        <h3>Full Day Tournament — 16–24 players, 4+ courts, 5+ hours</h3>
        <p>
          A proper event. Plan for a lunch break and consider a two-phase structure for larger groups.
        </p>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Activity</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>0:00</td><td>Arrival, registration, warmup</td></tr>
              <tr><td>0:30</td><td>Rounds 1–3 (24 or 32 points per match)</td></tr>
              <tr><td>1:45</td><td>Break</td></tr>
              <tr><td>2:00</td><td>Rounds 4–6</td></tr>
              <tr><td>3:15</td><td>Lunch break</td></tr>
              <tr><td>3:45</td><td>Rounds 7–9</td></tr>
              <tr><td>5:00</td><td>Round 10 (finals atmosphere)</td></tr>
              <tr><td>5:20</td><td>Awards ceremony + group photo</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          <strong>Settings:</strong> Mexicano works best for larger groups — standings-based matchups keep games competitive throughout. Use 24 or 32 points per match. With 16 players on 4 courts, everyone plays every round. With 20+ players, some will sit out each round.
        </p>

        <h2>Choosing the Right Format</h2>
        <p>
          Quick recommendations based on what you're organizing:
        </p>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Recommended Format</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>First-time organizer, mixed levels</td>
                <td><a href="/americano">Americano</a></td>
                <td>Simple, social, everyone plays with everyone</td>
              </tr>
              <tr>
                <td>Competitive club players</td>
                <td><a href="/mexicano">Mexicano</a></td>
                <td>Top players face top players, close games throughout</td>
              </tr>
              <tr>
                <td>Couples or friend pairs</td>
                <td><a href="/team-americano">Team Americano</a></td>
                <td>Fixed teams, pair standings</td>
              </tr>
              <tr>
                <td>Mixed-gender event</td>
                <td><a href="/mixicano">Mixicano</a></td>
                <td>Every team is one man + one woman, standings-based</td>
              </tr>
              <tr>
                <td>Large group, short on time</td>
                <td><a href="/king-of-the-court">King of the Court</a></td>
                <td>Fast rotation, high energy, no downtime</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Need more help deciding? The <a href="/which-format">format decision tree</a> walks you through it step by step.
        </p>

        <h2>Scoring & Standings</h2>
        <p>
          This is where most manual tournaments fall apart. Tracking points on paper with 12+ players across multiple courts is error-prone and slow. PadelDay handles it automatically:
        </p>
        <ul>
          <li><strong>Enter scores once</strong> — the app calculates everything: individual points, wins, game differential, head-to-head.</li>
          <li><strong>Live leaderboard</strong> — players can check standings between rounds on any device.</li>
          <li><strong>Fair pairings</strong> — the algorithm ensures maximum partner variety (Americano) or standings-based matchups (Mexicano).</li>
          <li><strong>Tiebreakers</strong> — built-in tiebreaker logic so you never have to make judgment calls.</li>
        </ul>
        <p>
          As the organizer, your only job is to tap in the score after each match. Everything else is automatic.
        </p>

        <h2>Awards Ceremony</h2>
        <p>
          Don't skip this part — it's what people remember. PadelDay computes <strong>41 awards</strong> automatically after the final round: best player, most improved, biggest upset, longest winning streak, and dozens more. Each award is revealed with a tap, so the whole group gathers around and watches together. It takes 5 minutes and turns a casual session into a real event. <a href="/awards">See all 41 awards</a>.
        </p>

        <h2>Common Mistakes</h2>
        <p>
          Organizers make the same mistakes every time. Avoid these and you'll look like a pro:
        </p>
        <ul>
          <li><strong>Not booking enough time.</strong> Rounds take longer than you think. Add a 15–30 minute buffer to your total booking.</li>
          <li><strong>No clear start time.</strong> Tell players "play starts at 18:15, arrive by 18:00." If you say "around 6," half the group shows up at 6:20.</li>
          <li><strong>Odd player count without a plan.</strong> If you have 9 or 11 players, someone sits out each round. The app handles this automatically, but warn players in advance so they expect it.</li>
          <li><strong>Manual scoring on paper.</strong> It works for 4 players. With 8+ players over 6+ rounds, you will make mistakes. Use the app.</li>
          <li><strong>Skipping the awards ceremony.</strong> It takes 5 minutes and is the most memorable part of the event. Don't end with "ok, good games everyone."</li>
          <li><strong>Not communicating logistics.</strong> Share court location, parking info, what to bring, and cost per person at least 24 hours before. People hate asking.</li>
          <li><strong>Forgetting balls.</strong> Club courts don't always come with balls. Bring 3 fresh balls per court.</li>
          <li><strong>Too many points per match.</strong> For social events, 16 points per match is the sweet spot — games finish in ~12 minutes. Going to 32 points means 20+ minute games and fewer rounds overall.</li>
        </ul>

        <div className={styles.cta}>
          <p>Start organizing — no signup required.</p>
          <a className={styles.ctaButton} href="/plan">Create a Tournament</a>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
