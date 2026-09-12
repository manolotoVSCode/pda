/**
 * seed-profile-description.ts
 *
 * Deletes NarrativeContent rows for retired sections (COMMUNICATION, MOTIVATORS, PRESSURE)
 * and inserts 8 PROFILE_DESCRIPTION rows with verbatim content from §5.3 of the reference doc.
 *
 * Run with: npx tsx scripts/seed-profile-description.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const PROFILE_DESCRIPTION_ROWS = [
  {
    dimension: 'D' as const,
    subtype: 'high',
    content:
      'Es una persona directa y decidida, que confía en su propio criterio y prefiere tomar la iniciativa antes que esperar instrucciones. Su estilo de comunicación es conciso y orientado a resultados: va al punto, evita rodeos y puede percibirse como impaciente si la conversación se extiende en detalles que considera irrelevantes. Lo que la motiva es el reto, la autonomía y la posibilidad de influir en los resultados; los entornos con exceso de supervisión o burocracia la frustran con rapidez. Bajo presión, intensifica su ritmo y puede volverse más directiva o confrontacional, con menor tolerancia al error ajeno y mayor urgencia en sus comunicaciones. En la toma de decisiones actúa con rapidez, asume el riesgo con naturalidad y prefiere corregir sobre la marcha antes que esperar información perfecta. Con el equipo, tiende a liderar desde el frente: establece el ritmo, define la dirección y espera que los demás sigan; puede subestimar la necesidad de consenso o de explicar el "por qué" detrás de sus decisiones.',
  },
  {
    dimension: 'D' as const,
    subtype: 'low',
    content:
      'Es una persona que prefiere no imponer su criterio y evita tomar el control de una situación si no es estrictamente necesario. Su comunicación es más consultiva que directiva: pregunta, considera la opinión del grupo y no suele interrumpir ni presionar para acelerar una decisión. La motiva trabajar en un entorno donde las decisiones se toman de forma colaborativa y donde no se espera que ella lidere de forma visible; los contextos que exigen que tome el mando de forma permanente le generan tensión. Bajo presión, tiende a ceder espacio a otros antes que escalar o confrontar, lo que puede leerse como pasividad aunque en realidad refleja una preferencia por la armonía sobre el control. En la toma de decisiones es reflexiva, busca validación externa y se incomoda con la incertidumbre; prefiere consenso antes que avanzar sola. Con el equipo, es una presencia cooperativa y poco amenazante, pero puede tener dificultades para sostener una posición cuando hay resistencia o para tomar decisiones impopulares cuando la situación lo requiere.',
  },
  {
    dimension: 'I' as const,
    subtype: 'high',
    content:
      'Es una persona sociable y expresiva, que se energiza con la interacción frecuente con otras personas y comunica con entusiasmo y calidez. Su estilo de comunicación es expansivo: comparte ideas con facilidad, usa el humor y la narrativa personal para conectar, y crea un clima de confianza rápidamente con personas nuevas. Lo que la motiva es el reconocimiento, la colaboración visible y los entornos donde pueda influir a través de las relaciones; el trabajo aislado o la falta de retroalimentación positiva la desconecta. Bajo presión, puede hablar más de lo habitual, buscar apoyo emocional activamente o perder foco en la tarea al priorizar la gestión del clima relacional. En la toma de decisiones se apoya en la intuición y en el consenso del grupo; puede ser influenciable si la opinión de personas cercanas o admiradas va en otra dirección. Con el equipo, es un activo de cohesión: genera entusiasmo, facilita la integración y sostiene la moral; su riesgo es priorizar la armonía sobre la eficiencia o evitar conversaciones difíciles que puedan dañar el vínculo.',
  },
  {
    dimension: 'I' as const,
    subtype: 'low',
    content:
      'Es una persona reservada, que prefiere el trabajo con bajo contacto social y no necesita la interacción frecuente como fuente de energía. Su comunicación es directa y económica: dice lo necesario, no elabora en detalles personales y puede parecer distante para quienes esperan calidez expresiva; sin embargo, es consistente y confiable en lo que comunica. Lo que la motiva es la autonomía, el trabajo de fondo y los entornos donde el resultado cuenta más que la visibilidad; los espacios muy sociales o donde se espera entusiasmo expresivo continuo la agotan. Bajo presión, se repliega: reduce la comunicación, trabaja de forma más independiente y puede pasar desapercibida en situaciones que requieren presencia grupal activa. En la toma de decisiones es más analítica que relacional; no busca consenso por defecto y puede decidir de forma individual sin sentir necesidad de validación social. Con el equipo, aporta desde la calidad del trabajo y la discreción, no desde la animación del grupo; puede tener dificultades para conectar con pares que valoran mucho la dimensión relacional del trabajo.',
  },
  {
    dimension: 'S' as const,
    subtype: 'high',
    content:
      'Es una persona estable y constante, que prefiere la rutina predecible y sostiene compromisos de largo plazo sin perder el ritmo. Su comunicación es tranquila, mesurada y confiable: no reacciona de forma exagerada ante los cambios, escucha con paciencia y no interrumpe; eso la convierte en una interlocutora fácil para personas que necesitan procesar en voz alta. Lo que la motiva es la estabilidad del entorno, las relaciones de confianza construidas con el tiempo y la claridad sobre lo que se espera de ella; los cambios abruptos o la ambigüedad sostenida le generan malestar. Bajo presión, tiende a absorber la tensión sin expresarla, lo que puede acumular desgaste invisible; es lenta para escalar un conflicto o pedir ayuda porque prioriza no alterar el equilibrio del equipo. En la toma de decisiones es metódica y conservadora: necesita tiempo para procesar y prefiere alternativas probadas antes que apuestas novedosas. Con el equipo, es el ancla de la operación: sostiene el ritmo, cumple lo prometido y mantiene la cohesión en momentos de turbulencia; su riesgo es resistir los cambios necesarios o permanecer en situaciones que ya no la sirven por lealtad o inercia.',
  },
  {
    dimension: 'S' as const,
    subtype: 'low',
    content:
      'Es una persona dinámica e inquieta, que se aburre con facilidad en la rutina y busca variedad y cambio de ritmo en su trabajo. Su comunicación refleja ese dinamismo: cambia de tema con agilidad, responde rápido y puede percibirse como impaciente o dispersa en conversaciones largas o repetitivas. Lo que la motiva es la novedad, la variación de tareas y los entornos que evolucionan con frecuencia; los trabajos estructurados con procedimientos fijos la desconectan rápidamente. Bajo presión, puede dispersarse entre múltiples frentes o cambiar de prioridades de forma reactiva, lo que reduce su eficacia en situaciones que requieren foco sostenido. En la toma de decisiones actúa con rapidez y está dispuesta a pivotar cuando la situación cambia; su riesgo es no terminar lo que empieza o subestimar el valor de la consistencia en el tiempo. Con el equipo, aporta energía, ideas nuevas y capacidad de adaptación; puede tener dificultades para sostener compromisos de largo plazo o para acompañar ritmos más lentos sin perder la paciencia.',
  },
  {
    dimension: 'C' as const,
    subtype: 'high',
    content:
      'Es una persona precisa y metódica, que sigue normas y procedimientos con cuidado y basa sus decisiones en datos y análisis antes que en la intuición. Su comunicación es exacta y estructurada: elige las palabras con cuidado, prefiere la escritura sobre la conversación espontánea y puede percibirse como rígida o excesivamente formal por personas con estilos más informales. Lo que la motiva es la calidad, la exactitud y los entornos donde el trabajo bien hecho es valorado; la improvisación, la ambigüedad normativa o los errores evitables la incomodan de forma significativa. Bajo presión, puede paralizarse en el análisis o elevar el estándar de exigencia sobre sí misma y sobre otros, lo que ralentiza la ejecución. En la toma de decisiones necesita información suficiente, tiempo para verificar y claridad sobre los criterios; decide con cuidado y se incomoda cuando se le pide actuar sin datos. Con el equipo, es una referencia de calidad y rigor: detecta errores que otros no ven, mantiene la documentación en orden y defiende los estándares; su riesgo es la sobreingeniería, la dificultad para delegar y la tendencia a criticar el proceso de otros con un nivel de detalle que puede sentirse como fiscalización.',
  },
  {
    dimension: 'C' as const,
    subtype: 'low',
    content:
      'Es una persona más informal frente a las normas y los procedimientos, con menor orientación hacia el detalle formal y mayor tolerancia a la ambigüedad. Su comunicación es directa y pragmática: no se detiene en precisiones formales, puede saltarse pasos del protocolo si considera que el resultado final es el mismo, y se acomoda con facilidad a contextos donde las reglas son flexibles. Lo que la motiva es la libertad de acción y los entornos donde puede moverse con agilidad sin necesidad de justificar cada paso; los procesos muy burocráticos o los controles excesivos le generan resistencia. Bajo presión, puede tomar atajos o desestimar estándares de calidad que en otro momento consideraría secundarios. En la toma de decisiones actúa con rapidez y se apoya más en el juicio propio que en el análisis exhaustivo; acepta la incertidumbre con naturalidad. Con el equipo, aporta agilidad y pragmatismo; su riesgo es subestimar el impacto de los errores que podrían haberse evitado con mayor atención al detalle, o generar fricción con pares que valoran el rigor como parte del trabajo bien hecho.',
  },
]

async function main() {
  console.log('Deleting retired NarrativeContent sections (COMMUNICATION, MOTIVATORS, PRESSURE)...')

  const deleted = await prisma.narrativeContent.deleteMany({
    where: {
      section: {
        in: ['COMMUNICATION', 'MOTIVATORS', 'PRESSURE'] as never[],
      },
    },
  })
  console.log(`  Deleted ${deleted.count} rows.`)

  console.log('Inserting 8 PROFILE_DESCRIPTION rows...')
  for (const row of PROFILE_DESCRIPTION_ROWS) {
    await prisma.narrativeContent.create({
      data: {
        section: 'PROFILE_DESCRIPTION' as never,
        dimension: row.dimension,
        subtype: row.subtype,
        content: row.content,
      },
    })
    console.log(`  Inserted PROFILE_DESCRIPTION / ${row.dimension} / ${row.subtype}`)
  }

  console.log('Done.')
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
