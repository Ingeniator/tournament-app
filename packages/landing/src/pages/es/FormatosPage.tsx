import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from '../Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

const formats = [
  { name: 'Americano', category: 'Social', emoji: '🎾', desc: 'Parejas y oponentes aleatorios rotativos. Cada ronda juegas con un compañero nuevo, manteniendo el ambiente social e impredecible. Clasificación individual.', bestFor: 'Eventos sociales, grupos grandes, principiantes' },
  { name: 'Americano Mixto', category: 'Social', emoji: '🔀', desc: 'Como Americano pero cada pareja debe tener un jugador de cada grupo (ej. hombres y mujeres). Parejas aleatorias cruzadas con clasificación individual.', bestFor: 'Eventos mixtos, equipos equilibrados' },
  { name: 'Mexicano', category: 'Competitivo', emoji: '🏆', desc: 'Parejas rotativas con oponentes basados en la clasificación. Después de la ronda 1, los mejores jugadores se emparejan con los peores, y los enfrentamientos se basan en el ranking actual. Mantiene cada partido competitivo.', bestFor: 'Grupos competitivos, partidos equilibrados' },
  { name: 'Mixicano', category: 'Competitivo', emoji: '⚡', desc: 'Combina emparejamiento cruzado (un jugador de cada grupo) con oponentes por clasificación. La versión competitiva del Americano Mixto.', bestFor: 'Eventos mixtos competitivos' },
  { name: 'King of the Court', category: 'Competitivo', emoji: '👑', desc: 'Sistema de jerarquía por pistas. Los ganadores suben a pistas superiores, los perdedores bajan. Puntos extra por ganar en pistas top. Parejas rotativas.', bestFor: 'Clubes con múltiples pistas, batallas de ranking' },
  { name: 'Team Americano', category: 'Equipos', emoji: '🤝', desc: 'Parejas fijas durante todo el torneo con oponentes aleatorios. Clasificación por equipo — ganáis o perdéis juntos.', bestFor: 'Parejas establecidas, team building' },
  { name: 'Team Mexicano', category: 'Equipos', emoji: '🔥', desc: 'Equipos fijos con oponentes por clasificación. El formato de equipos más competitivo — los mejores equipos se enfrentan a los mejores.', bestFor: 'Competición seria entre parejas' },
  { name: 'Club Americano', category: 'Club', emoji: '🎾', desc: 'Competición inter-club con parejas rotativas y oponentes aleatorios. Los jugadores rotan dentro de su club cada ronda. Clasificación individual.', bestFor: 'Eventos inter-club sociales' },
  { name: 'Club Mexicano', category: 'Club', emoji: '📊', desc: 'Competición inter-club con parejas rotativas y oponentes por clasificación. La versión competitiva — los mejores jugadores se enfrentan entre clubes.', bestFor: 'Eventos inter-club competitivos' },
  { name: 'Club Ranked', category: 'Club', emoji: '🏟️', desc: 'Competición inter-club con parejas fijas y enfrentamientos posicionales. La pareja #1 siempre se enfrenta a la pareja #1 del club contrario. Liga estructurada.', bestFor: 'Ligas de club, cuadros formales' },
  { name: 'Club Team Americano', category: 'Club', emoji: '🎲', desc: 'Competición inter-club con parejas fijas y enfrentamientos aleatorios. Las parejas se mantienen, pero contra quién juegas cambia cada ronda.', bestFor: 'Eventos inter-club casuales por equipos' },
  { name: 'Club Team Mexicano', category: 'Club', emoji: '🔥', desc: 'Competición inter-club con parejas fijas y enfrentamientos por clasificación. Las mejores parejas se enfrentan a las mejores. El formato de club más competitivo.', bestFor: 'Enfrentamientos inter-club de alto nivel' },
];

const categoryStyle = (cat: string) => {
  switch (cat) {
    case 'Social': return styles.badgeSocial;
    case 'Competitivo': return styles.badgeCompetitive;
    case 'Equipos': return styles.badgeTeam;
    case 'Club': return styles.badgeClub;
    default: return styles.badgeCommon;
  }
};

