import styles from './MaldicionesPrintPage.module.css';

interface CardData {
  emoji: string;
  name: string;
  subtitle: string;
  effect: string;
}

const greenCards: CardData[] = [
  { emoji: '🤐', name: 'Los Mudos', subtitle: 'Silent Round', effect: 'No talking allowed. Communicate using gestures only.' },
  { emoji: '🪞', name: 'El Espejo', subtitle: 'Mirror Match', effect: 'Swap positions with your partner for the whole match.' },
  { emoji: '🐢', name: 'Cámara Lenta', subtitle: 'Slow Motion', effect: 'No smashes or overheads allowed.' },
  { emoji: '🦠', name: 'El Pegajoso', subtitle: 'Stuck in Place', effect: 'Stay on your half of the court. No crossing.' },
  { emoji: '🐟', name: 'Memoria de Pez', subtitle: 'Goldfish Memory', effect: 'Say the score before every serve. Forget = penalty point!' },
  { emoji: '🤝', name: 'Choca Esos Cinco', subtitle: 'High Five!', effect: 'High-five after every point. Won or lost.' },
];

const yellowCards: CardData[] = [
  { emoji: '✋', name: 'Mano Muerta', subtitle: 'Dead Hand', effect: 'Backhand only. No forehands allowed.' },
  { emoji: '👨‍🤝‍👦', name: 'Gigante y Enano', subtitle: 'Locked Positions', effect: 'One at the net, one at the back. No switching.' },
  { emoji: '👻', name: 'El Fantasma', subtitle: 'The Ghost', effect: 'No volleys at the net. Let the ball bounce first.' },
  { emoji: '🚫', name: 'Sin Bandeja', subtitle: 'No Bandeja', effect: 'No bandeja or vibora. Flat shots or lobs only.' },
  { emoji: '↩️', name: 'Solo de Ida', subtitle: 'One Way Only', effect: 'Underhand serve for the entire match.' },
  { emoji: '🎯', name: 'La Diana', subtitle: 'Alternate Hits', effect: 'Same player cannot hit two balls in a row.' },
];

const redCards: CardData[] = [
  { emoji: '🧑', name: 'El Solo', subtitle: 'The Loner', effect: 'Partner sits out the first 3 points. 1v2!' },
  { emoji: '🔄', name: 'Al Revés', subtitle: 'Wrong Hand', effect: 'Play with your non-dominant hand.' },
  { emoji: '🎡', name: 'La Ruleta', subtitle: 'The Roulette', effect: 'Rotate positions clockwise every 3 points.' },
  { emoji: '🎾', name: 'Mini Pala', subtitle: 'Short Grip', effect: 'Grip the racket by the head.' },
  { emoji: '⚡', name: 'Relámpago', subtitle: 'Lightning', effect: 'Give opponents a 2-point head start!' },
  { emoji: '🎲', name: 'Doble o Nada', subtitle: 'Double or Nothing', effect: 'Points against you count double!' },
];

function PrintCard({ card, tier }: { card: CardData; tier: 'green' | 'yellow' | 'red' }) {
  const tierIcon = tier === 'green' ? styles.tierEmpty : tier === 'yellow' ? styles.tierHalf : styles.tierFull;
  return (
    <div className={styles.card}>
      <div className={styles.cardInner}>
        <div className={styles.cardBanner}>
          {card.name}
          <span className={`${styles.tierIndicator} ${tierIcon}`} />
        </div>
        <div className={styles.cardEmoji}>{card.emoji}</div>
        <div className={styles.cardBottom}>
          <div className={styles.cardSubtitle}>{card.subtitle}</div>
          <div className={styles.cardDivider} />
          <div className={styles.cardEffect}>{card.effect}</div>
        </div>
        <div className={styles.punchZone}>
          <div className={styles.punchRibbon}>PUNCH FEEDBACK HERE</div>
          <div className={styles.punchCircles}>
            <div className={styles.punchCircle}>
              <span className={styles.punchIcon}>✕</span>
            </div>
            <div className={styles.punchCircle}>
              <span className={styles.punchIcon}>●</span>
            </div>
            <div className={styles.punchCircle}>
              <span className={styles.punchIcon}>★</span>
            </div>
          </div>
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.footerLine} />
          <span>padelday.net</span>
          <span className={styles.footerLine} />
        </div>
      </div>
    </div>
  );
}

