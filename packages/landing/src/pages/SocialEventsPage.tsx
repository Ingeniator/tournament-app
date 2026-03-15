import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function SocialEventsPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>Social Padel Event Ideas</h1>
        <p className={styles.lead}>
          The best padel events aren't just about competition — they're about connection. Here are proven formats and ideas that make every event memorable.
        </p>

        <h2>10 Event Ideas That Work</h2>

        <h3>1. After-Work Americano</h3>
        <p>
          Quick 2-hour event after work. <a href="/americano">Americano format</a> with 16 points per match keeps games fast and social. Enable <a href="/maldiciones">Maldiciones</a> (curse cards) for laughs — nothing bonds colleagues like playing a point with your non-dominant hand. This is the perfect weekly ritual for a padel group.
        </p>

        <h3>2. Couples Tournament</h3>
        <p>
          <a href="/team-americano">Team Americano</a> with mixed pairs — each couple plays as a fixed team. Partners stay together through every round, competing against other couples. Great date night activity that's active, social, and gives everyone something to talk about afterwards. Works best with 4-8 couples.
        </p>

        <h3>3. Welcome Event for New Members</h3>
        <p>
          Use Americano so everyone plays with everyone. The rotating partners naturally introduce new members to existing ones — no awkward icebreakers needed. Keep points low (16 per match) for fast rotation and more partner variety. The best way to integrate newcomers into your club.
        </p>

        <h3>4. Monthly Club Championship</h3>
        <p>
          <a href="/mexicano">Mexicano format</a> for competitive standings where top players face top players. Track results across sessions with Club mode to build a season-long leaderboard. Players stay engaged month after month when there's a running championship to compete in.
        </p>

        <h3>5. Corporate Team Building</h3>
        <p>
          Americano with <a href="/maldiciones">Maldiciones</a> enabled is the ultimate team building format. Random partner rotation forces people out of their usual cliques. Curse cards add hilarious chaos that even non-padel players love — "play this point sitting down" levels every playing field. End with the <a href="/awards">awards ceremony</a> for a memorable finish.
        </p>

        <h3>6. Inter-Club Challenge</h3>
        <p>
          <a href="/team-americano">Team Americano</a> where each club sends 4-8 players as fixed pairs. Club standings are the sum of all pairs' points, creating genuine team rivalry. Rotate hosting between clubs monthly. See our full <a href="/inter-club">inter-club guide</a> for logistics and scoring details.
        </p>

        <h3>7. Season Finale / Year-End Bash</h3>
        <p>
          Make it a full-day event with multiple stages: start with <a href="/king-of-the-court">King of the Court</a> as a warm-up (fast, high-energy, gets everyone moving), then run a <a href="/mexicano">Mexicano</a> main event for the competitive climax, and finish with a proper awards ceremony plus drinks. Budget 4-5 hours total.
        </p>

        <h3>8. Charity Tournament</h3>
        <p>
          Americano is the simplest format to explain to all skill levels — important when you want maximum participation. Charge an entry fee that goes to the chosen charity. The awards ceremony creates natural photo opportunities for social media promotion. Keep it social: 16-24 points per match, and let the cause be the focus.
        </p>

        <h3>9. Mixed Gender Night</h3>
        <p>
          Mixicano format guarantees every team has one player from each group. This levels the playing field naturally and creates team combinations that wouldn't happen organically. Works especially well for clubs where men and women don't often play together.
        </p>

        <h3>10. Padel & Brunch / Padel & BBQ</h3>
        <p>
          Short tournament (5 rounds, 16 points per match) followed by social time. The tournament is the appetizer — it gives the group a shared experience to bond over during the meal. Budget 1.5 hours for play, then as long as you want for the social part. Works beautifully on weekends.
        </p>

        <h2>Making Any Event Memorable</h2>
        <p>Three things that elevate any padel event from "fine" to "when's the next one?":</p>
        <ul>
          <li>
            <strong>Enable Maldiciones (curse cards)</strong> — random challenges during play that create stories and inside jokes. Even serious players secretly love them. <a href="/maldiciones">See all curse cards</a>.
          </li>
          <li>
            <strong>Always do the awards ceremony</strong> — with 41 automatically computed awards, practically everyone gets recognized for something. It's the most shared moment of any event. <a href="/awards">See all awards</a>.
          </li>
          <li>
            <strong>Use a themed skin</strong> — match the visual style to your event's vibe. A small touch that shows you put thought into the experience.
          </li>
        </ul>

        <h2>Choosing the Right Format for Your Event</h2>
        <p>
          Not sure which format fits your event? The short version: <a href="/americano">Americano</a> for social mixing, <a href="/mexicano">Mexicano</a> for competition, <a href="/team-americano">Team Americano</a> for fixed pairs, and <a href="/king-of-the-court">King of the Court</a> for high energy. For a detailed comparison with recommendations by event type, see our <a href="/which-format">format picker guide</a>.
        </p>

        <div className={styles.cta}>
          <p>Plan your next social event — set up the tournament in 30 seconds.</p>
          <a className={styles.ctaButton} href="/plan">Plan Your Event →</a>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