export function FormatosPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/es/">← Gestor de Torneos</a>
        <a className={styles.navLink} href="/formats" lang="en">English</a>
      </nav>
      <article className={styles.article}>
        <h1>Formatos de Torneo — Guía Completa</h1>
        <p className={styles.lead}>
          15 formatos de torneo en 4 categorías. Ya sea que organices un evento social casual o una liga inter-club competitiva, hay un formato para ti. Muchos formatos también tienen una variante cruzada para juego mixto o por grupos de nivel.
        </p>

        <h2>Todos los Formatos</h2>
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
                <strong>Ideal para:</strong> {f.bestFor}
              </div>
            </div>
          ))}
        </div>

        <h2>Comparación</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Formato</th>
                <th>Parejas</th>
                <th>Oponentes</th>
                <th>Nivel</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Americano</td><td>Rotativas</td><td>Aleatorios</td><td>Social</td></tr>
              <tr><td>Americano Mixto</td><td>Rotativas (cruzadas)</td><td>Aleatorios</td><td>Social</td></tr>
              <tr><td>Mexicano</td><td>Rotativas</td><td>Por clasificación</td><td>Competitivo</td></tr>
              <tr><td>Mixicano</td><td>Rotativas (cruzadas)</td><td>Por clasificación</td><td>Competitivo</td></tr>
              <tr><td>King of the Court</td><td>Rotativas</td><td>Promoción por pista</td><td>Competitivo</td></tr>
              <tr><td>Mixed King of the Court</td><td>Rotativas (cruzadas)</td><td>Promoción por pista</td><td>Competitivo</td></tr>
              <tr><td>Team Americano</td><td>Fijas</td><td>Aleatorios</td><td>Equipos</td></tr>
              <tr><td>Team Mexicano</td><td>Fijas</td><td>Por clasificación</td><td>Equipos</td></tr>
              <tr><td>Mixed Team Americano</td><td>Fijas (cruzadas)</td><td>Aleatorios</td><td>Equipos</td></tr>
              <tr><td>Mixed Team Mexicano</td><td>Fijas (cruzadas)</td><td>Por clasificación</td><td>Equipos</td></tr>
              <tr><td>Club Americano</td><td>Rotativas</td><td>Aleatorios</td><td>Club</td></tr>
              <tr><td>Club Mexicano</td><td>Rotativas</td><td>Por clasificación</td><td>Club</td></tr>
              <tr><td>Club Ranked</td><td>Fijas</td><td>Posicional</td><td>Club</td></tr>
              <tr><td>Club Team Americano</td><td>Fijas</td><td>Aleatorios</td><td>Club</td></tr>
              <tr><td>Club Team Mexicano</td><td>Fijas</td><td>Por clasificación</td><td>Club</td></tr>
            </tbody>
          </table>
        </div>

        <h2>Emparejamiento Cruzado</h2>
        <p>
          Cinco formatos soportan <strong>emparejamiento cruzado</strong> — cada equipo debe incluir un jugador de cada grupo (ej. un hombre + una mujer). Divide a los jugadores en dos grupos al configurar y el algoritmo garantiza equipos mixtos equilibrados cada ronda.
        </p>
        <ul>
          <li><strong>Americano Mixto</strong> — parejas rotativas, oponentes aleatorios</li>
          <li><strong>Mixicano</strong> — parejas rotativas, oponentes por clasificación</li>
          <li><strong>Mixed King of the Court</strong> — parejas rotativas, promoción por pista</li>
          <li><strong>Mixed Team Americano</strong> — parejas cruzadas fijas, oponentes aleatorios</li>
          <li><strong>Mixed Team Mexicano</strong> — parejas cruzadas fijas, oponentes por clasificación</li>
        </ul>
        <p>
          El modo cruzado funciona con cualquier definición de grupo — hombres/mujeres, principiantes/avanzados, club A/club B. La restricción es simplemente que cada pareja en pista tenga exactamente un jugador de cada grupo.
        </p>

        <h2>¿Qué Formato Elegir?</h2>
        <h3>Para Eventos Sociales</h3>
        <p>
          <strong>Americano</strong> es el estándar de oro para padel social. Todos juegan con todos, y los emparejamientos aleatorios facilitan conocer gente nueva. Si tienes grupos distintos (como hombres/mujeres), <strong>Americano Mixto</strong> asegura emparejamiento cruzado.
        </p>
        <p><a href="/es/americano">Lee la guía completa de Americano →</a></p>

        <h3>Para Juego Competitivo</h3>
        <p>
          <strong>Mexicano</strong> es el formato competitivo más popular. Los emparejamientos por clasificación significan que los mejores siempre se enfrentan a los mejores, creando partidos reñidos durante todo el torneo. <strong>King of the Court</strong> añade un toque de jerarquía por pistas.
        </p>
        <p><a href="/es/mexicano">Lee la guía completa de Mexicano →</a></p>

        <h3>Para Equipos</h3>
        <p>
          Si las parejas ya están decididas, <strong>Team Americano</strong> (oponentes aleatorios) o <strong>Team Mexicano</strong> (oponentes por clasificación) son tus mejores opciones.
        </p>

        <h3>Para Clubes</h3>
        <p>
          Los formatos Club soportan 2+ clubes compitiendo entre sí con parejas fijas intra-club y enfrentamientos inter-club. Elige posicional para juego estructurado, aleatorio para variedad, o por clasificación para competición.
        </p>

        <div className={styles.cta}>
          <p>Prueba cualquier formato gratis — sin registro necesario.</p>
          <a className={styles.ctaButton} href="/play">Iniciar un Torneo →</a>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
