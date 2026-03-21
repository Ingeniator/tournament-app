import { CURSE_CARD_CONTENT, SHIELD_CARDS } from '@padel/common';
import type { CurseCardContent, ShieldCardContent } from '@padel/common';
import styles from './MaldicionesPrintPage.module.css';

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

function ShieldCard({ shield }: { shield: ShieldCardContent }) {
  return (
    <div className={`${styles.card} ${styles.cardShield}`}>
      <div className={styles.cardInner}>
        <div className={styles.cardBanner}>{shield.name}</div>
        <div className={styles.cardAttitude}>{shield.attitude}</div>

        <div className={styles.cardBody}>
          <div className={styles.cardEmojiInline}>{shield.emoji}</div>
          <div className={styles.sectionLabel}>HOW IT WORKS</div>
          <div className={styles.sectionText}>{shield.howItWorks}</div>

          <div className={styles.sectionLabel}>RULES</div>
          <ul className={styles.rulesList}>
            {shield.rules.map((r, i) => <li key={i}>{r}</li>)}
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

function BlankCard() {
  return (
    <div className={styles.card}>
      <div className={styles.cardInner}>
        <div className={styles.cardBanner}>YOUR CURSE</div>
        <div className={styles.cardAttitude}>Write Your Own</div>
        <div className={styles.cardBody}>
          <div className={styles.sectionLabel}>HOW IT WORKS</div>
          <div className={styles.blankLine} />
          <div className={styles.blankLine} />
          <div className={styles.sectionLabel}>RULES</div>
          <div className={styles.blankLine} />
          <div className={styles.blankLine} />
          <div className={styles.sectionLabel}>NO EXCEPTIONS</div>
          <div className={styles.blankLine} />
          <div className={styles.sectionLabel}>PENALTY</div>
          <div className={styles.blankLine} />
        </div>
        <div className={styles.punchZone}>
          <div className={styles.punchRibbon}>PUNCH FEEDBACK HERE</div>
          <div className={styles.punchCircles}>
            <div className={styles.punchCircle}><span className={styles.punchIcon}>✕</span></div>
            <div className={styles.punchCircle}><span className={styles.punchIcon}>●</span></div>
            <div className={styles.punchCircle}><span className={styles.punchIcon}>★</span></div>
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
          <li>Players can trade cards within their team at any time.</li>
          <li>Before a match is scored, a team can play one curse card on an opponent.</li>
          <li>The opponent can block with their shield (both are consumed) or accept the curse.</li>
          <li>The cursed player/team must follow the card's constraint for the entire match!</li>
        </ol>
      </div>

      {/* ── Curse Cards: 4 pages of 9, front/back paired ── */}
      {(() => {
        const allCards = [...CURSE_CARD_CONTENT.map(c => c), null]; // null = blank
        const pages: (CurseCardContent | null)[][] = [];
        for (let i = 0; i < allCards.length; i += 9) {
          pages.push(allCards.slice(i, i + 9));
        }
        return pages.map((page, pi) => (
          <div key={pi}>
            {/* Front */}
            <h2 className={`${styles.sectionTitle} ${pi > 0 ? styles.pageBreak : ''}`}>
              Curse Cards — Page {pi + 1} Fronts
            </h2>
            <div className={styles.cardGrid}>
              {page.map((c, ci) => c
                ? <PrintCard key={c.id} card={c} />
                : <BlankCard key={`blank-${ci}`} />
              )}
            </div>
            {/* Back */}
            <h2 className={`${styles.sectionTitle} ${styles.pageBreak}`}>
              Curse Cards — Page {pi + 1} Backs
            </h2>
            <div className={styles.cardGrid}>
              {page.map((_, ci) => <CardBack key={`back-${pi}-${ci}`} />)}
            </div>
          </div>
        ));
      })()}

      {/* ── Shield Fronts ── */}
      <h2 className={`${styles.sectionTitle} ${styles.pageBreak}`}>Shield Cards (print 1 per team)</h2>
      <div className={styles.cardGrid}>
        {SHIELD_CARDS.map(s => [0, 1, 2].map(i => (
          <ShieldCard key={`${s.id}-${i}`} shield={s} />
        )))}
      </div>

      {/* ── Shield Backs ── */}
      <h2 className={`${styles.sectionTitle} ${styles.pageBreak}`}>Shield Card Backs</h2>
      <div className={`${styles.cardGrid} ${styles.cardGridShieldBacks}`}>
        {Array.from({ length: 9 }, (_, i) => <CardBack key={i} shield />)}
      </div>
    </div>
  );
}
