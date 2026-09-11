# Migración Sin Cargo — Diseño

**Goal:** Convertir la plataforma de evaluación conductual en un estudio puro de la persona, eliminando la dependencia de cargos y perfiles ideales del flujo estándar de evaluación e informe.

**Architecture:** El pipeline estándar (evaluación → informe) elimina Position de su cadena de dependencias. La pantalla de autorregistro en `/eval/[token]/register` se convierte en el punto de entrada al flujo, creando el registro Candidate en ese momento. El motor de puntuación elimina el parámetro ideal; el Análisis de Rasgos Dominantes (distancia al centro de la escala) reemplaza al Análisis de Brecha contra el ideal como driver principal del informe.

**Tech Stack:** Next.js 14.2.35, TypeScript, Prisma 7.10.0 + @prisma/adapter-pg, iron-session v9, @react-pdf/renderer v4, Vitest, Tailwind CSS, PostgreSQL (Supabase).

**Spec:** `/Users/manoloto/Downloads/Arquitectura_Algoritmo_Informe_PDA_v1.md`

---

## Cambios de schema

### Candidate — campos nuevos

```prisma
lastName       String?
gender         String?
birthDate      DateTime?
consentPrivacy Boolean  @default(false)
consentComms   Boolean  @default(false)
```

El campo `name` existente sigue siendo el nombre de pila. El nombre completo se construye como `name + ' ' + (lastName ?? '')` en el código.

### Assessment — cambios

```prisma
consultantId String           // nuevo, requerido, FK a Consultant
candidateId  String?          // era requerido
positionId   String?          // era requerido
```

`consultantId` se establece en el momento de crear la evaluación (el consultor está autenticado). Es la única forma de recuperar el consultantId cuando el candidato se autorregistra y se crea el Candidate.

### Report — campos opcionales

```prisma
fitScore        Float?     // era requerido
projectionScore Float?     // era requerido
riskLevel       RiskLevel? // era requerido
```

Estos campos ya no se calculan ni se almacenan en el flujo estándar. Se dejan en el schema como opcionales para no romper la tabla existente ni descartar la comparación opcional descrita en §3.8 del documento de referencia.

### NarrativeSection enum — valor nuevo

```
POTENTIAL
```

---

## Decisiones de diseño

### DD-1: consultantId en Assessment (no discutido en brainstorming)

Descubierto durante la redacción del plan: hacer `candidateId` y `positionId` opcionales elimina toda ruta para recuperar el `consultantId` cuando el evaluado se autorregistra. La solución es agregar `consultantId String` directamente a Assessment como campo requerido, establecido por el consultor autenticado al crear la evaluación. **Esta adición no fue aprobada en el brainstorming — se reporta explícitamente como desviación del diseño acordado.**

### DD-2: GAP_ANALYSIS reutilizado para rasgos dominantes

Mismo patrón DB (section + dimension + subtype: excess/deficit). El contenido se actualiza vía SQL de migración de datos. El nombre del enum es interno y no se muestra al usuario.

### DD-3: POTENTIAL nuevo; filas PROJECTION existentes intocadas

Las 3 filas `proj-LOW`, `proj-MEDIUM`, `proj-HIGH` permanecen en DB pero nunca se consultan. Son datos históricos, no se borran. Las 4 filas nuevas de POTENTIAL se siembran bajo el nuevo valor de enum.

### DD-4: Textos de GAP_ANALYSIS y preguntas actualizados vía SQL

El seed usa `update: {}` para preservar calibraciones. Los 8 textos de GAP_ANALYSIS (ahora de rasgos dominantes, referenciando el centro en lugar del ideal) y 8 textos de preguntas (ajustados por §5.4 para no sonar a entrevista de trabajo) se actualizan en el SQL de migración como operación única.

### DD-5: Resumen ejecutivo sin métricas de cargo

