import { useState } from 'react';
import { AppFooter, FeedbackModal } from '@padel/common';
import styles from '../Article.module.css';

interface Props {
  onFeedback: (message: string) => Promise<void>;
}

export function OrganizarPage({ onFeedback }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <nav className={styles.nav}>
        <a className={styles.navLink} href="/es/">← Gestor de Torneos</a>
        <a className={styles.navLink} href="/organize" lang="en">English</a>
      </nav>
      <article className={styles.article}>
        <h1>Cómo Organizar un Torneo de Padel</h1>
        <p className={styles.lead}>
          La guía definitiva para cualquier persona encargada de organizar un torneo de padel — ya sea tu primera vez o la quincuagésima. Guarda esta página, compártela con tu grupo y usa los checklists el día del evento.
        </p>

        <h2>Antes del Evento</h2>
        <p>
          La mayoría de los problemas en torneos ocurren por mala planificación, no por mal juego. Resuelve estas cuatro cosas con antelación y el evento se ejecuta solo.
        </p>

        <h3>1. Reserva Pistas</h3>
        <p>
          La regla de oro: <strong>1 pista por cada 4 jugadores</strong>. Esto asegura que todos jueguen cada ronda sin esperas. Si tienes más jugadores que pistas, los jugadores rotarán entrando y saliendo — funciona, pero es más lento.
        </p>
        <p>
          Reserva siempre <strong>15–30 minutos extra</strong> de lo que crees necesario. Los usarás para calentamiento, transiciones entre rondas y la ceremonia de premios al final.
        </p>

        <h3>2. Reúne Jugadores</h3>
        <p>
          La parte más difícil de organizar es conseguir confirmaciones firmes. Envía un mensaje a tu grupo con la fecha, hora, ubicación y coste por persona. Establece un <strong>plazo límite para confirmar</strong> — 48 horas antes del evento funciona bien.
        </p>
        <p>
          Apunta a <strong>números de jugadores divisibles entre 4</strong> (8, 12, 16, 20, 24). Si acabas con un número impar, la app puede gestionarlo, pero los números pares dan un calendario más fluido. Mantén 1–2 jugadores de reserva para cancelaciones de última hora.
        </p>
        <p>
          También puedes usar la <a href="/plan">herramienta de planificación</a> de PadelDay — crea un torneo, comparte el enlace y los jugadores se inscriben solos. Sin hoja de cálculo en WhatsApp.
        </p>

        <h3>3. Elige un Formato</h3>
        <p>
          Elige según tu grupo:
        </p>
        <ul>
          <li><strong><a href="/es/americano">Americano</a></strong> — parejas rotativas, clasificación individual. Ideal para grupos sociales con niveles mixtos.</li>
          <li><strong><a href="/es/mexicano">Mexicano</a></strong> — emparejamientos por clasificación. Ideal para grupos competitivos que quieren partidos reñidos.</li>
          <li><strong>Team Americano</strong> — parejas fijas, clasificación por equipo. Ideal cuando la gente viene en dúos.</li>
          <li><strong>Mixicano</strong> — parejas mixtas, por clasificación. Ideal para eventos donde quieres que cada equipo sea un hombre + una mujer.</li>
        </ul>
        <p>
          ¿No estás seguro? Usa el <a href="/es/formatos">comparador de formatos</a> para encontrar el adecuado para tu grupo.
        </p>

        <h3>4. Checklist de Equipamiento</h3>
        <ul>
          <li><strong>Pelotas:</strong> 3 pelotas nuevas por pista. Las pelotas económicas van bien para juego social.</li>
          <li><strong>Dispositivo de puntuación:</strong> Un móvil o tablet con PadelDay abierto. Un dispositivo es suficiente — el organizador introduce las puntuaciones.</li>
          <li><strong>Altavoz portátil</strong> (opcional): Útil para anunciar emparejamientos y llamar a jugadores a las pistas.</li>
          <li><strong>Grips y overgrips extra:</strong> Siempre alguien necesita uno.</li>
          <li><strong>Agua y snacks:</strong> Coordina quién trae qué, o arréglalo con el club.</li>
          <li><strong>Palas de reserva:</strong> La mayoría de clubes las alquilan, pero confirma con antelación.</li>
        </ul>

        <h2>Checklist del Organizador</h2>
        <p>
          Imprime esto o haz una captura. Repásalo el día antes y otra vez la mañana del evento.
        </p>
        <ul>
          <li>Pistas reservadas (1 por cada 4 jugadores, más 15–30 min de margen)</li>
          <li>Lista de jugadores confirmada (idealmente divisible entre 4)</li>
          <li>1–2 jugadores de reserva en espera</li>
          <li>Formato elegido y entendido</li>
          <li>Pelotas nuevas compradas (3 por pista)</li>
          <li>Móvil/tablet cargado para puntuación</li>
          <li>Torneo PadelDay creado con nombres de jugadores</li>
          <li>Hora de inicio comunicada a todos los jugadores</li>
          <li>Ubicación de las pistas y detalles de aparcamiento compartidos</li>
          <li>Agua, snacks y planes post-torneo organizados</li>
          <li>Grips extra y palas de reserva disponibles</li>
        </ul>

        <h2>Horarios de Ejemplo</h2>
        <p>
          Estos son cronogramas probados en la vida real. Ajusta los puntos por partido si necesitas acelerar o ralentizar.
        </p>

        <h3>Social Rápido — 8 jugadores, 2 pistas, 2 horas</h3>
        <p>
          El especial de noche entre semana. Rápido, divertido y todos juegan mucho.
        </p>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Actividad</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>0:00</td><td>Llegada, calentamiento, configurar torneo en PadelDay</td></tr>
              <tr><td>0:15</td><td>Ronda 1 (16 puntos por partido, ~12 min)</td></tr>
              <tr><td>0:30</td><td>Ronda 2</td></tr>
              <tr><td>0:45</td><td>Ronda 3</td></tr>
              <tr><td>1:00</td><td>Ronda 4</td></tr>
              <tr><td>1:15</td><td>Ronda 5</td></tr>
              <tr><td>1:30</td><td>Ronda 6</td></tr>
              <tr><td>1:45</td><td>Ceremonia de premios + enfriamiento</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          <strong>Configuración:</strong> Americano o Mexicano, 16 puntos por partido, 6 rondas. Todos los jugadores juegan cada ronda — nadie se queda fuera.
        </p>

        <h3>Evento Estándar — 12 jugadores, 3 pistas, 3 horas</h3>
        <p>
          La configuración más común para eventos de club y grupos de amigos. Espacio para partidos más largos y un breve descanso.
        </p>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Actividad</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>0:00</td><td>Llegada, calentamiento, briefing</td></tr>
              <tr><td>0:20</td><td>Ronda 1 (24 puntos por partido, ~18 min)</td></tr>
              <tr><td>0:40</td><td>Ronda 2</td></tr>
              <tr><td>1:00</td><td>Ronda 3</td></tr>
              <tr><td>1:20</td><td>Descanso breve (agua, reagruparse)</td></tr>
              <tr><td>1:30</td><td>Ronda 4</td></tr>
              <tr><td>1:50</td><td>Ronda 5</td></tr>
              <tr><td>2:10</td><td>Ronda 6</td></tr>
              <tr><td>2:30</td><td>Ronda 7 (opcional, si hay tiempo)</td></tr>
              <tr><td>2:45</td><td>Ceremonia de premios</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          <strong>Configuración:</strong> Americano o Mexicano, 24 puntos por partido, 6–7 rondas. Con 12 jugadores en 3 pistas, los 12 juegan cada ronda.
        </p>

        <h3>Torneo de Día Completo — 16–24 jugadores, 4+ pistas, 5+ horas</h3>
        <p>
          Un evento de verdad. Planifica un descanso para comer y considera una estructura en dos fases para grupos grandes.
        </p>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Actividad</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>0:00</td><td>Llegada, inscripción, calentamiento</td></tr>
              <tr><td>0:30</td><td>Rondas 1–3 (24 o 32 puntos por partido)</td></tr>
              <tr><td>1:45</td><td>Descanso</td></tr>
              <tr><td>2:00</td><td>Rondas 4–6</td></tr>
              <tr><td>3:15</td><td>Pausa para comer</td></tr>
              <tr><td>3:45</td><td>Rondas 7–9</td></tr>
              <tr><td>5:00</td><td>Ronda 10 (ambiente de final)</td></tr>
              <tr><td>5:20</td><td>Ceremonia de premios + foto de grupo</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          <strong>Configuración:</strong> Mexicano funciona mejor para grupos grandes — los emparejamientos por clasificación mantienen los partidos competitivos. Usa 24 o 32 puntos por partido. Con 16 jugadores en 4 pistas, todos juegan cada ronda. Con 20+ jugadores, algunos descansan cada ronda.
        </p>

        <h2>Eligiendo el Formato Adecuado</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Escenario</th>
                <th>Formato Recomendado</th>
                <th>Por Qué</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Organizador novato, niveles mixtos</td>
                <td><a href="/es/americano">Americano</a></td>
                <td>Simple, social, todos juegan con todos</td>
              </tr>
              <tr>
                <td>Jugadores competitivos de club</td>
                <td><a href="/es/mexicano">Mexicano</a></td>
                <td>Los mejores se enfrentan a los mejores, partidos reñidos</td>
              </tr>
              <tr>
                <td>Parejas o amigos en dúos</td>
                <td>Team Americano</td>
                <td>Equipos fijos, clasificación por pareja</td>
              </tr>
              <tr>
                <td>Evento mixto hombre/mujer</td>
                <td>Mixicano</td>
                <td>Cada equipo es un hombre + una mujer, por clasificación</td>
              </tr>
              <tr>
                <td>Grupo grande, poco tiempo</td>
                <td>King of the Court</td>
                <td>Rotación rápida, mucha energía, sin tiempos muertos</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          ¿Necesitas más ayuda para decidir? El <a href="/es/formatos">comparador de formatos</a> te guía paso a paso.
        </p>

        <h2>Puntuación y Clasificaciones</h2>
        <p>
          Aquí es donde la mayoría de torneos manuales fallan. Llevar puntos en papel con 12+ jugadores en múltiples pistas es propenso a errores y lento. PadelDay lo gestiona automáticamente:
        </p>
        <ul>
          <li><strong>Introduce puntuaciones una vez</strong> — la app calcula todo: puntos individuales, victorias, diferencia de juegos, enfrentamientos directos.</li>
          <li><strong>Tabla de posiciones en directo</strong> — los jugadores pueden ver la clasificación entre rondas desde cualquier dispositivo.</li>
          <li><strong>Emparejamientos justos</strong> — el algoritmo asegura máxima variedad de parejas (Americano) o enfrentamientos por clasificación (Mexicano).</li>
          <li><strong>Desempates</strong> — lógica de desempate integrada para que nunca tengas que tomar decisiones arbitrarias.</li>
        </ul>
        <p>
          Como organizador, tu único trabajo es introducir la puntuación después de cada partido. Todo lo demás es automático.
        </p>

        <h2>Ceremonia de Premios</h2>
        <p>
          No te saltes esta parte — es lo que la gente recuerda. PadelDay calcula <strong>41 premios</strong> automáticamente después de la ronda final: mejor jugador, más mejorado, mayor sorpresa, racha de victorias más larga, y docenas más. Cada premio se revela con un toque, así que todo el grupo se reúne y mira junto. Tarda 5 minutos y convierte una sesión casual en un evento de verdad.
        </p>

        <h2>Errores Comunes</h2>
        <ul>
          <li><strong>No reservar suficiente tiempo.</strong> Las rondas duran más de lo que piensas. Añade 15–30 minutos de margen a tu reserva total.</li>
          <li><strong>Sin hora de inicio clara.</strong> Dile a los jugadores "empezamos a las 18:15, llega a las 18:00." Si dices "sobre las 6", la mitad del grupo aparece a las 18:20.</li>
          <li><strong>Número impar de jugadores sin plan.</strong> Si tienes 9 u 11 jugadores, alguien descansa cada ronda. La app lo gestiona automáticamente, pero avisa a los jugadores con antelación.</li>
          <li><strong>Puntuación manual en papel.</strong> Funciona con 4 jugadores. Con 8+ jugadores en 6+ rondas, cometerás errores. Usa la app.</li>
          <li><strong>Saltarse la ceremonia de premios.</strong> Tarda 5 minutos y es la parte más memorable del evento. No termines con "ok, buenos partidos."</li>
          <li><strong>No comunicar la logística.</strong> Comparte ubicación de las pistas, info de aparcamiento, qué traer y coste por persona al menos 24 horas antes. La gente odia preguntar.</li>
          <li><strong>Olvidar las pelotas.</strong> Las pistas de club no siempre incluyen pelotas. Trae 3 pelotas nuevas por pista.</li>
          <li><strong>Demasiados puntos por partido.</strong> Para eventos sociales, 16 puntos por partido es lo ideal — los partidos terminan en ~12 minutos. Subir a 32 puntos significa partidos de 20+ minutos y menos rondas en total.</li>
        </ul>

        <div className={styles.cta}>
          <p>Empieza a organizar — sin registro necesario.</p>
          <a className={styles.ctaButton} href="/plan">Crear un Torneo</a>
        </div>
      </article>

      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={onFeedback} />
    </>
  );
}
