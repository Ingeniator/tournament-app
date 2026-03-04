import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

const legendaryAwards = [
  { emoji: '⭐', name: 'Undefeated', criteria: 'Won every single match' },
  { emoji: '⚔️', name: 'Giant Slayer', criteria: 'Beat the #1 player while ranked #4 or lower' },
  { emoji: '👑', name: 'Comeback King', criteria: 'Strongest finish after a rough start — 30%+ improvement in second half' },
  { emoji: '😈', name: 'Nemesis', criteria: 'Beat the same opponent 3+ times with 0 losses' },
  { emoji: '🐺', name: 'Underdog', criteria: 'Bottom half of standings but top half in win rate' },
];

const rareAwards = [
  { emoji: '🔥', name: 'Dominator', criteria: '3+ wins in a row — longest winning streak' },
  { emoji: '🧊', name: 'Clutch Player', criteria: 'Best win rate in close games' },
  { emoji: '🛡️', name: 'Iron Wall', criteria: 'Fewest points conceded per game' },
  { emoji: '🎯', name: 'Consistency Champion', criteria: 'Most steady performance — smallest score variance' },
  { emoji: '🚧', name: 'Gatekeeper', criteria: 'Beat everyone below, lost to everyone above' },
  { emoji: '🤝', name: 'Best Duo', criteria: 'Highest win rate as a pair (2+ matches together)' },
  { emoji: '🔥', name: 'Hot Streak Duo', criteria: 'Longest winning run as a pair — 3+ wins in a row' },
  { emoji: '🥈', name: 'Nearly There', criteria: 'Finished 2nd — within 10 points of the winner' },
  { emoji: '🧗', name: 'Court Climber', criteria: 'Most court promotions (King of the Court)' },
  { emoji: '⭐', name: 'Club MVP', criteria: 'Top points contributor for their club' },
  { emoji: '⚔️', name: 'Club Rivalry', criteria: 'Closest battle between two clubs' },
];

const commonAwards = [
  { emoji: '💥', name: 'Point Machine', criteria: 'Most total points scored (non-champion)' },
  { emoji: '⚡', name: 'Quick Strike', criteria: 'Largest single-game victory margin' },
  { emoji: '⚖️', name: 'See-Saw Specialist', criteria: 'Most close games played (2+)' },
  { emoji: '🔥', name: 'Instant Classic', criteria: 'Players in the closest game of the tournament' },
  { emoji: '🛡️', name: 'Battle Tested', criteria: 'Most close games lost — every match was a fight' },
  { emoji: '💪', name: 'Warrior', criteria: 'Most games played (when some players played more)' },
  { emoji: '💣', name: 'Offensive Powerhouse', criteria: 'Highest scoring average per game' },
  { emoji: '🚀', name: 'Offensive Duo', criteria: 'Highest scoring pair per game' },
  { emoji: '🏰', name: 'Defensive Duo', criteria: 'Tightest defense as a pair — lowest points conceded' },
  { emoji: '🔄', name: 'Rubber Match', criteria: 'Split results with a pair — who really wins?' },
  { emoji: '🕊️', name: 'Peacemaker', criteria: '2+ drawn matches — nobody wins, nobody loses' },
  { emoji: '🦋', name: 'Social Butterfly', criteria: 'Played with the most different partners' },
  { emoji: '🤝', name: 'Club Solidarity', criteria: 'Most balanced contributions within a club' },
];

const maldicionesAwards = [
  { emoji: '🦠', name: 'El Inmune', criteria: '3+ consecutive wins while cursed' },
  { emoji: '🧙', name: 'El Brujo', criteria: 'Master of curses — 2+ winning curse casts' },
  { emoji: '💪', name: 'El Superviviente', criteria: 'Won 2+ games while cursed' },
  { emoji: '👼', name: 'El Intocable', criteria: 'Never cursed — 3+ games, 0 curses received' },
  { emoji: '🦾', name: 'El Resistente', criteria: 'Best win rate while cursed' },
  { emoji: '🛡️', name: 'Escudo de Oro', criteria: '1+ successful shield blocks' },
  { emoji: '☠️', name: 'El Maldito', criteria: 'Most curses received (2+)' },
  { emoji: '🔄', name: 'Karma', criteria: 'Cast 2+ curses but lost the match — backfire!' },
];

function TierSection({ label, tierClass, awards }: { label: string; tierClass: string; awards: typeof legendaryAwards }) {
  return (
    <>
      <div className={styles.tierHeader}>
        <span className={`${styles.badge} ${tierClass}`}>{label}</span>
        <span className={styles.tierLabel}>{awards.length} awards</span>
      </div>
      <div className={styles.cardGrid}>
        {awards.map(a => (
          <div key={a.name} className={styles.card}>
            <div className={styles.cardEmoji}>{a.emoji}</div>
            <div className={styles.cardName}>{a.name}</div>
            <div className={styles.cardDesc}>{a.criteria}</div>
          </div>
        ))}
      </div>
    </>
  );
}

export function AwardsPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>41 Tournament Awards — The Ceremony Everyone Talks About</h1>
        <p className={styles.lead}>
          Every tournament ends with an awards ceremony. 41 automatically computed awards across 3 tiers — revealed one by one with a tap-to-reveal animation. It's the highlight of every event.
        </p>

        <h2>How It Works</h2>
        <p>
          Awards are computed automatically from match data — no manual judging needed. After the final match, tap "Start Ceremony" to begin the reveal. Awards are grouped by tier:
        </p>
        <ul>
          <li><strong>Common</strong> — Participation and statistical awards. Many players earn these.</li>
          <li><strong>Rare</strong> — Harder to earn. Streaks, clutch performances, dominant duos.</li>
          <li><strong>Legendary</strong> — The rarest achievements. Undefeated runs, giant-killing, epic comebacks.</li>
        </ul>
        <p>
          Each award is revealed with the recipient's name, creating a moment of anticipation. The ceremony typically takes 5–10 minutes and is the most memorable part of any tournament.
        </p>

        <h2>Award Categories</h2>

        <TierSection label="Legendary" tierClass={styles.badgeLegendary} awards={legendaryAwards} />
        <TierSection label="Rare" tierClass={styles.badgeRare} awards={rareAwards} />
        <TierSection label="Common" tierClass={styles.badgeCommon} awards={commonAwards} />

        <h2>Maldiciones Awards</h2>
        <p>
          When playing with <a href="/maldiciones">Maldiciones (Curse Cards)</a> enabled, 8 additional awards become available. These only appear in tournaments with curse cards active.
        </p>
        <div className={styles.cardGrid}>
          {maldicionesAwards.map(a => (
            <div key={a.name} className={styles.card}>
              <div className={styles.cardEmoji}>{a.emoji}</div>
              <div className={styles.cardName}>{a.name}</div>
              <div className={styles.cardDesc}>{a.criteria}</div>
            </div>
          ))}
        </div>

        <h2>Format-Specific Awards</h2>
        <p>
          Some awards only appear in certain formats. Court Climber requires King of the Court. Club MVP and Club Solidarity require Club formats. The app automatically shows only relevant awards for your chosen format.
        </p>

        <div className={styles.cta}>
          <p>See who wins what — run a tournament and start the ceremony.</p>
          <a className={styles.ctaButton} href="/play">Start a Tournament →</a>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
