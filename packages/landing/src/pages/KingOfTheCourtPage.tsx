import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function KingOfTheCourtPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>King of the Court — Padel's Most Exciting Format</h1>
        <p className={styles.lead}>
          King of the Court is a fast-paced elimination-style format where the winning team stays on court and the losing team rotates out. It's intense, unpredictable, and perfect for high-energy events.
        </p>

        <h2>What is King of the Court?</h2>
        <p>
          In King of the Court, two teams play a short match. The winners hold the court and face a new challenger — the next team waiting in the queue. The losers go to the back of the line. It's simple: win and stay, lose and wait. This creates natural drama, streaks, and underdog moments that keep everyone engaged.
        </p>

        <h2>What You Need</h2>
        <ul>
          <li><strong>Players:</strong> 6 or more (3+ teams of 2). Works with odd numbers too!</li>
          <li><strong>Courts:</strong> 1 court is all you need. Multiple courts work for larger groups.</li>
          <li><strong>Scoring method:</strong> A way to track cumulative points — PadelDay handles this automatically.</li>
        </ul>

        <h2>How It Works — Step by Step</h2>
        <ol>
          <li><strong>Form teams and set up the queue.</strong> Split players into pairs. Two teams start on court, the rest line up in a queue.</li>
          <li><strong>Play a short match.</strong> Each match is played to a low point total — typically 7, 9, or 11 points. Short matches keep the pace fast.</li>
          <li><strong>Winners stay on court.</strong> The winning team holds the court and prepares to face the next challenger.</li>
          <li><strong>Losers go to the back of the queue.</strong> The losing team steps off and joins the end of the waiting line.</li>
          <li><strong>Next team steps on.</strong> The first team in the queue enters the court to challenge the reigning team.</li>
          <li><strong>Repeat until time is up.</strong> Continue rotating until you reach a time limit, point target, or set number of matches.</li>
          <li><strong>Highest cumulative score wins.</strong> The team or player with the most total points across all matches takes the crown.</li>
        </ol>

        <h2>Scoring Options</h2>
        <p>
          King of the Court supports several scoring approaches, depending on how competitive you want it:
        </p>
        <ul>
          <li><strong>Points per win:</strong> The winning team earns a fixed reward (e.g., 3 points) regardless of the match score. Simple and clean.</li>
          <li><strong>Points from match:</strong> Each team keeps the points they scored during the match. A 9–7 loss still earns 7 points. Rewards competitive play even in defeat.</li>
          <li><strong>Streak bonuses:</strong> Bonus points for consecutive wins on court. Holding the court for 3+ matches in a row earns extra rewards, adding pressure to dethrone the king.</li>
        </ul>

        <h2>Why Players Love It</h2>
        <ul>
          <li><strong>No downtime.</strong> Matches are short and the queue moves fast. You're always either playing or about to play.</li>
          <li><strong>Natural drama.</strong> Can the reigning team hold the court? Will the next challengers pull off an upset? Every match has stakes.</li>
          <li><strong>Underdog moments.</strong> A fresh team from the queue often has an energy advantage over a tired team that's been winning. Upsets happen naturally.</li>
          <li><strong>Simple to understand.</strong> Win and stay, lose and go. Everyone gets it immediately — no complex bracket explanations needed.</li>
          <li><strong>Flexible duration.</strong> Play for 30 minutes or 2 hours. Stop whenever you want and check the standings.</li>
        </ul>

        <h2>When to Use King of the Court</h2>
        <ul>
          <li><strong>Warm-up before a main tournament.</strong> Get everyone loose and energized before switching to Americano or Mexicano.</li>
          <li><strong>Uneven player count.</strong> Odd numbers work perfectly — no one sits out permanently, they just wait in the queue.</li>
          <li><strong>High-energy social events.</strong> The fast pace and constant rotation keep the vibe up. Great for club nights and social gatherings.</li>
          <li><strong>Quick format when time is limited.</strong> Only have 30–45 minutes? King of the Court fills any time slot perfectly.</li>
          <li><strong>Mixed skill levels.</strong> Upsets happen naturally. A weaker team with fresh legs can beat a stronger team that's been grinding on court.</li>
        </ul>

        <h2>King of the Court vs Americano</h2>
        <p>
          Both are social formats, but the energy is completely different. <a href="/americano">Americano</a> gives every player equal playing time with rotating partners — it's fair, balanced, and great for longer sessions. King of the Court is winner-takes-all intensity: you earn your court time by winning. Choose Americano when fairness matters most; choose King of the Court when you want raw energy and excitement.
        </p>

        <h2>Tips for Organizers</h2>
        <ul>
          <li><strong>Keep matches short (7–11 points).</strong> The magic of King of the Court is the pace. Long matches kill the energy and leave the queue waiting too long.</li>
          <li><strong>Manage the queue.</strong> Make sure the next team is ready to step on immediately when a match ends. Zero downtime between matches is the goal.</li>
          <li><strong>Use it as part of a longer event.</strong> Start with 30 minutes of King of the Court to warm up, then transition into a full Americano or Mexicano tournament.</li>
          <li><strong>Set a clear end condition.</strong> Either a time limit ("we play for 45 minutes") or a point target ("first team to 50 points"). This keeps things focused.</li>
          <li><strong>Let PadelDay track everything.</strong> Manual scorekeeping gets messy fast with rapid rotation. The app tracks scores, streaks, and standings automatically.</li>
        </ul>

        <div className={styles.cta}>
          <p>Run King of the Court in seconds — no signup required.</p>
          <a className={styles.ctaButton} href="/play">Run King of the Court Now →</a>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