El nuevo resumen ejecutivo es la primera oración del párrafo de COMMUNICATION para la dimensión dominante (misma regla de truncado: `split('.')[0] + '.'`). No hay fila de fitScore, projectionScore ni riskLevel.

### DD-6: Marcador [gap] en rasgos dominantes es sin signo

`buildTraitText` reemplaza `[gap]` con la distancia absoluta (e.g. `"25"`), sin signo. La dirección (excess/deficit) ya está expresada en la plantilla DB ("por encima" / "por debajo"). No hay prefijo `+` ni `−`.

---

## Firmas de funciones resultantes

```typescript
// lib/scoring/center.ts
export function computeDistanceToCenter(pc: DimensionVector): Record<Dimension, number>

// lib/scoring/index.ts
export function computeAllScores(input: ScoringInput): ScoringResult
// FullScoringResult eliminado; ScoringResult ya tiene todos los campos necesarios
// computeFitScore y computeProjection se siguen exportando individualmente

// lib/report/narrative.ts
export function buildReportSections(
  rows: NarrativeRow[],
  pc: DimensionVector,
  maskIndex: number,
  consistencyLevel: 'HIGH' | 'MODERATE' | 'LOW',
  candidateName: string,
): ReportSections

export type TraitEntry = {
  dim: Dimension
  distance: number
  direction: 'excess' | 'deficit'
  label: string
  text: string
}

export type ReportSections = {
  consistencyWarning: string | null
  executiveSummary: string
  communication: string
  motivators: string
  pressure: string
  alerts: string
  maskNote: string | null
  dominantTraits: TraitEntry[]   // reemplaza gapAnalysis
  interviewQuestions: string[]
  potential: string              // reemplaza projection
}

// lib/report/questions.ts
export function selectInterviewQuestions(
  rows: NarrativeRow[],
  pc: DimensionVector,
): string[]

// lib/report/charts.ts
export function buildRadarChartSvg(pp: DimensionVector, pi: DimensionVector): string
```

---

## Nuevo flujo de evaluación

```
Consultor crea Assessment (consultantId, no candidateId, no positionId)
  → genera token + URL

GET /eval/[token]
  → si candidateId null → redirect /eval/[token]/register
  → si candidateId set  → redirect al bloque pendiente o /done

POST /api/assessments/[token]/register
  → único punto donde se crea Candidate y se asigna Assessment.candidateId
  → 409 si Assessment ya tiene candidateId

Flujo de bloques sin cambios (block1 → block2 → block3 → done)

POST /api/reports/[id]
  → sin ideal, sin fitScore/projectionScore/riskLevel
  → usa computeDistanceToCenter para rasgos dominantes
```

---

## Contenido nuevo del seed (POTENTIAL)

```
potential-D: "[nombre] rinde mejor en entornos donde puede tomar decisiones con autonomía real, medir su progreso por resultados concretos, y enfrentar retos con margen para actuar rápido. Un acompañamiento útil reconoce sus logros de forma directa y evita supervisarla en exceso sobre el cómo, enfocándose en el qué."

potential-I: "[nombre] rinde mejor en entornos con interacción social frecuente, variedad de proyectos, y espacio para expresar ideas antes de que estén completamente pulidas. Un acompañamiento útil reconoce sus aportes en público y le da retroalimentación con calidez, no solo con datos."

potential-S: "[nombre] rinde mejor en entornos estables, con tiempo suficiente para adaptarse a los cambios y relaciones de confianza sostenidas. Un acompañamiento útil anticipa los cambios con antelación y evita presionarla a decidir bajo prisa constante."

potential-C: "[nombre] rinde mejor en entornos con reglas claras, tiempo para analizar antes de actuar, y estándares de calidad bien definidos. Un acompañamiento útil entrega la información completa antes de pedir una decisión y valora la precisión de su trabajo de forma explícita."
```

El marcador `[nombre]` se reemplaza con `candidateName` en `buildReportSections`.
