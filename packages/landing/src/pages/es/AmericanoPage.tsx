import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from '../Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function AmericanoEsPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/es/">← Gestor de Torneos</a>
      </nav>
      <article className={styles.article}>
        <h1>Americano Padel — Reglas, Formato y Cómo Jugar</h1>
        <p className={styles.lead}>
          El formato Americano es el formato de torneo de padel social más popular del mundo. Los jugadores rotan de pareja cada ronda, haciéndolo perfecto para grupos de todos los niveles.
        </p>

        <h2>¿Qué es el Americano?</h2>
        <p>
          En Americano, cada jugador juega con un compañero diferente cada ronda. Las parejas y los oponentes se asignan aleatoriamente, así que jugarás con (y contra) el mayor número de personas posible. La clasificación es individual — cada jugador acumula sus propios puntos a lo largo de todos los partidos.
        </p>

        <h2>Lo Que Necesitas</h2>
        <ul>
          <li><strong>Jugadores:</strong> 4 a 32 (debe ser par). 8–16 es lo ideal.</li>
          <li><strong>Pistas:</strong> 1 pista por cada 4 jugadores. 8 jugadores = 2 pistas, 16 jugadores = 4 pistas.</li>
          <li><strong>Puntos por partido:</strong> Típicamente 16, 24 o 32 puntos. Partidos más cortos = más rotación.</li>
          <li><strong>Rondas:</strong> Normalmente 5–8 rondas. Más rondas = clasificación más justa.</li>
        </ul>

        <h2>Cómo Jugar — Paso a Paso</h2>
        <ol>
          <li><strong>Configura el torneo.</strong> Introduce los nombres de los jugadores, elige el número de pistas y los puntos por partido. La app se encarga del resto.</li>
          <li><strong>Empieza la Ronda 1.</strong> Los jugadores se asignan aleatoriamente a parejas y pistas. Cada pista juega un partido hasta el total de puntos establecido.</li>
          <li><strong>Registra la puntuación.</strong> Se introducen las puntuaciones de ambos equipos (ej. 16–12). Ambas puntuaciones deben sumar el total de puntos.</li>
          <li><strong>Las parejas rotan.</strong> Después de cada ronda, se forman nuevas parejas aleatorias. Nadie juega con el mismo compañero dos veces (cuando es posible).</li>
          <li><strong>La clasificación individual se actualiza.</strong> Los puntos de cada jugador en cada partido se acumulan. La tabla muestra puntos totales, victorias y diferencia de juegos.</li>
          <li><strong>Clasificación final.</strong> Después de todas las rondas, gana el jugador con más puntos. En caso de empate, el número de victorias es el desempate.</li>
        </ol>

        <h2>Puntuación</h2>
        <p>
          En cada partido, los equipos juegan a un total de puntos fijo (ej. 32 puntos totales). Cuando un equipo anota, el marcador avanza. Las puntuaciones de ambos equipos siempre suman el total de puntos (16–16, 20–12, etc.). Los puntos anotados cuentan para la clasificación individual.
        </p>

        <h2>Consejos para Organizadores</h2>
        <ul>
          <li><strong>Usa 5+ rondas</strong> para una clasificación justa. Menos rondas significa más suerte involucrada.</li>
          <li><strong>16 puntos por partido</strong> es lo ideal — los partidos terminan en unos 15 minutos.</li>
          <li><strong>Deja que la app gestione los emparejamientos.</strong> Los emparejamientos manuales son propensos a errores. El algoritmo asegura máxima variedad de parejas.</li>
          <li><strong>Termina con la ceremonia de premios.</strong> 41 premios calculados automáticamente hacen que el final sea memorable.</li>
        </ul>

        <h2>Americano vs Mexicano</h2>
        <p>
          La diferencia clave es cómo se eligen los oponentes. En Americano, los enfrentamientos son aleatorios. En <a href="/es/mexicano">Mexicano</a>, los enfrentamientos se basan en la clasificación actual — los mejores jugadores se enfrentan a los mejores. Americano es más social; Mexicano es más competitivo.
        </p>

        <h2>Variaciones</h2>
        <ul>
          <li><strong>Americano Mixto:</strong> Las parejas son cruzadas (ej. un hombre + una mujer por pareja). Cada equipo en pista tiene exactamente un jugador de cada grupo.</li>
          <li><strong>Team Americano:</strong> Las parejas son fijas durante todo el torneo.</li>
          <li><strong>Mixed Team Americano:</strong> Parejas cruzadas fijas con oponentes aleatorios. Combina juego en equipo con emparejamiento mixto.</li>
        </ul>

        <div className={styles.cta}>
          <p>Ejecuta un torneo de Americano en segundos — sin registro necesario.</p>
          <a className={styles.ctaButton} href="/play">Jugar Americano Ahora →</a>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
