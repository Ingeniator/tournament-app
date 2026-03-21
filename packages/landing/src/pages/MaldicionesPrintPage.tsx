import { CURSE_CARD_CONTENT, SHIELD_CARD_CONTENT } from '@padel/common';
import type { CurseCardContent } from '@padel/common';
import styles from './MaldicionesPrintPage.module.css';

const greenCards = CURSE_CARD_CONTENT.filter(c => c.tier === 'green');
const yellowCards = CURSE_CARD_CONTENT.filter(c => c.tier === 'yellow');
const redCards = CURSE_CARD_CONTENT.filter(c => c.tier === 'red');

function PrintCard({ card }: { card: CurseCardContent }) {
  const filled = card.tier === 'green' ? 1 : card.tier === 'yellow' ? 2 : 3;
  return (
    <div className={styles.card}>
      <div className={styles.cardInner}>
        <div className={styles.cardBanner}>
          {card.name}
          <span className={styles.tierDots}>
            {[0, 1, 2].map(i => (
              <span key={i} className={i < filled ? styles.tierDotFilled : styles.tierDotEmpty} />
            ))}
          </span>
        </div>
        <div className={styles.cardAttitude}>{card.attitude}</div>

        <div className={styles.cardBody}>
          <div className={styles.cardEmojiInline}>{card.emoji}</div>
          <div className={styles.sectionLabel}>HOW IT WORKS</div>
          <div className={styles.sectionText}>{card.howItWorks}</div>

          <div className={styles.sectionLabel}>RULES</div>
          <ul className={styles.rulesList}>
            {card.rules.map((r, i) => <li key={i}>{r}</li>)}
          </ul>

          <div className={styles.sectionLabel}>NO EXCEPTIONS</div>
          <div className={styles.sectionText}>{card.noExceptions}</div>

          <div className={styles.sectionLabel}>PENALTY</div>
          <div className={styles.sectionText}>{card.penalty}</div>
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
  const s = SHIELD_CARD_CONTENT;
  return (
    <div className={`${styles.card} ${styles.cardShield}`}>
      <div className={styles.cardInner}>
        <div className={styles.cardBanner}>{s.name}</div>
        <div className={styles.cardAttitude}>{s.attitude}</div>

        <div className={styles.cardBody}>
          <div className={styles.cardEmojiInline}>{s.emoji}</div>
          <div className={styles.sectionLabel}>HOW IT WORKS</div>
          <div className={styles.sectionText}>{s.howItWorks}</div>

          <div className={styles.sectionLabel}>RULES</div>
          <ul className={styles.rulesList}>
            {s.rules.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
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
          Use double-sided printing — fronts and backs are paired on consecutive pages.
        </p>
        <button className={styles.printButton} onClick={() => window.print()}>
          🖨️ Print Cards
        </button>
      </div>

      <div className={styles.instructions}>
        <h3>How to Play</h3>
        <ol>
          <li>Print with double-sided (flip on short edge) — fronts and backs are paired.</li>
          <li>Cut out each card along the borders.</li>
          <li>Separate cards by tier: Green (easy), Yellow (medium), Red (extreme).</li>
          <li>Give each team a hand of cards at the start — we recommend <strong>1 card per 3 rounds</strong>.</li>
          <li>Give each team <strong>one Shield card</strong>.</li>
          <li>Before a match is scored, a team can play one curse card on an opponent.</li>
          <li>The opponent can block with their shield (both are consumed) or accept the curse.</li>
          <li>The cursed player/team must follow the card's constraint for the entire match!</li>
        </ol>
      </div>

      {/* ── Page 1: Green Fronts ── */}
      <h2 className={styles.sectionTitle}>Green Tier — Lite ({greenCards.length} cards)</h2>
      <div className={styles.cardGrid}>
        {greenCards.map(c => <PrintCard key={c.id} card={c} />)}
      </div>

      {/* ── Page 2: Green Backs ── */}
      <h2 className={`${styles.sectionTitle} ${styles.pageBreak}`}>Green Tier — Backs</h2>
      <div className={styles.cardGrid}>
        {greenCards.map((_, i) => <CardBack key={i} />)}
      </div>

      {/* ── Page 3: Yellow Fronts ── */}
      <h2 className={`${styles.sectionTitle} ${styles.pageBreak}`}>Yellow Tier — Medium ({yellowCards.length} cards)</h2>
      <div className={styles.cardGrid}>
        {yellowCards.map(c => <PrintCard key={c.id} card={c} />)}
      </div>

      {/* ── Page 4: Yellow Backs ── */}
      <h2 className={`${styles.sectionTitle} ${styles.pageBreak}`}>Yellow Tier — Backs</h2>
      <div className={styles.cardGrid}>
        {yellowCards.map((_, i) => <CardBack key={i} />)}
      </div>

      {/* ── Page 5: Red Fronts ── */}
      <h2 className={`${styles.sectionTitle} ${styles.pageBreak}`}>Red Tier — Hardcore ({redCards.length} cards)</h2>
      <div className={styles.cardGrid}>
        {redCards.map(c => <PrintCard key={c.id} card={c} />)}
      </div>

      {/* ── Page 6: Red Backs ── */}
      <h2 className={`${styles.sectionTitle} ${styles.pageBreak}`}>Red Tier — Backs</h2>
      <div className={styles.cardGrid}>
        {redCards.map((_, i) => <CardBack key={i} />)}
      </div>

      {/* ── Page 7: Shield Fronts ── */}
      <h2 className={`${styles.sectionTitle} ${styles.pageBreak}`}>Shield Cards (print 1 per team)</h2>
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

      {/* ── Page 8: Shield Backs ── */}
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
