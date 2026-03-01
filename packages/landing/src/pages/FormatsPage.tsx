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
  { name: 'Club Americano (Slots)', category: 'Club', emoji: '🏟️', desc: 'Inter-club competition with fixed positional matchups. Slot 1 always faces Slot 1 from the opposing club. Perfect for structured league play.', bestFor: 'Club leagues, structured competition' },
  { name: 'Club Americano (Random)', category: 'Club', emoji: '🎲', desc: 'Inter-club competition with randomized pair matchups. Same club format but with more variety in who faces whom.', bestFor: 'Club social events' },
  { name: 'Club Mexicano', category: 'Club', emoji: '📊', desc: 'Inter-club competition with standings-based matchups. The most competitive club format — top pairs face top pairs across clubs.', bestFor: 'Competitive inter-club events' },
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
          Choose from 10 tournament configurations across 4 categories. Whether you're running a casual social event or a competitive inter-club league, there's a format for you.
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
            <tr><td>Team Americano</td><td>Fixed</td><td>Random</td><td>Team</td></tr>
            <tr><td>Team Mexicano</td><td>Fixed</td><td>Standings</td><td>Team</td></tr>
            <tr><td>Club (Slots)</td><td>Fixed</td><td>Positional</td><td>Club</td></tr>
            <tr><td>Club (Random)</td><td>Fixed</td><td>Random</td><td>Club</td></tr>
            <tr><td>Club (Mexicano)</td><td>Fixed</td><td>Standings</td><td>Club</td></tr>
          </tbody>
        </table>

        <h2>Which Format Should You Choose?</h2>
        <h3>For Social Events</h3>
        <p>
          <strong>Americano</strong> is the gold standard for social padel. Everyone plays with everyone, and random pairings make it easy to meet new people. If you have distinct groups (like men/women), <strong>Mixed Americano</strong> ensures cross-group pairing.
        </p>
        <p><a href="/americano">Read the full Americano guide →</a></p>

        <h3>For Competitive Play</h3>
        <p>
          <strong>Mexicano</strong> is the most popular competitive format. Standings-based matchups mean top players always face top players, creating tight matches throughout the tournament. <strong>King of the Court</strong> adds a court hierarchy twist.
        </p>
        <p><a href="/mexicano">Read the full Mexicano guide →</a></p>

        <h3>For Teams</h3>
        <p>
          If pairs are already decided, <strong>Team Americano</strong> (random opponents) or <strong>Team Mexicano</strong> (standings-based opponents) are your best options.
        </p>

        <h3>For Clubs</h3>
        <p>
          Club formats support 2+ clubs competing against each other with intra-club fixed pairs and inter-club matchups. Choose slots for structured play, random for variety, or standings for competition.
        </p>

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
