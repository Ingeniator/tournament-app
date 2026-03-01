import { useState, useEffect } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function ClubPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  useEffect(() => { document.title = 'Club Tournament Formats — Inter-Club Padel Competition | PadelDay'; }, []);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>Club Tournament Formats — Inter-Club Padel Competition</h1>
        <p className={styles.lead}>
          Club formats let two or more clubs compete against each other in a structured tournament. Players form fixed pairs within their club and face pairs from other clubs across multiple rounds.
        </p>

        <h2>What Are Club Formats?</h2>
        <p>
          In a club tournament, players are organized by club. Each club fields pairs (teams of 2) that play against pairs from other clubs in a round-robin. Standings are tracked at two levels: individual pair standings and aggregate club standings.
        </p>
        <p>
          This makes club formats ideal for inter-club leagues, friendly club matchups, and any event where you want to answer the question: <em>which club is better?</em>
        </p>

        <h2>What You Need</h2>
        <ul>
          <li><strong>Clubs:</strong> 2 or more. Each club needs a name.</li>
          <li><strong>Players per club:</strong> At least 4 (2 pairs). Must be an even number.</li>
          <li><strong>Courts:</strong> 1 court per pair matchup. 2 clubs with 2 pairs each = 2 courts.</li>
          <li><strong>Points per match:</strong> Same as other formats — typically 16, 24, or 32.</li>
        </ul>

        <h2>3 Club Formats</h2>
        <p>
          The three club formats share the same structure but differ in how pairs are matched across clubs. Choose based on how competitive you want the matchups to be.
        </p>

        <h3>Club Ranked (Slots)</h3>
        <p>
          Positional matchups. Pair #1 from Club A always faces Pair #1 from Club B, Pair #2 vs Pair #2, and so on. This is the most structured format — the best pair from each club always plays the best pair from the other club.
        </p>
        <ul>
          <li>Schedule is generated upfront (all rounds known in advance)</li>
          <li>Deterministic — same setup always produces the same matchups</li>
          <li>Best for: formal league play, ranked inter-club competitions</li>
        </ul>

        <h3>Club Team Americano (Random)</h3>
        <p>
          Random matchups. Pairs from opposing clubs are shuffled each round, so Pair #1 from Club A might face Pair #3 from Club B, then Pair #1 from Club B next round. More variety, less predictability.
        </p>
        <ul>
          <li>Schedule is generated upfront with randomized pair assignments</li>
          <li>Different shuffle = different experience every time</li>
          <li>Best for: social inter-club events, casual club matchups</li>
        </ul>

        <h3>Club Team Mexicano (Standings)</h3>
        <p>
          Standings-based matchups. After round 1 (which is random), pairs are ranked by points. The top pair from Club A faces the top pair from Club B, the second-best pair vs second-best, and so on. This creates the most competitive matches.
        </p>
        <ul>
          <li>Dynamic schedule — only the next round is generated based on current standings</li>
          <li>Every round gets more competitive as pairs are sorted by performance</li>
          <li>Best for: competitive inter-club showdowns, high-stakes events</li>
        </ul>

        <h2>Comparison</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Ranked</th>
              <th>Random</th>
              <th>Standings</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Matchup logic</td><td>Position-based</td><td>Shuffled</td><td>Points-based</td></tr>
            <tr><td>Schedule</td><td>Static</td><td>Static</td><td>Dynamic</td></tr>
            <tr><td>Best pair vs best pair?</td><td>Always</td><td>Sometimes</td><td>After round 1</td></tr>
            <tr><td>Competitiveness</td><td>Medium</td><td>Low</td><td>High</td></tr>
            <tr><td>Surprise factor</td><td>Low</td><td>High</td><td>Medium</td></tr>
          </tbody>
        </table>

        <h2>How Rounds Work</h2>
        <p>
          Clubs play each other in a round-robin. With 2 clubs, every round is Club A vs Club B. With 3 clubs, one club sits out each round (bye). With 4 clubs, each round has 2 matchups running simultaneously.
        </p>
        <p>
          Within each club matchup, all pairs from both clubs play. If Club A has 3 pairs and Club B has 3 pairs, that's 3 matches per round — one per pair pairing. Courts are assigned automatically.
        </p>

        <h2>Standings</h2>
        <p>
          Club formats track <strong>two levels of standings</strong>:
        </p>
        <ul>
          <li><strong>Pair standings:</strong> Each pair accumulates points from their matches. Ranked by total points, then point differential, then wins.</li>
          <li><strong>Club standings:</strong> Each club's total is the sum of all its pairs' points. The club with the most points wins the tournament.</li>
        </ul>
        <p>
          If a pair sits out a round (because of a bye or uneven club sizes), they receive <strong>compensation points</strong> equal to the average points scored that round. This keeps standings fair regardless of schedule imbalances.
        </p>

        <h2>Club Awards</h2>
        <p>
          Club tournaments unlock 4 special <a href="/awards">awards</a>:
        </p>
        <ul>
          <li><strong>Club Champion</strong> — the winning club</li>
          <li><strong>Club Rivalry</strong> — two clubs with the closest final scores</li>
          <li><strong>Club MVP</strong> — the pair that contributed the highest percentage of their club's points</li>
          <li><strong>Club Solidarity</strong> — the club with the most balanced performance across all its pairs</li>
        </ul>

        <h2>Tips for Organizers</h2>
        <ul>
          <li><strong>Equal club sizes work best.</strong> Uneven sizes work fine (sit-outs get compensation), but equal numbers feel fairest.</li>
          <li><strong>Use Club Ranked for formal events</strong> where seeding matters — top pairs should face top pairs.</li>
          <li><strong>Use Club Team Americano for fun</strong> — the randomness creates surprises and keeps it social.</li>
          <li><strong>Use Club Team Mexicano for drama</strong> — standings-based matchups make every round tighter as the tournament progresses.</li>
          <li><strong>3+ clubs?</strong> The round-robin handles any number. Bye rounds are managed automatically.</li>
        </ul>

        <h2>When to Use Club Formats</h2>
        <ul>
          <li>Inter-club leagues and tournaments</li>
          <li>Club championship events (Club A vs Club B)</li>
          <li>Friendly matches between groups of friends</li>
          <li>Any event where team identity matters beyond individual performance</li>
        </ul>
        <p>
          If you don't need the club structure, consider <a href="/americano">Americano</a> (social) or <a href="/mexicano">Mexicano</a> (competitive) for individual play, or Team Americano / Team Mexicano for fixed pairs without club affiliation. See the <a href="/formats">full format comparison</a> for all 15 options.
        </p>

        <div className={styles.cta}>
          <p>Run a club tournament — organize your next inter-club event in seconds.</p>
          <a className={styles.ctaButton} href="/play">Start Club Tournament →</a>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
