import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function TeamAmericanoPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>Team Americano Padel — Rules, Format & How to Organize</h1>
        <p className={styles.lead}>
          Team Americano keeps partners fixed throughout the tournament while rotating opponents. Perfect when couples, friends, or club pairs want to compete together.
        </p>

        <h2>What is Team Americano?</h2>
        <p>
          Team Americano is a padel tournament format where you play the entire event with the same partner. Unlike regular Americano where partners change every round, Team Americano locks in pairs from the start. Opponents still rotate each round so every team faces as many other teams as possible. Standings are tracked per team — both partners share the same score.
        </p>

        <h2>Team Americano vs Regular Americano</h2>
        <p>
          The key difference is simple: in Team Americano, your partner stays the same. Everything else follows the familiar Americano structure.
        </p>
        <table className={styles.table}>
          <thead>
            <tr>
              <th></th>
              <th>Team Americano</th>
              <th><a href="/americano">Regular Americano</a></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Partners</strong></td>
              <td>Fixed for the entire tournament</td>
              <td>Rotate every round</td>
            </tr>
            <tr>
              <td><strong>Opponents</strong></td>
              <td>Rotate every round</td>
              <td>Rotate every round</td>
            </tr>
            <tr>
              <td><strong>Standings</strong></td>
              <td>Per team</td>
              <td>Per individual</td>
            </tr>
            <tr>
              <td><strong>Best for</strong></td>
              <td>Couples, club pairs, inter-club events</td>
              <td>Social mixing, meeting new players</td>
            </tr>
            <tr>
              <td><strong>Scoring</strong></td>
              <td>Both partners share the same score</td>
              <td>Each player tracks their own score</td>
            </tr>
          </tbody>
        </table>

        <h2>What You Need</h2>
        <ul>
          <li><strong>Players:</strong> 8 or more (must be a multiple of 4). Each pair forms a fixed team.</li>
          <li><strong>Courts:</strong> 1 court per 2 teams playing simultaneously. 4 teams = 1–2 courts, 8 teams = 2–4 courts.</li>
          <li><strong>Points per match:</strong> Typically 16, 24, or 32 points. Shorter games allow more rounds.</li>
          <li><strong>Rounds:</strong> Usually 4–7 rounds depending on how many teams you have.</li>
        </ul>

        <h2>How to Play — Step by Step</h2>
        <ol>
          <li><strong>Form teams.</strong> Pair up players before the tournament starts. Each team of 2 is locked in for the entire event.</li>
          <li><strong>Set up the tournament.</strong> Enter team names, choose number of courts and points per match. The app handles opponent rotation.</li>
          <li><strong>Round 1 begins.</strong> Teams are randomly assigned opponents and courts. Each court plays one match to the target point total.</li>
          <li><strong>Score the match.</strong> Both teams' scores are entered (e.g., 18–14). Scores should add up to the point total.</li>
          <li><strong>Opponents rotate.</strong> After every round, new opponents are assigned. Partners stay the same.</li>
          <li><strong>Team standings update.</strong> Each team's points from every match accumulate. The leaderboard shows total team points, wins, and game differential.</li>
          <li><strong>Final standings.</strong> After all rounds, the team with the most points wins. In case of a tie, win count is the tiebreaker.</li>
        </ol>

        <h2>Scoring</h2>
        <p>
          Just like regular Americano, each match is played to a set point total (e.g., 32 points). The difference is that both partners on a team share the same score. When your team scores 20 points in a match, that 20 goes to the team total — not split between individuals. This means teammates always have identical standings, wins, and totals.
        </p>

        <h2>When to Use Team Americano</h2>
        <p>
          Team Americano shines in specific situations where fixed partnerships add to the experience:
        </p>
        <ul>
          <li><strong>Couples tournament / date night event.</strong> Partners play together, adding a social and competitive element for couples.</li>
          <li><strong>Club pairs who train together.</strong> Regular practice partners can test their teamwork against varied opponents.</li>
          <li><strong>Inter-club matchups.</strong> Each club sends fixed pairs to represent them — like a league night format.</li>
          <li><strong>Events where beginners feel more comfortable with a known partner.</strong> New players can rely on a stronger or familiar teammate instead of facing random pairings every round.</li>
        </ul>

        <h2>Variations</h2>
        <ul>
          <li><strong>Mixed Team Americano:</strong> Fixed cross-group pairs (e.g., one man + one woman per team). Combines the structure of team play with mixed-gender pairing rules.</li>
          <li><strong>Team Mexicano:</strong> Fixed pairs like Team Americano, but opponents are assigned based on current standings rather than randomly. Top teams face top teams for tighter competition.</li>
        </ul>

        <h2>Tips for Organizers</h2>
        <ul>
          <li><strong>Balance teams if possible.</strong> Pair a stronger player with a weaker one to keep the tournament competitive and fair.</li>
          <li><strong>Use 5+ rounds</strong> for fair standings. Fewer rounds means more luck involved.</li>
          <li><strong>16 points per match</strong> keeps games around 15 minutes — enough time for strategy without dragging.</li>
          <li><strong>Let the app handle opponent rotation.</strong> Manual scheduling is tedious and error-prone with more than 4 teams.</li>
          <li><strong>Consider a round-robin finish.</strong> If time allows, ensure every team plays every other team at least once for the fairest result.</li>
          <li><strong>End with the awards ceremony.</strong> Even in team formats, the automated awards make the ending memorable.</li>
        </ul>

        <div className={styles.cta}>
          <p>Run a Team Americano tournament — no signup required.</p>
          <a className={styles.ctaButton} href="/play">Start Team Americano Now →</a>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
