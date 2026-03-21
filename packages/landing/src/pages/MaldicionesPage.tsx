import { useState } from 'react';
import { AppFooter, FeedbackModal, CURSE_CARD_CONTENT } from '@padel/common';
import styles from './Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

const greenCards = CURSE_CARD_CONTENT.filter(c => c.tier === 'green');
const yellowCards = CURSE_CARD_CONTENT.filter(c => c.tier === 'yellow');
const redCards = CURSE_CARD_CONTENT.filter(c => c.tier === 'red');

function CardSection({ title, color, cards }: { title: string; color: string; cards: typeof greenCards }) {
  return (
    <>
      <h3>{title} <span style={{ fontSize: '0.8em', color: 'var(--color-text-muted)' }}>({cards.length} cards)</span></h3>
      <div className={styles.cardGrid}>
        {cards.map(c => (
          <div key={c.name} className={styles.card} style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
            <div className={styles.cardEmoji}>{c.emoji}</div>
            <div className={styles.cardName}>{c.name}</div>
            <div className={styles.cardDesc}>{c.attitude}</div>
            <div className={styles.curseEffect}>{c.howItWorks}</div>
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
          Add chaos to your tournament with 18 curse cards across 3 difficulty tiers. Each team receives a hand of cards at the start and can cast one curse per match to disrupt their opponents — adding hilarious constraints that change how padel is played.
        </p>

        <h2>What Are Maldiciones?</h2>
        <p>
          Maldiciones ("curses" in Spanish) is an optional party mode that adds curse cards to any tournament format. At tournament start, each team is dealt a hand of random curse cards. Before any match is scored, a team can play one card to impose a physical or strategic constraint on an opponent — like playing backhand-only, not being allowed to talk, or having points count double against you. Each team also gets one shield to block a curse, making shield management part of the strategy.
        </p>

        <h2>3 Chaos Levels</h2>
        <p>Choose your chaos level at tournament setup:</p>
        <ul>
          <li><strong>Lite</strong> — Green cards only (6 cards). Fun but mild constraints.</li>
          <li><strong>Medium</strong> — Green + Yellow (12 cards). Real challenge, great for regular groups.</li>
          <li><strong>Hardcore</strong> — All 18 cards including Red. Absolute chaos. Not for the faint-hearted.</li>
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

        <h2>Print & Play</h2>
        <p>
          Want physical cards for your tournament? Print our ready-to-cut card templates and bring Maldiciones to the court as a real board game. Each card includes the emoji, name, tier color, and effect — just print, cut, and deal.
        </p>
        <p>
          <a className={styles.ctaButton} href="/maldiciones/print">Print Card Templates →</a>
        </p>

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
