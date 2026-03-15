import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from '../Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function MexicanoEsPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/es/">← Gestor de Torneos</a>
      </nav>
      <article className={styles.article}>
        <h1>Mexicano Padel — Reglas, Formato y Cómo Jugar</h1>
        <p className={styles.lead}>
          El Mexicano es el formato de torneo de padel competitivo más popular. A diferencia del Americano, los enfrentamientos se basan en la clasificación actual, manteniendo cada ronda reñida y emocionante.
        </p>

        <h2>¿Qué es el Mexicano?</h2>
        <p>
          Mexicano (a veces llamado "Mexicano Padel" o "Padel Mexicano") es un formato de parejas rotativas donde los oponentes se asignan según la tabla de clasificación actual. Después de la ronda 1, el jugador mejor clasificado se empareja con el peor clasificado, y se enfrentan a la pareja formada por el 2° y 3° clasificados. Esto crea partidos equilibrados donde ningún equipo es abrumadoramente superior.
        </p>

        <h2>Cómo Funcionan los Emparejamientos Dinámicos</h2>
        <p>
          El algoritmo agrupa a los jugadores por clasificación actual. Dentro de cada grupo de 4, los jugadores #1 y #4 forman un equipo, y #2 y #3 forman el otro. Esto significa:
        </p>
        <ul>
          <li>Los jugadores fuertes llevan a compañeros más débiles — equilibrando los equipos.</li>
          <li>Los mejores jugadores siempre se enfrentan a la mejor competición, pero con parejas diferentes.</li>
          <li>Los jugadores del fondo se benefician de jugar con compañeros más fuertes.</li>
          <li>Cada partido se mantiene reñido y competitivo.</li>
        </ul>

        <h2>Paso a Paso</h2>
        <ol>
          <li><strong>Ronda 1:</strong> Emparejamientos aleatorios, igual que en Americano. Esto genera la clasificación inicial.</li>
          <li><strong>Ronda 2+:</strong> Los jugadores se clasifican por puntos totales. El algoritmo crea equipos equilibrados basados en la clasificación actual.</li>
          <li><strong>Registra cada partido.</strong> Los puntos de ambos equipos se registran y se suman a los totales individuales.</li>
          <li><strong>Repite.</strong> Cada ronda reevalúa la clasificación y crea nuevos emparejamientos equilibrados.</li>
          <li><strong>Clasificación final:</strong> Los puntos individuales totales determinan al ganador.</li>
        </ol>

        <h2>Americano vs Mexicano</h2>
        <p>Los dos formatos comparten la misma estructura pero difieren en un aspecto clave:</p>
        <ul>
          <li><strong>Americano:</strong> Oponentes aleatorios → más social, menos predecible</li>
          <li><strong>Mexicano:</strong> Oponentes por clasificación → más competitivo, partidos más reñidos</li>
        </ul>
        <p>
          Elige Americano para eventos casuales donde la mezcla social es la prioridad. Elige Mexicano cuando todos quieren partidos competitivos y justos.
        </p>

        <h2>Cuándo Usar Mexicano</h2>
        <ul>
          <li>Niveles mixtos — el algoritmo equilibra los equipos automáticamente.</li>
          <li>Grupos competitivos que quieren que cada partido importe.</li>
          <li>Eventos regulares de club donde las clasificaciones deben reflejar el nivel real.</li>
          <li>Cuando quieres que la clasificación sea significativa, no basada en la suerte.</li>
        </ul>

        <h2>Variaciones</h2>
        <ul>
          <li><strong>Mixicano:</strong> Mexicano con emparejamiento cruzado (ej. un hombre + una mujer por pareja). Oponentes por clasificación con restricciones de grupo.</li>
          <li><strong>Team Mexicano:</strong> Parejas fijas (sin rotación), pero los oponentes se asignan por clasificación.</li>
          <li><strong>Mixed Team Mexicano:</strong> Parejas cruzadas fijas con oponentes por clasificación. El formato de equipos mixto más competitivo.</li>
          <li><strong>Club Mexicano:</strong> Competición inter-club con emparejamientos por clasificación.</li>
        </ul>

        <h2>Consejos</h2>
        <ul>
          <li><strong>Se recomiendan 6+ rondas</strong> para que el algoritmo cree partidos realmente equilibrados.</li>
          <li><strong>Funciona mejor con 8+ jugadores</strong> — más jugadores = mejor matchmaking.</li>
          <li><strong>La primera ronda es aleatoria</strong> — la clasificación se vuelve significativa a partir de la ronda 2.</li>
        </ul>

        <div className={styles.cta}>
          <p>Prueba Mexicano — partidos equilibrados, sin complicaciones.</p>
          <a className={styles.ctaButton} href="/play">Probar Mexicano Gratis →</a>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
