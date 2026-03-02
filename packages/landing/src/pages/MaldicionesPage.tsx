import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

const greenCards = [
  { emoji: '🤐', name: 'Los Mudos', subtitle: 'No talking', effect: 'Target team cannot communicate verbally during the entire match. Hand signals only!' },
  { emoji: '🪞', name: 'El Espejo', subtitle: 'Swap sides', effect: 'Target player must swap positions with their partner for the whole match.' },
  { emoji: '🐢', name: 'Cámara Lenta', subtitle: 'No smashes', effect: 'Target player cannot hit smashes or overheads during the match.' },
  { emoji: '🤎', name: 'El Pegajoso', subtitle: 'Stay in half', effect: 'Target player must stay on their half of the court — no crossing.' },
  { emoji: '🐟', name: 'Memoria de Pez', subtitle: 'Announce score', effect: 'Target team must say the score out loud before every serve. Forgetting = point penalty!' },
  { emoji: '🤝', name: 'Choca Esos Cinco', subtitle: 'High five always', effect: 'Target team must high-five after every single point, won or lost.' },
];

const yellowCards = [
  { emoji: '✋', name: 'Mano Muerta', subtitle: 'Backhand only', effect: 'Target player can only hit backhands for the entire match. No forehands!' },
  { emoji: '👨‍🤝‍👦', name: 'Gigante y Enano', subtitle: 'Locked positions', effect: 'Target team is locked: one at the net, one at the back. No switching!' },
  { emoji: '👻', name: 'El Fantasma', subtitle: 'No volleys', effect: 'Target player cannot hit volleys at the net. Must let the ball bounce first.' },
  { emoji: '🚫', name: 'Sin Bandeja', subtitle: 'No bandeja shots', effect: 'Target player cannot hit bandeja or vibora shots. Only flat shots or lobs!' },
  { emoji: '↩️', name: 'Solo de Ida', subtitle: 'Underhand serve', effect: 'Target player must serve underhand for the entire match.' },
  { emoji: '🎯', name: 'La Diana', subtitle: 'Alternate hits', effect: 'Target team must alternate shots — the same player cannot hit two consecutive balls.' },
];

const redCards = [
  { emoji: '🧑', name: 'El Solo', subtitle: '1v2 start', effect: 'Target player\'s partner must sit out the first 3 points. 1v2 to start!' },
  { emoji: '🔄', name: 'Al Revés', subtitle: 'Wrong hand', effect: 'Target player must play with their non-dominant hand for the entire match.' },
  { emoji: '🎡', name: 'La Ruleta', subtitle: 'Rotate positions', effect: 'Target team must physically rotate positions clockwise every 3 points.' },
  { emoji: '🎾', name: 'Mini Pala', subtitle: 'Short grip', effect: 'Target player must grip the racket by the head (short grip) for the entire match.' },
  { emoji: '⚡', name: 'Relámpago', subtitle: '2-point handicap', effect: 'Casting team gives opponents a 2-point head start. High risk, high reward!' },
];

function CardSection({ title, color, cards }: { title: string; color: string; cards: typeof greenCards }) {
  return (
    <>
      <h3>{title} <span style={{ fontSize: '0.8em', color: 'var(--color-text-muted)' }}>({cards.length} cards)</span></h3>
      <div className={styles.cardGrid}>
        {cards.map(c => (
          <div key={c.name} className={styles.card} style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
            <div className={styles.cardEmoji}>{c.emoji}</div>
            <div className={styles.cardName}>{c.name}</div>
            <div className={styles.cardDesc}>{c.subtitle}</div>
            <div className={styles.curseEffect}>{c.effect}</div>
          </div>
        ))}
      </div>
    </>
  );
}

export function MaldicionesPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/">← Tournament Manager</a>
      </nav>
      <article className={styles.article}>
        <h1>Maldiciones del Padel — Curse Cards Party Mode</h1>
        <p className={styles.lead}>
          Add chaos to your tournament with 17 curse cards across 3 difficulty tiers. Before each match, the winning team from the previous round can cast a curse on their opponents — adding hilarious constraints that change how padel is played.
        </p>

        <h2>What Are Maldiciones?</h2>
        <p>
          Maldiciones ("curses" in Spanish) is an optional party mode that adds curse cards to any tournament format. After winning a match, the winning team draws a random curse card and can cast it on their next opponents. Curses add physical or strategic constraints — like playing backhand-only, not being allowed to talk, or starting 1v2.
        </p>

        <h2>3 Chaos Levels</h2>
        <p>Choose your chaos level at tournament setup:</p>
        <ul>
          <li><strong>Lite</strong> — Green cards only (6 cards). Fun but mild constraints.</li>
          <li><strong>Medium</strong> — Green + Yellow (12 cards). Real challenge, great for regular groups.</li>
          <li><strong>Hardcore</strong> — All 17 cards including Red. Absolute chaos. Not for the faint-hearted.</li>
        </ul>

        <h2>Card Catalog</h2>

        <CardSection title="Green — Lite" color="var(--color-success)" cards={greenCards} />
        <CardSection title="Yellow — Medium" color="var(--color-warning)" cards={yellowCards} />
        <CardSection title="Red — Hardcore" color="var(--color-danger)" cards={redCards} />

        <h2>Shield Mechanic</h2>
        <p>
          When a curse is cast on you, you get one chance to block it with a <strong>shield</strong>. Each team starts with one shield per tournament. Using it cancels the curse — but you won't have it for next time. Strategic shield management is part of the fun.
        </p>

        <h2>Maldiciones Awards</h2>
        <p>
          Playing with Maldiciones unlocks special <a href="/awards">awards</a>:
        </p>
        <ul>
          <li><strong>🧙 El Brujo</strong> — Master of curses (2+ winning curse casts)</li>
          <li><strong>💪 El Superviviente</strong> — Won 2+ games while cursed</li>
          <li><strong>🦠 El Inmune</strong> — 3+ consecutive cursed wins (Legendary!)</li>
          <li><strong>👼 El Intocable</strong> — Never cursed the entire tournament</li>
          <li><strong>🦾 El Resistente</strong> — Best win rate while cursed</li>
          <li><strong>🛡️ Escudo de Oro</strong> — Successfully blocked a curse</li>
          <li><strong>☠️ El Maldito</strong> — Most cursed pair (2+ curses)</li>
          <li><strong>🔄 Karma</strong> — Cast curses that backfired (lost after cursing)</li>
        </ul>

        <div className={styles.cta}>
          <p>Add curse cards to your next tournament — no signup needed.</p>
          <a className={styles.ctaButton} href="/play">Start with Maldiciones →</a>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
