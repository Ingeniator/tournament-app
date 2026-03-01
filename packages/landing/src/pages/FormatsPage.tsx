import { useState, useEffect } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

const formats = [
  { name: 'Americano', category: 'Social', emoji: '🎾', desc: 'Random rotating partners and opponents. Every round you get a new partner, keeping things social and unpredictable. Individual standings.', bestFor: 'Social events, large groups, beginners' },
  { name: 'Mixed Americano', category: 'Social', emoji: '🔀', desc: 'Like Americano but each pair must have one player from each group (e.g., men & women). Cross-group random partners with individual standings.', bestFor: 'Mixed-gender events, balanced teams' },
  { name: 'Mexicano', category: 'Competitive', emoji: '🏆', desc: 'Rotating partners with standings-based opponents. After round 1, top players are paired with bottom players, and matchups are based on current rankings. Keeps every match competitive.', bestFor: 'Competitive groups, skill-balanced matches' },
  { name: 'Mixicano', category: 'Competitive', emoji: '⚡', desc: 'Combines cross-group pairing (one player from each group) with standings-based opponents. The competitive version of Mixed Americano.', bestFor: 'Competitive mixed-gender events' },
  { name: 'King of the Court', category: 'Competitive', emoji: '👑', desc: 'Court hierarchy system. Winners get promoted to higher courts, losers move down. Bonus points for winning on top courts. Rotating partners.', bestFor: 'Multi-court clubs, ranking battles' },
  { name: 'Team Americano', category: 'Team', emoji: '🤝', desc: 'Fixed partner pairs throughout the tournament with random opponents. Team standings — you win or lose together.', bestFor: 'Established pairs, team bonding' },
  { name: 'Team Mexicano', category: 'Team', emoji: '🔥', desc: 'Fixed teams with standings-based opponent matching. The most competitive team format — top teams face top teams.', bestFor: 'Serious pair competition' },
  { name: 'Club Americano', category: 'Club', emoji: '🎾', desc: 'Inter-club competition with rotating partners and random opponents. Players rotate within their club each round. Individual standings.', bestFor: 'Social inter-club events' },
  { name: 'Club Mexicano', category: 'Club', emoji: '📊', desc: 'Inter-club competition with rotating partners and standings-based opponents. The competitive version — top players face top players across clubs.', bestFor: 'Competitive inter-club events' },
  { name: 'Club Ranked', category: 'Club', emoji: '🏟️', desc: 'Inter-club competition with fixed pairs and positional matchups. Pair #1 always faces Pair #1 from the opposing club. Structured league play.', bestFor: 'Club leagues, formal brackets' },
  { name: 'Club Team Americano', category: 'Club', emoji: '🎲', desc: 'Inter-club competition with fixed pairs and randomized matchups. Partners stay together, but which pair you face is shuffled each round.', bestFor: 'Casual inter-club team events' },
  { name: 'Club Team Mexicano', category: 'Club', emoji: '🔥', desc: 'Inter-club competition with fixed pairs and standings-based matchups. Top pairs face top pairs. The most competitive club format.', bestFor: 'High-stakes inter-club showdowns' },
];

const categoryStyle = (cat: string) => {
  switch (cat) {
    case 'Social': return styles.badgeSocial;
    case 'Competitive': return styles.badgeCompetitive;
    case 'Team': return styles.badgeTeam;
    case 'Club': return styles.badgeClub;
    default: return styles.badgeCommon;
  }
};