function ShieldCard() {
  return (
    <div className={`${styles.card} ${styles.cardShield}`}>
      <div className={styles.cardInner}>
        <div className={styles.cardBanner}>
          Escudo
        </div>
        <div className={styles.cardEmoji}>🛡️</div>
        <div className={styles.cardBottom}>
          <div className={styles.cardSubtitle}>Shield</div>
          <div className={styles.cardDivider} />
          <div className={styles.cardEffect}>Block one curse. One per team per tournament.</div>
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.footerLine} />
          <span>padelday.net</span>
          <span className={styles.footerLine} />
        </div>
      </div>
    </div>
  );
}

function CardBack({ shield }: { shield?: boolean }) {
  return (
    <div className={styles.cardBack}>
      <img
        src={shield ? '/maldiciones-shield-back.png' : '/maldiciones-card-back.jpg'}
        alt={shield ? 'Shield card back' : 'Maldiciones card back'}
        className={styles.cardBackImg}
      />
    </div>
  );
}

export function MaldicionesPrintPage() {
  return (
    <div className={styles.screen}>
      <a className={styles.backLink} href="/maldiciones">← Maldiciones del Padel</a>

      <div className={styles.header}>
        <h1>🎭 Maldiciones del Padel — Print & Play</h1>
        <p>
          Print these cards, cut along the borders, and bring the curse card game to your next tournament.
          Print card fronts on one side and backs on the other for a professional feel.
        </p>
        <button className={styles.printButton} onClick={() => window.print()}>
          🖨️ Print Cards
        </button>
      </div>

      <div className={styles.instructions}>
        <h3>How to Play</h3>
        <ol>
          <li>Print this page (fronts) and optionally the backs page on the reverse side.</li>
          <li>Cut out each card along the borders.</li>
          <li>Separate cards by tier: Green (easy), Yellow (medium), Red (extreme).</li>
          <li>Give each team a hand of cards at the start — we recommend <strong>1 card per 3 rounds</strong>.</li>
          <li>Give each team <strong>one Shield card</strong>.</li>
          <li>Before a match is scored, a team can play one curse card on an opponent.</li>
          <li>The opponent can block with their shield (both are consumed) or accept the curse.</li>
          <li>The cursed player/team must follow the card's constraint for the entire match!</li>
        </ol>
      </div>

      {/* ── Card Fronts ── */}
      <h2 className={styles.sectionTitle}>Green Tier — Lite ({greenCards.length} cards)</h2>
      <div className={styles.cardGrid}>
        {greenCards.map(c => <PrintCard key={c.name} card={c} tier="green" />)}
      </div>

      <h2 className={styles.sectionTitle}>Yellow Tier — Medium ({yellowCards.length} cards)</h2>
      <div className={styles.cardGrid}>
        {yellowCards.map(c => <PrintCard key={c.name} card={c} tier="yellow" />)}
      </div>

      <h2 className={styles.sectionTitle}>Red Tier — Hardcore ({redCards.length} cards)</h2>
      <div className={styles.cardGrid}>
        {redCards.map(c => <PrintCard key={c.name} card={c} tier="red" />)}
      </div>

      <h2 className={styles.sectionTitle}>Shield Cards (print 1 per team)</h2>
      <div className={styles.cardGrid}>
        <ShieldCard />
        <ShieldCard />
        <ShieldCard />
        <ShieldCard />
        <ShieldCard />
        <ShieldCard />
        <ShieldCard />
        <ShieldCard />
        <ShieldCard />
      </div>

      {/* ── Card Backs ── */}
      <h2 className={`${styles.sectionTitle} ${styles.pageBreak}`}>Card Backs (print on reverse side)</h2>
      <div className={styles.cardGrid}>
        {[...greenCards, ...yellowCards, ...redCards].map((_, i) => <CardBack key={i} />)}
      </div>

      <h2 className={`${styles.sectionTitle} ${styles.pageBreak}`}>Shield Card Backs</h2>
      <div className={`${styles.cardGrid} ${styles.cardGridShieldBacks}`}>
        <CardBack shield />
        <CardBack shield />
        <CardBack shield />
        <CardBack shield />
        <CardBack shield />
        <CardBack shield />
        <CardBack shield />
        <CardBack shield />
        <CardBack shield />
      </div>
    </div>
  );
}
