import { PrismaClient, Dimension, NarrativeSection, IntensityLevel, RiskLevel } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/conductual'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await bcrypt.hash(
    process.env.ADMIN_PASSWORD ?? 'admin-dev-only',
    12
  )
  await prisma.consultant.upsert({
    where: { id: 'default-consultant' },
    update: {},
    create: { id: 'default-consultant', name: 'Administrador', passwordHash },
  })

  const lexiconData: Array<{ dimension: Dimension; term: string; weight: number }> = [
    { dimension: 'D', term: 'decidido', weight: 3 },
    { dimension: 'D', term: 'directo', weight: 3 },
    { dimension: 'D', term: 'competitivo', weight: 3 },
    { dimension: 'D', term: 'exigente', weight: 2 },
    { dimension: 'D', term: 'firme', weight: 2 },
    { dimension: 'D', term: 'audaz', weight: 2 },
    { dimension: 'D', term: 'control', weight: 2 },
    { dimension: 'D', term: 'resultado', weight: 2 },
    { dimension: 'D', term: 'autoridad', weight: 2 },
    { dimension: 'D', term: 'confrontar', weight: 2 },
    { dimension: 'D', term: 'impaciente', weight: 1 },
    { dimension: 'D', term: 'urgencia', weight: 1 },
    { dimension: 'D', term: 'independiente', weight: 1 },
    { dimension: 'D', term: 'riesgo', weight: 1 },
    { dimension: 'D', term: 'cuestionar', weight: 1 },
    { dimension: 'I', term: 'sociable', weight: 3 },
    { dimension: 'I', term: 'entusiasta', weight: 3 },
    { dimension: 'I', term: 'comunicativo', weight: 3 },
    { dimension: 'I', term: 'persuasivo', weight: 3 },
    { dimension: 'I', term: 'expresivo', weight: 2 },
    { dimension: 'I', term: 'optimista', weight: 2 },
    { dimension: 'I', term: 'carismatico', weight: 2 },
    { dimension: 'I', term: 'espontaneo', weight: 2 },
    { dimension: 'I', term: 'extrovertido', weight: 2 },
    { dimension: 'I', term: 'relacionarse', weight: 2 },
    { dimension: 'I', term: 'amigable', weight: 1 },
    { dimension: 'I', term: 'cercano', weight: 1 },
    { dimension: 'I', term: 'positivo', weight: 1 },
    { dimension: 'I', term: 'interactuar', weight: 1 },
    { dimension: 'I', term: 'motivar', weight: 1 },
    { dimension: 'S', term: 'paciente', weight: 3 },
    { dimension: 'S', term: 'calmado', weight: 3 },
    { dimension: 'S', term: 'constante', weight: 3 },
    { dimension: 'S', term: 'tranquilo', weight: 3 },
    { dimension: 'S', term: 'leal', weight: 2 },
    { dimension: 'S', term: 'conciliador', weight: 2 },
    { dimension: 'S', term: 'sereno', weight: 2 },
    { dimension: 'S', term: 'estable', weight: 2 },
    { dimension: 'S', term: 'colaborador', weight: 2 },
    { dimension: 'S', term: 'rutina', weight: 2 },
    { dimension: 'S', term: 'escuchar', weight: 1 },
    { dimension: 'S', term: 'armonia', weight: 1 },
    { dimension: 'S', term: 'apoyo', weight: 1 },
    { dimension: 'S', term: 'disponible', weight: 1 },
    { dimension: 'S', term: 'flexible', weight: 1 },
    { dimension: 'C', term: 'meticuloso', weight: 3 },
    { dimension: 'C', term: 'riguroso', weight: 3 },
    { dimension: 'C', term: 'analitico', weight: 3 },
    { dimension: 'C', term: 'detallista', weight: 3 },
    { dimension: 'C', term: 'ordenado', weight: 3 },
    { dimension: 'C', term: 'cauteloso', weight: 2 },
    { dimension: 'C', term: 'preciso', weight: 2 },
    { dimension: 'C', term: 'norma', weight: 2 },
    { dimension: 'C', term: 'procedimiento', weight: 2 },
    { dimension: 'C', term: 'verificar', weight: 2 },
    { dimension: 'C', term: 'reservado', weight: 1 },
    { dimension: 'C', term: 'logico', weight: 1 },
    { dimension: 'C', term: 'estructura', weight: 1 },
    { dimension: 'C', term: 'calidad', weight: 1 },
    { dimension: 'C', term: 'consistente', weight: 1 },
  ]

  for (const entry of lexiconData) {
    await prisma.lexiconTerm.upsert({
      where: { dimension_term: { dimension: entry.dimension, term: entry.term } },
      update: {},
      create: entry,
    })
  }

  const intensityModifiers: Array<{ id: string; intensity: IntensityLevel; content: string }> = [
    { id: 'intensity-HIGH', intensity: 'HIGH', content: 'Esta característica se manifiesta de forma intensa y consistente: ' },
    { id: 'intensity-MEDIUM', intensity: 'MEDIUM', content: 'Esta característica está presente de forma moderada: ' },
    { id: 'intensity-LOW', intensity: 'LOW', content: 'Esta característica aparece de forma leve u ocasional: ' },
  ]
  for (const m of intensityModifiers) {
    await prisma.narrativeContent.upsert({
      where: { id: m.id },
      update: {},
      create: { id: m.id, section: 'INTENSITY', intensity: m.intensity, content: m.content },
    })
  }

  const alertDims: Array<{ id: string; dimension: Dimension; content: string }> = [
    { id: 'alert-D', dimension: 'D', content: 'podría evitar tomar decisiones difíciles o asumir responsabilidad directa en situaciones de conflicto, prefiriendo que otros tomen la iniciativa.' },
    { id: 'alert-I', dimension: 'I', content: 'podría tener dificultad para generar entusiasmo o adhesión espontánea en un equipo, y podría percibirse como distante en contextos que requieren cercanía social.' },
    { id: 'alert-S', dimension: 'S', content: 'podría mostrar impaciencia ante procesos largos y dificultad para sostener el mismo nivel de compromiso en tareas de rutina o de largo plazo.' },
    { id: 'alert-C', dimension: 'C', content: 'podría mostrar informalidad frente a normas, procesos o el detalle técnico, lo que puede traducirse en errores por apresuramiento en tareas que exigen precisión.' },
  ]
  for (const a of alertDims) {
    await prisma.narrativeContent.upsert({
      where: { id: a.id },
      update: {},
      create: { id: a.id, section: 'ALERTS', dimension: a.dimension, content: a.content },
    })
  }

  type IQEntry = { id: string; dimension: Dimension; subtype: string; questionIndex: number; content: string }
  const interviewQuestions: IQEntry[] = [
    { id: 'iq-D-excess-1', dimension: 'D', subtype: 'excess', questionIndex: 1, content: 'Cuénteme una situación reciente en la que tuvo que ceder el control de una decisión a otra persona, ¿cómo lo manejó?' },
    { id: 'iq-D-excess-2', dimension: 'D', subtype: 'excess', questionIndex: 2, content: '¿Cómo maneja el desacuerdo con un superior cuando no tiene la autoridad para decidir?' },
    { id: 'iq-D-deficit-1', dimension: 'D', subtype: 'deficit', questionIndex: 1, content: 'Describa una situación en la que tuvo que tomar una decisión difícil sin el consenso de todo el equipo, ¿qué hizo?' },
    { id: 'iq-D-deficit-2', dimension: 'D', subtype: 'deficit', questionIndex: 2, content: 'Cuénteme de un momento en que tuvo que confrontar directamente a alguien para lograr un resultado, ¿cómo se sintió?' },
    { id: 'iq-I-excess-1', dimension: 'I', subtype: 'excess', questionIndex: 1, content: 'Describa una situación en la que tuvo que priorizar el resultado técnico sobre mantener el ambiente social del equipo.' },
    { id: 'iq-I-excess-2', dimension: 'I', subtype: 'excess', questionIndex: 2, content: '¿Cómo maneja tareas que requieren trabajo aislado y poco contacto con otras personas durante periodos largos?' },
    { id: 'iq-I-deficit-1', dimension: 'I', subtype: 'deficit', questionIndex: 1, content: 'Cuénteme de una situación en la que tuvo que persuadir a un grupo escéptico para que adoptara su idea.' },
    { id: 'iq-I-deficit-2', dimension: 'I', subtype: 'deficit', questionIndex: 2, content: '¿Cómo construye relaciones de confianza con personas que recién conoce en un contexto profesional?' },
    { id: 'iq-S-excess-1', dimension: 'S', subtype: 'excess', questionIndex: 1, content: 'Describa un cambio organizacional grande que no esperaba, ¿cómo se adaptó?' },
    { id: 'iq-S-excess-2', dimension: 'S', subtype: 'excess', questionIndex: 2, content: 'Cuénteme de una situación en la que tuvo que actuar rápido sin tiempo para planificar con calma.' },
    { id: 'iq-S-deficit-1', dimension: 'S', subtype: 'deficit', questionIndex: 1, content: 'Describa una tarea rutinaria que tuvo que sostener durante un periodo largo, ¿cómo mantuvo el nivel de compromiso?' },
    { id: 'iq-S-deficit-2', dimension: 'S', subtype: 'deficit', questionIndex: 2, content: 'Cuénteme de una situación de conflicto con un compañero que se extendió por semanas, ¿cómo lo gestionó?' },
    { id: 'iq-C-excess-1', dimension: 'C', subtype: 'excess', questionIndex: 1, content: 'Describa una situación en la que tuvo que tomar una decisión con información incompleta.' },
    { id: 'iq-C-excess-2', dimension: 'C', subtype: 'excess', questionIndex: 2, content: '¿Cómo maneja una instrucción que contradice el procedimiento establecido pero que viene de un superior?' },
    { id: 'iq-C-deficit-1', dimension: 'C', subtype: 'deficit', questionIndex: 1, content: 'Cuénteme de un error que cometió por no seguir un procedimiento establecido, ¿qué aprendió?' },
    { id: 'iq-C-deficit-2', dimension: 'C', subtype: 'deficit', questionIndex: 2, content: 'Describa cómo verifica la calidad de su propio trabajo antes de entregarlo.' },
  ]
  for (const q of interviewQuestions) {
    await prisma.narrativeContent.upsert({
      where: { id: q.id },
      update: {},
      create: { id: q.id, section: 'INTERVIEW_QUESTIONS', dimension: q.dimension, subtype: q.subtype, questionIndex: q.questionIndex, content: q.content },
    })
  }

  const projections: Array<{ id: string; riskLevel: RiskLevel; content: string }> = [
    { id: 'proj-LOW', riskLevel: 'LOW', content: 'El perfil conductual de [nombre] muestra un ajuste alto con las exigencias del cargo evaluado, con un [porcentaje] de compatibilidad y un bajo riesgo de fricción en la adaptación. Se recomienda avanzar en el proceso, complementando esta lectura con la verificación en entrevista de los puntos señalados en la sección de señales de alerta.' },
    { id: 'proj-MEDIUM', riskLevel: 'MEDIUM', content: 'El perfil conductual de [nombre] muestra un ajuste moderado con las exigencias del cargo evaluado, con un [porcentaje] de compatibilidad. Existen brechas puntuales, principalmente en [dimensión de mayor brecha], que conviene verificar directamente en entrevista antes de tomar una decisión final.' },
    { id: 'proj-HIGH', riskLevel: 'HIGH', content: 'El perfil conductual de [nombre] muestra un ajuste bajo con las exigencias del cargo evaluado, con un [porcentaje] de compatibilidad. Las brechas identificadas, en particular en [dimensión de mayor brecha], sugieren un periodo de adaptación más largo o mayor necesidad de acompañamiento si se decide avanzar con la contratación.' },
  ]
  for (const p of projections) {
    await prisma.narrativeContent.upsert({
      where: { id: p.id },
      update: {},
      create: { id: p.id, section: 'PROJECTION', riskLevel: p.riskLevel, content: p.content },
    })
  }

  type GapEntry = { id: string; dimension: Dimension; subtype: string; content: string }
  const gapAnalysis: GapEntry[] = [
    {
      id: 'gap-D-excess',
      dimension: 'D',
      subtype: 'excess',
      content: 'El candidato supera el perfil ideal en Iniciativa ([gap] pts), lo que puede traducirse en mayor autonomía e impulso del que el cargo requiere. Verificar en entrevista si esto representa una fortaleza o un exceso de la dimensión.',
    },
    {
      id: 'gap-D-deficit',
      dimension: 'D',
      subtype: 'deficit',
      content: 'El candidato está por debajo del perfil ideal en Iniciativa ([gap] pts), lo que puede representar menor asertividad o capacidad de toma de decisión de la esperada. Se recomienda explorar en entrevista cómo el candidato compensa esta brecha.',
    },
    {
      id: 'gap-I-excess',
      dimension: 'I',
      subtype: 'excess',
      content: 'El candidato supera el perfil ideal en Vínculo ([gap] pts), lo que puede traducirse en mayor orientación social del que el cargo requiere. Verificar en entrevista si esto representa una fortaleza o un exceso de la dimensión.',
    },
    {
      id: 'gap-I-deficit',
      dimension: 'I',
      subtype: 'deficit',
      content: 'El candidato está por debajo del perfil ideal en Vínculo ([gap] pts), lo que puede representar menor capacidad de relacionamiento e influencia de la esperada. Se recomienda explorar en entrevista cómo el candidato compensa esta brecha.',
    },
    {
      id: 'gap-S-excess',
      dimension: 'S',
      subtype: 'excess',
      content: 'El candidato supera el perfil ideal en Cadencia ([gap] pts), lo que puede traducirse en mayor orientación a la estabilidad y la rutina del que el cargo requiere. Verificar en entrevista si esto representa una fortaleza o un exceso de la dimensión.',
    },
    {
      id: 'gap-S-deficit',
      dimension: 'S',
      subtype: 'deficit',
      content: 'El candidato está por debajo del perfil ideal en Cadencia ([gap] pts), lo que puede representar menor paciencia y tolerancia a la rutina de la esperada. Se recomienda explorar en entrevista cómo el candidato compensa esta brecha.',
    },
    {
      id: 'gap-C-excess',
      dimension: 'C',
      subtype: 'excess',
      content: 'El candidato supera el perfil ideal en Precisión ([gap] pts), lo que puede traducirse en mayor apego a normas y procesos del que el cargo requiere. Verificar en entrevista si esto representa una fortaleza o un exceso de la dimensión.',
    },
    {
      id: 'gap-C-deficit',
      dimension: 'C',
      subtype: 'deficit',
      content: 'El candidato está por debajo del perfil ideal en Precisión ([gap] pts), lo que puede representar menor atención al detalle y cumplimiento de procedimientos de la esperada. Se recomienda explorar en entrevista cómo el candidato compensa esta brecha.',
    },
  ]
  for (const g of gapAnalysis) {
    await prisma.narrativeContent.upsert({
      where: { id: g.id },
      update: {},
      create: { id: g.id, section: 'GAP_ANALYSIS', dimension: g.dimension, subtype: g.subtype, content: g.content },
    })
  }

  type Dimension = 'D' | 'I' | 'S' | 'C'
  const potentialDims: Array<{ id: string; dimension: Dimension; content: string }> = [
    {
      id: 'potential-D',
      dimension: 'D',
      content: '[nombre] rinde mejor en entornos donde puede tomar decisiones con autonomía real, medir su progreso por resultados concretos, y enfrentar retos con margen para actuar rápido. Un acompañamiento útil reconoce sus logros de forma directa y evita supervisarla en exceso sobre el cómo, enfocándose en el qué.',
    },
    {
      id: 'potential-I',
      dimension: 'I',
      content: '[nombre] rinde mejor en entornos con interacción social frecuente, variedad de proyectos, y espacio para expresar ideas antes de que estén completamente pulidas. Un acompañamiento útil reconoce sus aportes en público y le da retroalimentación con calidez, no solo con datos.',
    },
    {
      id: 'potential-S',
      dimension: 'S',
      content: '[nombre] rinde mejor en entornos estables, con tiempo suficiente para adaptarse a los cambios y relaciones de confianza sostenidas. Un acompañamiento útil anticipa los cambios con antelación y evita presionarla a decidir bajo prisa constante.',
    },
    {
      id: 'potential-C',
      dimension: 'C',
      content: '[nombre] rinde mejor en entornos con reglas claras, tiempo para analizar antes de actuar, y estándares de calidad bien definidos. Un acompañamiento útil entrega la información completa antes de pedir una decisión y valora la precisión de su trabajo de forma explícita.',
    },
  ]
  for (const p of potentialDims) {
    await prisma.narrativeContent.upsert({
      where: { id: p.id },
      update: {},
      create: { id: p.id, section: 'POTENTIAL', dimension: p.dimension, content: p.content },
    })
  }

  console.log('Seed completo.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