export function FormatsPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  useEffect(() => { document.title = 'Tournament Formats — Complete Guide | PadelDay'; }, []);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>Tournament Formats — Complete Guide</h1>
        <p className={styles.lead}>
          15 tournament formats across 4 categories. Whether you're running a casual social event or a competitive inter-club league, there's a format for you. Many formats also have a cross-group variant for mixed-gender or skill-group play.
        </p>

        <h2>All Formats</h2>
        <div className={styles.cardGrid}>
          {formats.map(f => (
            <div key={f.name} className={styles.card}>
              <div className={styles.cardEmoji}>{f.emoji}</div>
              <div className={styles.cardName}>
                {f.name}
                <span className={`${styles.badge} ${categoryStyle(f.category)}`}>{f.category}</span>
              </div>
              <div className={styles.cardDesc}>{f.desc}</div>
              <div className={styles.cardDesc} style={{ marginTop: 8 }}>
                <strong>Best for:</strong> {f.bestFor}
              </div>
            </div>
          ))}
        </div>

        <h2>Comparison</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Format</th>
              <th>Partners</th>
              <th>Opponents</th>
              <th>Level</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Americano</td><td>Rotating</td><td>Random</td><td>Social</td></tr>
            <tr><td>Mixed Americano</td><td>Rotating (cross-group)</td><td>Random</td><td>Social</td></tr>
            <tr><td>Mexicano</td><td>Rotating</td><td>Standings</td><td>Competitive</td></tr>
            <tr><td>Mixicano</td><td>Rotating (cross-group)</td><td>Standings</td><td>Competitive</td></tr>
            <tr><td>King of the Court</td><td>Rotating</td><td>Court promotion</td><td>Competitive</td></tr>
            <tr><td>Mixed King of the Court</td><td>Rotating (cross-group)</td><td>Court promotion</td><td>Competitive</td></tr>
            <tr><td>Team Americano</td><td>Fixed</td><td>Random</td><td>Team</td></tr>
            <tr><td>Team Mexicano</td><td>Fixed</td><td>Standings</td><td>Team</td></tr>
            <tr><td>Mixed Team Americano</td><td>Fixed (cross-group)</td><td>Random</td><td>Team</td></tr>
            <tr><td>Mixed Team Mexicano</td><td>Fixed (cross-group)</td><td>Standings</td><td>Team</td></tr>
            <tr><td>Club Americano</td><td>Rotating</td><td>Random</td><td>Club</td></tr>
            <tr><td>Club Mexicano</td><td>Rotating</td><td>Standings</td><td>Club</td></tr>
            <tr><td>Club Ranked</td><td>Fixed</td><td>Positional</td><td>Club</td></tr>
            <tr><td>Club Team Americano</td><td>Fixed</td><td>Random</td><td>Club</td></tr>
            <tr><td>Club Team Mexicano</td><td>Fixed</td><td>Standings</td><td>Club</td></tr>
          </tbody>
        </table>

        <h2>Cross-Group Pairing</h2>
        <p>
          Five formats support <strong>cross-group pairing</strong> — every team must include one player from each group (e.g., one man + one woman). Split players into two groups at setup and the algorithm guarantees balanced mixed teams every round.
        </p>
        <ul>
          <li><strong>Mixed Americano</strong> — rotating partners, random opponents</li>
          <li><strong>Mixicano</strong> — rotating partners, standings-based opponents</li>
          <li><strong>Mixed King of the Court</strong> — rotating partners, court promotion</li>
          <li><strong>Mixed Team Americano</strong> — fixed cross-group pairs, random opponents</li>
          <li><strong>Mixed Team Mexicano</strong> — fixed cross-group pairs, standings-based opponents</li>
        </ul>
        <p>
          Cross-group mode works with any group definition — men/women, beginners/advanced, club A/club B. The constraint is simply that each pair on court has exactly one player from each group.
        </p>

        <h2>Which Format Should You Choose?</h2>
        <h3>For Social Events</h3>
        <p>
          <strong>Americano</strong> is the gold standard for social padel. Everyone plays with everyone, and random pairings make it easy to meet new people. If you have distinct groups (like men/women), <strong>Mixed Americano</strong> ensures cross-group pairing.
        </p>
        <p><a href="/americano">Read the full Americano guide →</a></p>

        <h3>For Competitive Play</h3>
        <p>
          <strong>Mexicano</strong> is the most popular competitive format. Standings-based matchups mean top players always face top players, creating tight matches throughout the tournament. <strong>King of the Court</strong> adds a court hierarchy twist. Both have cross-group variants (<strong>Mixicano</strong> and <strong>Mixed King of the Court</strong>) for mixed-gender competition.
        </p>
        <p><a href="/mexicano">Read the full Mexicano guide →</a></p>

        <h3>For Teams</h3>
        <p>
          If pairs are already decided, <strong>Team Americano</strong> (random opponents) or <strong>Team Mexicano</strong> (standings-based opponents) are your best options. Both also support cross-group pairing — <strong>Mixed Team Americano</strong> and <strong>Mixed Team Mexicano</strong> ensure each fixed pair has one player from each group.
        </p>

        <h3>For Clubs</h3>
        <p>
          Club formats support 2+ clubs competing against each other with intra-club fixed pairs and inter-club matchups. Choose slots for structured play, random for variety, or standings for competition.
        </p>
        <p><a href="/club">Read the full Club Formats guide →</a></p>

        <div className={styles.cta}>
          <p>Try any format free — no signup needed.</p>
          <a className={styles.ctaButton} href="/play">Start a Tournament →</a>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
