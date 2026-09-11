# Migración Sin Cargo — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar la dependencia de cargos y perfiles ideales del flujo estándar de evaluación e informe, introduciendo autorregistro del evaluado y análisis de rasgos dominantes contra el punto neutro de la escala.

**Architecture:** Schema migration → new scoring function → updated engines (narrative, questions, charts) → new registration API + page → updated admin UI → updated report API → updated PDF. Each task is independently testable; the full suite must pass after every commit.

**Tech Stack:** Next.js 14.2.35, TypeScript, Prisma 7.10.0 + @prisma/adapter-pg, iron-session v9, @react-pdf/renderer v4, Vitest, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-09-11-sin-cargo-design.md` + `/Users/manoloto/Downloads/Arquitectura_Algoritmo_Informe_PDA_v1.md`

## Global Constraints

- Narrative text never hardcoded — always in NarrativeContent DB rows
- Seed `update: {}` — content changes go through migration SQL only
- `candidateId` on Assessment set only by `POST /api/assessments/[token]/register`
- No `fitScore`, `projectionScore`, `riskLevel`, or position data in standard report UI or PDF
- 0 TypeScript errors; all existing 56 tests pass throughout; new tests added per task
- Commit after every task with a descriptive message

---

### Task 1: Schema migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260911070000_sin_cargo/migration.sql`

**Interfaces:**
- Produces: Updated Prisma client types consumed by all subsequent tasks

- [ ] **Step 1: Update prisma/schema.prisma**

Replace the Consultant, Candidate, Assessment, and Report models, and add POTENTIAL to NarrativeSection:

```prisma
enum NarrativeSection {
  COMMUNICATION
  MOTIVATORS
  PRESSURE
  ALERTS
  INTERVIEW_QUESTIONS
  PROJECTION
  INTENSITY
  GAP_ANALYSIS
  POTENTIAL
}

model Consultant {
  id           String       @id @default(cuid())
  name         String
  passwordHash String
  positions    Position[]
  candidates   Candidate[]
  assessments  Assessment[]
  createdAt    DateTime     @default(now())
}

model Candidate {
  id             String       @id @default(cuid())
  consultantId   String
  consultant     Consultant   @relation(fields: [consultantId], references: [id])
  name           String
  lastName       String?
  email          String?
  gender         String?
  birthDate      DateTime?
  consentPrivacy Boolean      @default(false)
  consentComms   Boolean      @default(false)
  assessments    Assessment[]
  createdAt      DateTime     @default(now())
}

model Assessment {
  id              String           @id @default(cuid())
  token           String           @unique @default(cuid())
  consultantId    String
  consultant      Consultant       @relation(fields: [consultantId], references: [id])
  candidateId     String?
  candidate       Candidate?       @relation(fields: [candidateId], references: [id])
  positionId      String?
  position        Position?        @relation(fields: [positionId], references: [id])
  status          AssessmentStatus @default(PENDING)
  startedAt       DateTime?
  completedAt     DateTime?
  durationSeconds Int?
  block3Text      String?
  blockResponses  BlockResponse[]
  report          Report?
  createdAt       DateTime         @default(now())
}

model Report {
  id               String           @id @default(cuid())
  assessmentId     String           @unique
  assessment       Assessment       @relation(fields: [assessmentId], references: [id])
  ppD              Float
  ppI              Float
  ppS              Float
  ppC              Float
  piD              Float
  piI              Float
  piS              Float
  piC              Float
  ptD              Float
  ptI              Float
  ptS              Float
  ptC              Float
  pcD              Float
  pcI              Float
  pcS              Float
  pcC              Float
  maskIndex        Float
  consistencyIndex Float
  consistencyLevel ConsistencyLevel
  contradictions   Int
  fitScore         Float?
  projectionScore  Float?
  riskLevel        RiskLevel?
  pdfUrl           String?
  generatedAt      DateTime         @default(now())
}
```

- [ ] **Step 2: Create migration SQL**

Create file `prisma/migrations/20260911070000_sin_cargo/migration.sql`:

```sql
-- Candidate: new fields
ALTER TABLE "Candidate" ADD COLUMN "lastName" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "gender" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "birthDate" TIMESTAMP(3);
ALTER TABLE "Candidate" ADD COLUMN "consentPrivacy" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Candidate" ADD COLUMN "consentComms" BOOLEAN NOT NULL DEFAULT false;

-- Assessment: add consultantId (required), backfill, then enforce NOT NULL
ALTER TABLE "Assessment" ADD COLUMN "consultantId" TEXT;
UPDATE "Assessment" SET "consultantId" = 'default-consultant';
ALTER TABLE "Assessment" ALTER COLUMN "consultantId" SET NOT NULL;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_consultantId_fkey"
  FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Assessment: make candidateId and positionId nullable
ALTER TABLE "Assessment" ALTER COLUMN "candidateId" DROP NOT NULL;
ALTER TABLE "Assessment" ALTER COLUMN "positionId" DROP NOT NULL;

-- Report: make fit/projection/risk nullable
ALTER TABLE "Report" ALTER COLUMN "fitScore" DROP NOT NULL;
ALTER TABLE "Report" ALTER COLUMN "projectionScore" DROP NOT NULL;
ALTER TABLE "Report" ALTER COLUMN "riskLevel" DROP NOT NULL;

-- NarrativeSection enum: add POTENTIAL
ALTER TYPE "NarrativeSection" ADD VALUE 'POTENTIAL';

-- Data migration: GAP_ANALYSIS texts rewritten for center-based analysis
UPDATE "NarrativeContent" SET "content" = 'La puntuación en Iniciativa se ubica [gap] pts por encima del punto neutro de la escala, lo que indica un rasgo marcado hacia la acción, la toma de decisiones directa y el control sobre el resultado. Verificar en la conversación de seguimiento si este rasgo es una fortaleza consolidada o una tendencia que genera fricción en contextos de trabajo colaborativo.' WHERE "id" = 'gap-D-excess';

UPDATE "NarrativeContent" SET "content" = 'La puntuación en Iniciativa se ubica [gap] pts por debajo del punto neutro de la escala, indicando una menor tendencia a la toma de decisiones unilateral y al control directo. Explorar en la conversación de seguimiento cómo la persona asume la iniciativa cuando el contexto lo requiere.' WHERE "id" = 'gap-D-deficit';

UPDATE "NarrativeContent" SET "content" = 'La puntuación en Vínculo se ubica [gap] pts por encima del punto neutro de la escala, lo que indica una orientación marcada hacia la interacción social, la influencia y la expresividad. Verificar en la conversación de seguimiento si este rasgo es una fortaleza en el entorno actual o si puede traducirse en dispersión o dependencia de la validación externa.' WHERE "id" = 'gap-I-excess';

UPDATE "NarrativeContent" SET "content" = 'La puntuación en Vínculo se ubica [gap] pts por debajo del punto neutro de la escala, indicando una menor necesidad de interacción social como fuente de energía. Explorar en la conversación de seguimiento cómo la persona gestiona entornos que requieren alta frecuencia de contacto interpersonal.' WHERE "id" = 'gap-I-deficit';

UPDATE "NarrativeContent" SET "content" = 'La puntuación en Cadencia se ubica [gap] pts por encima del punto neutro de la escala, lo que indica una orientación marcada hacia la estabilidad, el ritmo sostenido y la consistencia en el tiempo. Verificar en la conversación de seguimiento si este rasgo se traduce en fortaleza en contextos estables o en resistencia ante cambios necesarios.' WHERE "id" = 'gap-S-excess';

UPDATE "NarrativeContent" SET "content" = 'La puntuación en Cadencia se ubica [gap] pts por debajo del punto neutro de la escala, indicando una menor tolerancia a la rutina y mayor preferencia por la variedad y el cambio de ritmo. Explorar en la conversación de seguimiento cómo la persona mantiene el compromiso en tareas de largo plazo que requieren constancia.' WHERE "id" = 'gap-S-deficit';

UPDATE "NarrativeContent" SET "content" = 'La puntuación en Precisión se ubica [gap] pts por encima del punto neutro de la escala, lo que indica una orientación marcada hacia el detalle, las normas y la calidad del resultado. Verificar en la conversación de seguimiento si este rasgo impulsa estándares altos o genera parálisis ante la ambigüedad.' WHERE "id" = 'gap-C-excess';

UPDATE "NarrativeContent" SET "content" = 'La puntuación en Precisión se ubica [gap] pts por debajo del punto neutro de la escala, indicando una menor orientación hacia el detalle formal y las normas establecidas. Explorar en la conversación de seguimiento cómo la persona gestiona contextos que exigen precisión y cumplimiento de procedimientos.' WHERE "id" = 'gap-C-deficit';

-- Data migration: question texts adjusted per §5.4 (remove job-context wording)
UPDATE "NarrativeContent" SET "content" = '¿Cómo maneja el desacuerdo con alguien cuando no tiene la autoridad para decidir?' WHERE "id" = 'iq-D-excess-2';

UPDATE "NarrativeContent" SET "content" = 'Describa una situación en la que tuvo que priorizar la tarea sobre mantener el ambiente social del grupo.' WHERE "id" = 'iq-I-excess-1';

UPDATE "NarrativeContent" SET "content" = '¿Cómo maneja actividades que requieren trabajo aislado y poco contacto con otras personas durante periodos largos?' WHERE "id" = 'iq-I-excess-2';

UPDATE "NarrativeContent" SET "content" = '¿Cómo construye relaciones de confianza con personas que recién conoce?' WHERE "id" = 'iq-I-deficit-2';

UPDATE "NarrativeContent" SET "content" = 'Describa un cambio grande que no esperaba, ¿cómo se adaptó?' WHERE "id" = 'iq-S-excess-1';

UPDATE "NarrativeContent" SET "content" = 'Cuénteme de una situación de conflicto con alguien que se extendió por semanas, ¿cómo lo gestionó?' WHERE "id" = 'iq-S-deficit-2';

UPDATE "NarrativeContent" SET "content" = '¿Cómo maneja una instrucción que contradice el procedimiento establecido?' WHERE "id" = 'iq-C-excess-2';

UPDATE "NarrativeContent" SET "content" = 'Describa cómo verifica la calidad de su propio trabajo antes de darlo por terminado.' WHERE "id" = 'iq-C-deficit-2';
```

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: "Generated Prisma Client" with no errors.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: errors only in files that import the old `computeAllScores(input, ideal)` signature — those are fixed in later tasks. Zero errors in schema-related files.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260911070000_sin_cargo/
git commit -m "feat: schema migration — candidateId optional, consultantId on Assessment, POTENTIAL enum, new Candidate fields"
```

---

### Task 2: computeDistanceToCenter

**Files:**
- Create: `lib/scoring/center.ts`
- Create: `__tests__/scoring/center.test.ts`

**Interfaces:**
- Produces: `computeDistanceToCenter(pc: DimensionVector): Record<Dimension, number>` — consumed by Task 11 (reports API) and Task 12 (reports page)

- [ ] **Step 1: Write the failing test**

Create `__tests__/scoring/center.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeDistanceToCenter } from '../../lib/scoring/center'

describe('computeDistanceToCenter', () => {
  it('returns zero for all neutral dimensions', () => {
    expect(computeDistanceToCenter({ D: 50, I: 50, S: 50, C: 50 }))
      .toEqual({ D: 0, I: 0, S: 0, C: 0 })
  })

  it('returns correct distance for dimension above center', () => {
    const r = computeDistanceToCenter({ D: 75, I: 50, S: 50, C: 50 })
    expect(r.D).toBe(25)
    expect(r.I).toBe(0)
  })

  it('returns correct distance for dimension below center', () => {
    const r = computeDistanceToCenter({ D: 25, I: 50, S: 50, C: 50 })
    expect(r.D).toBe(25)
  })

  it('absolute value: deficit and excess of same magnitude give same distance', () => {
    const above = computeDistanceToCenter({ D: 80, I: 50, S: 50, C: 50 })
    const below = computeDistanceToCenter({ D: 20, I: 50, S: 50, C: 50 })
    expect(above.D).toBe(below.D)
    expect(above.D).toBe(30)
  })

  it('returns correct distances for mixed profile', () => {
    expect(computeDistanceToCenter({ D: 10, I: 90, S: 30, C: 70 }))
      .toEqual({ D: 40, I: 40, S: 20, C: 20 })
  })

  it('handles extreme values', () => {
    expect(computeDistanceToCenter({ D: 0, I: 100, S: 0, C: 100 }))
      .toEqual({ D: 50, I: 50, S: 50, C: 50 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/scoring/center.test.ts
```

Expected: FAIL — "Cannot find module '../../lib/scoring/center'"

- [ ] **Step 3: Implement lib/scoring/center.ts**

```typescript
import type { DimensionVector } from './types'

type Dimension = 'D' | 'I' | 'S' | 'C'

export function computeDistanceToCenter(
  pc: DimensionVector,
): Record<Dimension, number> {
  return {
    D: Math.abs(pc.D - 50),
    I: Math.abs(pc.I - 50),
    S: Math.abs(pc.S - 50),
    C: Math.abs(pc.C - 50),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/scoring/center.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 5: Run full suite to confirm no regression**

```bash
npx vitest run
```

Expected: all previous tests pass + 6 new.

- [ ] **Step 6: Commit**

```bash
git add lib/scoring/center.ts __tests__/scoring/center.test.ts
git commit -m "feat: computeDistanceToCenter — absolute distance from scale midpoint per §3.7"
```

---

### Task 3: Scoring engine update (index.ts)

**Files:**
- Modify: `lib/scoring/index.ts`

**Interfaces:**
- Consumes: `ScoringInput` (unchanged), individual scoring functions from sub-modules
- Produces: `computeAllScores(input: ScoringInput): ScoringResult` — `ideal` removed from signature, `fitScore`/`projectionScore`/`riskLevel` removed from return. `computeFitScore` and `computeProjection` still re-exported for optional use.

- [ ] **Step 1: Update lib/scoring/index.ts**

```typescript
import type { ScoringInput, ScoringResult } from './types'
import { computeProfileVector } from './normalize'
import { computeTextualProfile } from './textual'
import { computeComposite } from './composite'
import { computeMaskIndex } from './mask'
import { computeConsistency } from './consistency'
import { computeFitScore } from './fit'
import { computeProjection } from './projection'

export function computeAllScores(input: ScoringInput): ScoringResult {
  const pp = computeProfileVector(input.block1Responses)
  const mainBlock2 = input.block2Responses.filter(r => !r.isControl)
  const pi = computeProfileVector(mainBlock2)
  const pt = computeTextualProfile(input.block3Text, input.lexicon)
  const pc = computeComposite(pi, pp, pt)
  const maskIndex = computeMaskIndex(pp, pi)
  const { contradictions, consistencyIndex, level: consistencyLevel } =
    computeConsistency(input.block2Responses, input.durationSeconds)

  return { pp, pi, pt, pc, maskIndex, consistencyIndex, consistencyLevel, contradictions }
}

export type { ScoringInput, ScoringResult, DimensionVector } from './types'
export { computeProfileVector } from './normalize'
export { computeTextualProfile } from './textual'
export { computeComposite } from './composite'
export { computeMaskIndex, euclidean } from './mask'
export { computeConsistency } from './consistency'
export { computeFitScore } from './fit'
export { computeProjection } from './projection'
```

- [ ] **Step 2: Run full suite**

```bash
npx vitest run
```

Expected: all tests pass (the 56 unit tests import individual scoring files, not computeAllScores).

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "index.ts"
```

Expected: no errors in lib/scoring/index.ts itself. Errors in callers (api routes, scripts) are expected — fixed in later tasks.

- [ ] **Step 4: Commit**

```bash
git add lib/scoring/index.ts
git commit -m "feat: computeAllScores removes ideal param and fit/projection/risk from result"
```

---

### Task 4: Narrative engine update (narrative.ts)

**Files:**
- Modify: `lib/report/narrative.ts`

**Interfaces:**
- Consumes: `NarrativeRow[]`, `DimensionVector` (pc), `maskIndex: number`, `consistencyLevel`, `candidateName: string`
- Produces:
  - `TraitEntry` type
  - Updated `ReportSections` type (dominantTraits, potential)
  - `buildReportSections(rows, pc, maskIndex, consistencyLevel, candidateName): ReportSections`

- [ ] **Step 1: Rewrite lib/report/narrative.ts**

```typescript
import type { DimensionVector } from '../scoring/types'
import { computeDistanceToCenter } from '../scoring/center'

type Dimension = 'D' | 'I' | 'S' | 'C'

export type NarrativeRow = {
  id: string
  section: string
  dimension: string | null
  subtype: string | null
  questionIndex: number | null
  riskLevel: string | null
  intensity: string | null
  content: string
}

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
  dominantTraits: TraitEntry[]
  interviewQuestions: string[]
  potential: string
}

export const DIM_LABELS: Record<Dimension, string> = {
  D: 'Iniciativa',
  I: 'Vínculo',
  S: 'Cadencia',
  C: 'Precisión',
}

export const DIMS: Dimension[] = ['D', 'I', 'S', 'C']
const TIE_ORDER = DIMS

function dominantDim(pc: DimensionVector): Dimension {
  return TIE_ORDER.reduce((best, dim) => (pc[dim] > pc[best] ? dim : best))
}

function lowestDim(pc: DimensionVector): Dimension {
  return TIE_ORDER.reduce((low, dim) => (pc[dim] < pc[low] ? dim : low))
}

function intensityLevel(score: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (score >= 67) return 'HIGH'
  if (score >= 34) return 'MEDIUM'
  return 'LOW'
}

function findRow(
  rows: NarrativeRow[],
  section: string,
  criteria: Record<string, unknown>,
): NarrativeRow | undefined {
  return rows.find(r => {
    if (r.section !== section) return false
    for (const [k, v] of Object.entries(criteria)) {
      if ((r as Record<string, unknown>)[k] !== v) return false
    }
    return true
  })
}

// §5.2: intensity prefix ends with ": "; first char of paragraph lowercased at render
function withPrefix(prefix: string, content: string): string {
  if (!prefix || !content) return prefix + content
  return prefix + content.charAt(0).toLowerCase() + content.slice(1)
}

// Replaces [gap] marker with unsigned distance value (direction is in the text template)
function buildTraitText(
  rows: NarrativeRow[],
  dim: Dimension,
  distance: number,
  direction: 'excess' | 'deficit',
): string {
  const row = findRow(rows, 'GAP_ANALYSIS', { dimension: dim, subtype: direction })
  if (!row) return ''
  return row.content.replace('[gap]', String(Math.round(distance)))
}

export function buildReportSections(
  rows: NarrativeRow[],
  pc: DimensionVector,
  maskIndex: number,
  consistencyLevel: 'HIGH' | 'MODERATE' | 'LOW',
  candidateName: string,
): ReportSections {
  const consistencyWarning =
    consistencyLevel === 'LOW'
      ? 'ADVERTENCIA: El índice de consistencia de esta evaluación es bajo, lo que reduce la fiabilidad de los resultados. Se recomienda repetir la evaluación antes de tomar una decisión basada en este informe.'
      : null

  const dom = dominantDim(pc)
  const low = lowestDim(pc)
  const level = intensityLevel(pc[dom])

  const intensityRow = findRow(rows, 'INTENSITY', { intensity: level })
  const prefix = intensityRow?.content ?? ''

  const commRow = findRow(rows, 'COMMUNICATION', { dimension: dom })
  const commContent = commRow?.content ?? ''
  const communication = withPrefix(prefix, commContent)

  // Executive summary: first sentence of communication paragraph (no fit/risk metrics)
  const executiveSummary = commContent.split('.')[0] + '.'

  const motivRow = findRow(rows, 'MOTIVATORS', { dimension: dom })
  const motivators = withPrefix(prefix, motivRow?.content ?? '')

  const pressRow = findRow(rows, 'PRESSURE', { dimension: dom })
  const pressure = withPrefix(prefix, pressRow?.content ?? '')

  const alertRow = findRow(rows, 'ALERTS', { dimension: low })
  const maskNote =
    maskIndex > 40
      ? `El Índice de Máscara Social es ${Math.round(maskIndex)}%, indicando un esfuerzo de adaptación social elevado que conviene explorar en una conversación de seguimiento.`
      : null
  const alerts = (alertRow?.content ?? '') + (maskNote ? ' ' + maskNote : '')

  // Dominant traits: sorted by distance to center, descending
  const distances = computeDistanceToCenter(pc)
  const dominantTraits: TraitEntry[] = DIMS
    .map(dim => {
      const distance = distances[dim]
      const direction: 'excess' | 'deficit' = pc[dim] >= 50 ? 'excess' : 'deficit'
      return {
        dim,
        distance,
        direction,
        label: DIM_LABELS[dim],
        text: buildTraitText(rows, dim, distance, direction),
      }
    })
    .sort((a, b) => b.distance - a.distance)

  // Potential: looked up by dominant dimension, [nombre] replaced with candidateName
  const potentialRow = findRow(rows, 'POTENTIAL', { dimension: dom })
  const potential = (potentialRow?.content ?? '').replace('[nombre]', candidateName)

  return {
    consistencyWarning,
    executiveSummary,
    communication,
    motivators,
    pressure,
    alerts,
    maskNote,
    dominantTraits,
    interviewQuestions: [], // populated by caller via selectInterviewQuestions
    potential,
  }
}
```

- [ ] **Step 2: Run full suite**

```bash
npx vitest run
```

Expected: all tests pass (no existing test calls buildReportSections).

- [ ] **Step 3: Verify TypeScript on this file**

```bash
npx tsc --noEmit 2>&1 | grep "narrative"
```

Expected: no errors in narrative.ts.

- [ ] **Step 4: Commit**

```bash
git add lib/report/narrative.ts
git commit -m "feat: narrative engine — dominantTraits replaces gapAnalysis, potential replaces projection, simplified buildReportSections signature"
```

---

### Task 5: Questions engine update (questions.ts)

**Files:**
- Modify: `lib/report/questions.ts`

**Interfaces:**
- Consumes: `NarrativeRow[]`, `pc: DimensionVector`
- Produces: `selectInterviewQuestions(rows, pc): string[]` — sorts by `|pc[dim] - 50|`, subtype by whether pc[dim] ≥ 50

- [ ] **Step 1: Rewrite lib/report/questions.ts**

```typescript
import type { DimensionVector } from '../scoring/types'
import type { NarrativeRow } from './narrative'

type Dimension = 'D' | 'I' | 'S' | 'C'

const TIE_ORDER: Dimension[] = ['D', 'I', 'S', 'C']

export function selectInterviewQuestions(
  rows: NarrativeRow[],
  pc: DimensionVector,
): string[] {
  const ranked = TIE_ORDER
    .map(dim => ({
      dim,
      distance: Math.abs(pc[dim] - 50),
      direction: pc[dim] >= 50 ? 'excess' : 'deficit',
    }))
    .sort((a, b) => {
      const diff = b.distance - a.distance
      // Epsilon guard against float noise; tie broken by TIE_ORDER
      if (Math.abs(diff) > 0.01) return diff
      return TIE_ORDER.indexOf(a.dim) - TIE_ORDER.indexOf(b.dim)
    })

  // Select top 2; add 3rd if within 5 pts of 2nd (max 6 questions total)
  const selected = ranked.slice(0, 2)
  if (ranked.length > 2 && ranked[2].distance >= ranked[1].distance - 5) {
    selected.push(ranked[2])
  }

  const questions: string[] = []
  for (const { dim, direction } of selected) {
    for (const qi of [1, 2] as const) {
      const row = rows.find(
        r =>
          r.section === 'INTERVIEW_QUESTIONS' &&
          r.dimension === dim &&
          r.subtype === direction &&
          r.questionIndex === qi,
      )
      if (row) questions.push(row.content)
    }
  }

  return questions
}
```

- [ ] **Step 2: Run full suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/report/questions.ts
git commit -m "feat: selectInterviewQuestions uses distance-to-center (50) instead of ideal gap per §5.4"
```

---

### Task 6: Charts update (charts.ts)

**Files:**
- Modify: `lib/report/charts.ts`

**Interfaces:**
- Produces: `buildRadarChartSvg(pp: DimensionVector, pi: DimensionVector): string` — radar shows Perfil Percibido (PP, Bloque 1) vs Perfil Interno (PI, Bloque 2)

- [ ] **Step 1: Update buildRadarChartSvg in lib/report/charts.ts**

Replace only the `buildRadarChartSvg` function (keep `buildBarChartSvg` unchanged):

```typescript
export function buildRadarChartSvg(pp: DimensionVector, pi: DimensionVector): string {
  const SIZE = 300
  const CX = SIZE / 2
  const CY = SIZE / 2
  const R = 100
  // Axes: D=top(270°), I=right(0°), S=bottom(90°), C=left(180°)
  const anglesRad = [270, 0, 90, 180].map(deg => (deg * Math.PI) / 180)

  function pt(dimIdx: number, val: number): [number, number] {
    const r = (val / 100) * R
    return [
      CX + r * Math.cos(anglesRad[dimIdx]),
      CY + r * Math.sin(anglesRad[dimIdx]),
    ]
  }

  function polygon(vec: DimensionVector): string {
    return DIMS.map((dim, i) => {
      const [x, y] = pt(i, vec[dim])
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    }).join(' ') + ' Z'
  }

  const gridLines = [25, 50, 75, 100]
    .map(v => `<circle cx="${CX}" cy="${CY}" r="${(v / 100) * R}" fill="none" stroke="#e2e8f0" stroke-width="1"/>`)
    .join('\n')

  const axisLines = DIMS.map((_, i) => {
    const [x, y] = pt(i, 100)
    return `<line x1="${CX}" y1="${CY}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" stroke="#cbd5e1" stroke-width="1"/>`
  }).join('\n')

  const labelOffsets: Record<Dimension, [number, number]> = {
    D: [0, -14], I: [14, 0], S: [0, 14], C: [-14, 0],
  }
  const dimLabels = DIMS.map((dim, i) => {
    const [x, y] = pt(i, 115)
    const [ox, oy] = labelOffsets[dim]
    return `<text x="${(x + ox).toFixed(2)}" y="${(y + oy).toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="11" fill="#475569">${DIM_LABELS[dim]}</text>`
  }).join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  ${gridLines}
  ${axisLines}
  <path d="${polygon(pi)}" fill="rgba(74,127,191,0.15)" stroke="#4a7fbf" stroke-width="1.5" stroke-dasharray="5,3"/>
  <path d="${polygon(pp)}" fill="rgba(224,92,58,0.15)" stroke="#e05c3a" stroke-width="2"/>
  ${dimLabels}
  <circle cx="${CX - 70}" cy="${SIZE - 18}" r="5" fill="#e05c3a"/>
  <text x="${CX - 62}" y="${SIZE - 14}" font-family="sans-serif" font-size="10" fill="#333">Perfil Percibido</text>
  <circle cx="${CX + 30}" cy="${SIZE - 18}" r="5" fill="#4a7fbf"/>
  <text x="${CX + 38}" y="${SIZE - 14}" font-family="sans-serif" font-size="10" fill="#333">Perfil Interno</text>
</svg>`
}
```

- [ ] **Step 2: Run full suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/report/charts.ts
git commit -m "feat: radar chart now shows Perfil Percibido vs Perfil Interno (PP vs PI)"
```

---

### Task 7: Seed — POTENTIAL rows

**Files:**
- Modify: `prisma/seed.ts`

**Interfaces:**
- Consumes: NarrativeSection.POTENTIAL (added in Task 1 migration)
- Produces: 4 new NarrativeContent rows with POTENTIAL section by dominant dimension

- [ ] **Step 1: Add POTENTIAL upserts to prisma/seed.ts**

Add this block at the end of the `main()` function, before `console.log('Seed completo.')`:

```typescript
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
```

- [ ] **Step 2: Run full suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed adds 4 POTENTIAL rows by dominant dimension per §5.5"
```

---

### Task 8: Registration API endpoint

**Files:**
- Create: `app/api/assessments/[token]/register/route.ts`

**Interfaces:**
- Consumes: `POST /api/assessments/[token]/register` with body `{ name, lastName, email, emailConfirm, gender?, birthDate?, consentPrivacy, consentComms? }`
- Produces: 201 `{ candidateId }` on success; 400 on validation failure; 409 if already registered; 404 if token not found

- [ ] **Step 1: Create app/api/assessments/[token]/register/route.ts**

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  req: Request,
  { params }: { params: { token: string } },
) {
  const assessment = await db.assessment.findUnique({
    where: { token: params.token },
  })

  if (!assessment) {
    return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 })
  }

  if (assessment.candidateId) {
    return NextResponse.json({ error: 'Esta evaluación ya tiene un participante registrado' }, { status: 409 })
  }

  const body = await req.json()
  const { name, lastName, email, emailConfirm, gender, birthDate, consentPrivacy, consentComms } = body

  // Validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  }
  if (!lastName || typeof lastName !== 'string' || lastName.trim().length === 0) {
    return NextResponse.json({ error: 'El apellido es requerido' }, { status: 400 })
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'El correo electrónico no es válido' }, { status: 400 })
  }
  if (email !== emailConfirm) {
    return NextResponse.json({ error: 'Los correos electrónicos no coinciden' }, { status: 400 })
  }
  if (!consentPrivacy) {
    return NextResponse.json({ error: 'Debes aceptar las políticas de privacidad para continuar' }, { status: 400 })
  }

  const candidate = await db.candidate.create({
    data: {
      consultantId: assessment.consultantId,
      name: name.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      gender: gender?.trim() ?? null,
      birthDate: birthDate ? new Date(birthDate) : null,
      consentPrivacy: true,
      consentComms: consentComms === true,
    },
  })

  await db.assessment.update({
    where: { id: assessment.id },
    data: { candidateId: candidate.id },
  })

  return NextResponse.json({ candidateId: candidate.id }, { status: 201 })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "register"
```

Expected: no errors in the registration route.

- [ ] **Step 3: Commit**

```bash
git add app/api/assessments/
git commit -m "feat: POST /api/assessments/[token]/register — self-registration endpoint creates Candidate and links to Assessment"
```

---

### Task 9: Evaluation entry redirect + registration page

**Files:**
- Modify: `app/(eval)/[token]/page.tsx`
- Create: `app/(eval)/[token]/register/page.tsx`

**Interfaces:**
- `GET /eval/[token]` redirects to `/eval/[token]/register` if `candidateId` is null, or to the current block if registered
- `GET /eval/[token]/register` shows the self-registration form

- [ ] **Step 1: Update app/(eval)/[token]/page.tsx**

```typescript
import { db } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'

export default async function EvalEntryPage({
  params,
}: {
  params: { token: string }
}) {
  const assessment = await db.assessment.findUnique({
    where: { token: params.token },
    include: { blockResponses: true },
  })

  if (!assessment) notFound()

  // Self-registration required before any block
  if (!assessment.candidateId) {
    redirect(`/eval/${params.token}/register`)
  }

  if (assessment.status === 'COMPLETED') {
    redirect(`/eval/${params.token}/done`)
  }

  const b1Count = assessment.blockResponses.filter(r => r.block === 1).length
  const b2Count = assessment.blockResponses.filter(r => r.block === 2).length

  if (b1Count < 6) redirect(`/eval/${params.token}/block1`)
  if (b2Count < 7) redirect(`/eval/${params.token}/block2`)
  if (!assessment.block3Text) redirect(`/eval/${params.token}/block3`)

  redirect(`/eval/${params.token}/done`)
}
```

- [ ] **Step 2: Create app/(eval)/[token]/register/page.tsx**

```typescript
'use client'
import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function RegisterPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    lastName: '',
    email: '',
    emailConfirm: '',
    gender: '',
    birthDate: '',
    consentPrivacy: false,
    consentComms: false,
  })

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await fetch(`/api/assessments/${params.token}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.status === 201) {
      router.push(`/eval/${params.token}/block1`)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Error al registrar. Intenta nuevamente.')
    }
    setSaving(false)
  }

  const inputClass = 'w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400'
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1'

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 w-full max-w-md">
        <h1 className="text-xl font-semibold text-slate-800 mb-2">Antes de comenzar</h1>
        <p className="text-sm text-slate-500 mb-6">
          Por favor completa tus datos para continuar con la evaluación.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nombre <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className={inputClass}
                placeholder="María"
              />
            </div>
            <div>
              <label className={labelClass}>Apellido <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={e => set('lastName', e.target.value)}
                className={inputClass}
                placeholder="González"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Correo electrónico <span className="text-red-500">*</span></label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className={inputClass}
              placeholder="maria@ejemplo.com"
            />
          </div>

          <div>
            <label className={labelClass}>Confirmar correo <span className="text-red-500">*</span></label>
            <input
              type="email"
              required
              value={form.emailConfirm}
              onChange={e => set('emailConfirm', e.target.value)}
              className={inputClass}
              placeholder="maria@ejemplo.com"
            />
          </div>

          <div>
            <label className={labelClass}>Género</label>
            <select
              value={form.gender}
              onChange={e => set('gender', e.target.value)}
              className={inputClass}
            >
              <option value="">Prefiero no indicar</option>
              <option value="Hombre">Hombre</option>
              <option value="Mujer">Mujer</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Fecha de nacimiento</label>
            <input
              type="date"
              value={form.birthDate}
              onChange={e => set('birthDate', e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={form.consentPrivacy}
                onChange={e => set('consentPrivacy', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">
                Acepto las políticas de privacidad y los términos de uso. <span className="text-red-500">*</span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.consentComms}
                onChange={e => set('consentComms', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm text-slate-600">
                Autorizo recibir comunicaciones relacionadas con esta evaluación.
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded bg-slate-800 px-4 py-2.5 text-sm text-white font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? 'Registrando...' : 'Comenzar evaluación'}
          </button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "register\|eval.*page"
```

Expected: no errors in these files.

- [ ] **Step 4: Commit**

```bash
git add "app/(eval)/[token]/page.tsx" "app/(eval)/[token]/register/"
git commit -m "feat: eval entry redirects to self-registration form if candidateId is null"
```

---

### Task 10: Assessments API + Admin UI

**Files:**
- Modify: `app/api/assessments/route.ts`
- Modify: `app/(admin)/assessments/new/page.tsx`
- Modify: `app/(admin)/assessments/page.tsx`
- Modify: `app/(admin)/assessments/[id]/page.tsx`

**Interfaces:**
- `POST /api/assessments` no longer requires body — uses session for consultantId
- Admin list and detail pages handle null candidate and null position

- [ ] **Step 1: Update app/api/assessments/route.ts**

```typescript
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/session'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const assessments = await db.assessment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      candidate: { select: { name: true, lastName: true } },
      position: { select: { name: true } },
      report: { select: { id: true } },
    },
  })
  return NextResponse.json(assessments)
}

export async function POST() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const assessment = await db.assessment.create({
    data: { consultantId: 'default-consultant' },
  })
  return NextResponse.json(assessment, { status: 201 })
}
```

- [ ] **Step 2: Update app/(admin)/assessments/new/page.tsx**

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewAssessmentPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/assessments', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      router.push(`/assessments/${data.id}`)
    } else {
      setError('Error al crear la evaluación')
    }
    setSaving(false)
  }

  return (
    <main className="p-8 max-w-md">
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Nueva evaluación</h1>
      <p className="text-sm text-slate-500 mb-8">
        Se generará un enlace único. La persona evaluada completará sus datos al abrirlo.
      </p>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={handleCreate}
          disabled={saving}
          className="rounded bg-slate-800 px-5 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? 'Creando...' : 'Generar evaluación'}
        </button>
        <button
          onClick={() => router.push('/assessments')}
          className="rounded border border-slate-300 px-5 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Update app/(admin)/assessments/page.tsx**

Replace the type for Assessment and update candidate/position handling:

```typescript
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Assessment = {
  id: string
  token: string
  status: string
  candidate: { name: string; lastName: string | null } | null
  position: { name: string } | null
  report: { id: string } | null
  createdAt: string
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completada',
}

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/assessments')
      .then(r => r.json())
      .then(setAssessments)
      .finally(() => setLoading(false))
  }, [])

  function candidateName(a: Assessment): string {
    if (!a.candidate) return '—'
    return [a.candidate.name, a.candidate.lastName].filter(Boolean).join(' ')
  }

  return (
    <main className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Evaluaciones</h1>
        <Link
          href="/assessments/new"
          className="rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
        >
          + Nueva evaluación
        </Link>
      </div>
      {loading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : assessments.length === 0 ? (
        <p className="text-slate-500">Sin evaluaciones registradas.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-600">
              <th className="py-2 pr-4">Persona evaluada</th>
              <th className="py-2 pr-4">Estado</th>
              <th className="py-2 pr-4">Informe</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {assessments.map(a => (
              <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 pr-4 font-medium text-slate-800">{candidateName(a)}</td>
                <td className="py-3 pr-4">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    a.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    a.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {STATUS_LABELS[a.status] ?? a.status}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {a.report ? (
                    <Link href={`/reports/${a.report.id}`} className="text-blue-600 hover:underline text-xs">
                      Ver informe
                    </Link>
                  ) : a.status === 'COMPLETED' ? (
                    <GenerateButton assessmentId={a.id} onGenerated={id => {
                      setAssessments(prev => prev.map(x => x.id === a.id ? { ...x, report: { id } } : x))
                    }} />
                  ) : '—'}
                </td>
                <td className="py-3">
                  <Link href={`/assessments/${a.id}`} className="text-slate-500 hover:underline text-xs">
                    Detalle
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="mt-4">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">← Panel</Link>
      </div>
    </main>
  )
}

function GenerateButton({ assessmentId, onGenerated }: { assessmentId: string; onGenerated: (id: string) => void }) {
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    const res = await fetch(`/api/reports/${assessmentId}`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      onGenerated(data.reportId)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={generate}
      disabled={loading}
      className="text-xs text-emerald-700 hover:underline disabled:opacity-50"
    >
      {loading ? 'Generando...' : 'Generar informe'}
    </button>
  )
}
```

- [ ] **Step 4: Update app/(admin)/assessments/[id]/page.tsx**

```typescript
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completada',
}

export default async function AssessmentDetailPage({ params }: { params: { id: string } }) {
  const assessment = await db.assessment.findUnique({
    where: { id: params.id },
    include: {
      candidate: true,
      report: { select: { id: true } },
    },
  })

  if (!assessment) notFound()

  const evalUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/eval/${assessment.token}`
  const displayName = assessment.candidate
    ? [assessment.candidate.name, assessment.candidate.lastName].filter(Boolean).join(' ')
    : null

  return (
    <main className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/assessments" className="text-sm text-slate-500 hover:underline">← Evaluaciones</Link>
      </div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-1">
        {displayName ?? 'Pendiente de registro'}
      </h1>
      {!assessment.candidate && (
        <p className="text-sm text-amber-600 mb-6">
          La persona evaluada aún no ha completado el registro. Comparte el enlace para que pueda comenzar.
        </p>
      )}

      <dl className="space-y-3 text-sm mb-8">
        <div className="flex gap-4">
          <dt className="w-32 text-slate-500 font-medium">Estado</dt>
          <dd>
            <span className={`text-xs px-2 py-0.5 rounded ${
              assessment.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
              assessment.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              {STATUS_LABELS[assessment.status] ?? assessment.status}
            </span>
          </dd>
        </div>
        {assessment.candidate?.email && (
          <div className="flex gap-4">
            <dt className="w-32 text-slate-500 font-medium">Correo</dt>
            <dd>{assessment.candidate.email}</dd>
          </div>
        )}
        {assessment.durationSeconds != null && (
          <div className="flex gap-4">
            <dt className="w-32 text-slate-500 font-medium">Duración</dt>
            <dd>{Math.floor(assessment.durationSeconds / 60)} min {assessment.durationSeconds % 60} seg</dd>
          </div>
        )}
      </dl>

      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mb-6">
        <p className="text-sm font-medium text-slate-700 mb-2">Enlace de evaluación</p>
        <p className="text-sm text-slate-600 break-all font-mono">{evalUrl}</p>
        <p className="text-xs text-slate-400 mt-2">
          {assessment.candidate
            ? `Enlace compartido con ${displayName}.`
            : 'Comparte este enlace para iniciar la evaluación.'}
        </p>
      </div>

      {assessment.report && (
        <Link
          href={`/reports/${assessment.report.id}`}
          className="inline-block rounded bg-slate-800 px-5 py-2 text-sm text-white hover:bg-slate-700"
        >
          Ver informe generado
        </Link>
      )}
    </main>
  )
}
```

- [ ] **Step 5: Run full suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "assessments"
```

Expected: no errors in these files.

- [ ] **Step 7: Commit**

```bash
git add app/api/assessments/route.ts "app/(admin)/assessments/"
git commit -m "feat: assessment creation requires no candidate/position; admin UI handles null candidate"
```

---

### Task 11: Reports API route update

**Files:**
- Modify: `app/api/reports/[id]/route.ts`

**Interfaces:**
- Consumes: `computeAllScores(input)` (no ideal), `computeDistanceToCenter(pc)`, `selectInterviewQuestions(rows, pc)`, `buildReportSections(rows, pc, maskIndex, consistencyLevel, candidateName)`, `buildRadarChartSvg(pp, pi)`
- Produces: `{ reportId, sections, scores }` — scores no longer includes fitScore/projectionScore/riskLevel

- [ ] **Step 1: Rewrite app/api/reports/[id]/route.ts**

```typescript
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/session'
import { db } from '@/lib/db'
import { computeAllScores } from '@/lib/scoring'
import { computeDistanceToCenter } from '@/lib/scoring/center'
import { selectInterviewQuestions } from '@/lib/report/questions'
import { buildReportSections, type NarrativeRow } from '@/lib/report/narrative'
import { buildBarChartSvg, buildRadarChartSvg } from '@/lib/report/charts'
import { ReportDocument } from '@/lib/report/pdf'
import type { BlockResponseInput, LexiconEntry } from '@/lib/scoring/types'

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const assessmentId = params.id

  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    include: { candidate: true, blockResponses: true },
  })

  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
  if (assessment.status !== 'COMPLETED') {
    return NextResponse.json({ error: 'Assessment not completed' }, { status: 422 })
  }

  // Load lexicon
  const lexiconRows = await db.lexiconTerm.findMany({ where: { active: true } })
  const lexicon: LexiconEntry[] = lexiconRows.map(r => ({
    dimension: r.dimension as 'D' | 'I' | 'S' | 'C',
    term: r.term,
    weight: r.weight,
  }))

  // Build scoring input
  const block1Responses: BlockResponseInput[] = assessment.blockResponses
    .filter(r => r.block === 1)
    .map(r => ({
      groupNumber: r.groupNumber,
      mostDim: r.mostDim as 'D' | 'I' | 'S' | 'C',
      leastDim: r.leastDim as 'D' | 'I' | 'S' | 'C',
      isControl: r.isControl,
    }))

  const block2Responses: BlockResponseInput[] = assessment.blockResponses
    .filter(r => r.block === 2)
    .map(r => ({
      groupNumber: r.groupNumber,
      mostDim: r.mostDim as 'D' | 'I' | 'S' | 'C',
      leastDim: r.leastDim as 'D' | 'I' | 'S' | 'C',
      isControl: r.isControl,
    }))

  const scores = computeAllScores({
    block1Responses,
    block2Responses,
    block3Text: assessment.block3Text ?? '',
    durationSeconds: assessment.durationSeconds ?? 0,
    lexicon,
  })

  // Load narrative content
  const narrativeRows = await db.narrativeContent.findMany()
  const rows: NarrativeRow[] = narrativeRows.map(r => ({
    id: r.id,
    section: r.section,
    dimension: r.dimension,
    subtype: r.subtype,
    questionIndex: r.questionIndex,
    riskLevel: r.riskLevel,
    intensity: r.intensity,
    content: r.content,
  }))

  const interviewQuestions = selectInterviewQuestions(rows, scores.pc)

  const candidateName = assessment.candidate
    ? [assessment.candidate.name, assessment.candidate.lastName].filter(Boolean).join(' ')
    : 'Sin nombre'

  const sections = buildReportSections(
    rows,
    scores.pc,
    scores.maskIndex,
    scores.consistencyLevel,
    candidateName,
  )
  sections.interviewQuestions = interviewQuestions

  // Upsert report (fitScore, projectionScore, riskLevel stored as null)
  const report = await db.report.upsert({
    where: { assessmentId },
    update: {
      ppD: scores.pp.D, ppI: scores.pp.I, ppS: scores.pp.S, ppC: scores.pp.C,
      piD: scores.pi.D, piI: scores.pi.I, piS: scores.pi.S, piC: scores.pi.C,
      ptD: scores.pt.D, ptI: scores.pt.I, ptS: scores.pt.S, ptC: scores.pt.C,
      pcD: scores.pc.D, pcI: scores.pc.I, pcS: scores.pc.S, pcC: scores.pc.C,
      maskIndex: scores.maskIndex,
      consistencyIndex: scores.consistencyIndex,
      consistencyLevel: scores.consistencyLevel,
      contradictions: scores.contradictions,
      fitScore: null,
      projectionScore: null,
      riskLevel: null,
    },
    create: {
      assessmentId,
      ppD: scores.pp.D, ppI: scores.pp.I, ppS: scores.pp.S, ppC: scores.pp.C,
      piD: scores.pi.D, piI: scores.pi.I, piS: scores.pi.S, piC: scores.pi.C,
      ptD: scores.pt.D, ptI: scores.pt.I, ptS: scores.pt.S, ptC: scores.pt.C,
      pcD: scores.pc.D, pcI: scores.pc.I, pcS: scores.pc.S, pcC: scores.pc.C,
      maskIndex: scores.maskIndex,
      consistencyIndex: scores.consistencyIndex,
      consistencyLevel: scores.consistencyLevel,
      contradictions: scores.contradictions,
      fitScore: null,
      projectionScore: null,
      riskLevel: null,
    },
  })

  return NextResponse.json({ reportId: report.id, sections, scores })
}
```

- [ ] **Step 2: Run full suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "reports/\[id\]/route"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/api/reports/[id]/route.ts"
git commit -m "feat: reports API uses new scoring/narrative signatures, no ideal, no fit/projection/risk"
```

---

### Task 12: Admin reports page update

**Files:**
- Modify: `app/(admin)/reports/[id]/page.tsx`

**Interfaces:**
- Consumes: updated `selectInterviewQuestions(rows, pc)`, `buildReportSections(rows, pc, maskIndex, consistencyLevel, candidateName)`, `buildRadarChartSvg(pp, pi)`
- Produces: report view with dominantTraits, potential, no fit/risk/position data

- [ ] **Step 1: Rewrite app/(admin)/reports/[id]/page.tsx**

```typescript
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { selectInterviewQuestions } from '@/lib/report/questions'
import { buildReportSections, type NarrativeRow, DIM_LABELS } from '@/lib/report/narrative'
import { buildBarChartSvg, buildRadarChartSvg } from '@/lib/report/charts'

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  )
}

export default async function ReportPage({ params }: { params: { id: string } }) {
  const report = await db.report.findUnique({
    where: { id: params.id },
    include: { assessment: { include: { candidate: true } } },
  })

  if (!report) notFound()

  const pc = { D: report.pcD, I: report.pcI, S: report.pcS, C: report.pcC }
  const pp = { D: report.ppD, I: report.ppI, S: report.ppS, C: report.ppC }
  const pi = { D: report.piD, I: report.piI, S: report.piS, C: report.piC }

  const candidateName = report.assessment.candidate
    ? [report.assessment.candidate.name, report.assessment.candidate.lastName].filter(Boolean).join(' ')
    : 'Sin nombre'

  const narrativeRows = await db.narrativeContent.findMany()
  const rows: NarrativeRow[] = narrativeRows.map(r => ({
    id: r.id,
    section: r.section,
    dimension: r.dimension,
    subtype: r.subtype,
    questionIndex: r.questionIndex,
    riskLevel: r.riskLevel,
    intensity: r.intensity,
    content: r.content,
  }))

  const interviewQuestions = selectInterviewQuestions(rows, pc)
  const sections = buildReportSections(
    rows, pc,
    report.maskIndex,
    report.consistencyLevel as 'HIGH' | 'MODERATE' | 'LOW',
    candidateName,
  )
  sections.interviewQuestions = interviewQuestions

  const barSvg = buildBarChartSvg(pc)
  const radarSvg = buildRadarChartSvg(pp, pi)

  const consistencyLabel =
    report.consistencyLevel === 'HIGH' ? 'Alta' :
    report.consistencyLevel === 'MODERATE' ? 'Moderada' : 'Baja'

  return (
    <main className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <Link href="/assessments" className="text-sm text-slate-500 hover:underline">← Evaluaciones</Link>
        <a
          href={`/api/reports/${report.id}/pdf`}
          className="rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
        >
          Descargar PDF
        </a>
      </div>

      <h1 className="text-2xl font-bold text-slate-800">{candidateName}</h1>
      <p className="text-slate-500 mb-6">
        {new Date(report.generatedAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
      </p>

      {/* 1. Consistencia */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">1. Indicador de Consistencia</h2>
        {sections.consistencyWarning && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-3 text-sm text-red-700">
            {sections.consistencyWarning}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Índice de Consistencia (0–100)" value={String(Math.round(report.consistencyIndex))} />
          <StatBox label="Nivel" value={consistencyLabel} />
        </div>
      </section>

      {/* 2. Resumen ejecutivo */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">2. Resumen Ejecutivo</h2>
        <p className="text-sm text-slate-700">{sections.executiveSummary}</p>
      </section>

      {/* 3. Gráfico de barras */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">3. Perfil Compuesto por Dimensión</h2>
        <div dangerouslySetInnerHTML={{ __html: barSvg }} />
        <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-slate-500">
          {(['D', 'I', 'S', 'C'] as const).map(dim => (
            <div key={dim} className="text-center">
              <p className="font-medium text-slate-700">{DIM_LABELS[dim]}</p>
              <p>PP {Math.round(pp[dim])} · PI {Math.round(pi[dim])} · PC {Math.round(pc[dim])}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Radar */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">4. Perfil Interno vs Perfil Percibido</h2>
        <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: radarSvg }} />
      </section>

      {/* 5. Rasgos dominantes */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">5. Análisis de Rasgos Dominantes</h2>
        {sections.dominantTraits.map(t => (
          <div key={t.dim} className="mb-3">
            <p className="text-sm font-semibold text-slate-700">
              {t.label}: {Math.round(t.distance)} pts {t.direction === 'excess' ? 'por encima' : 'por debajo'} del centro
            </p>
            <p className="text-sm text-slate-600">{t.text}</p>
          </div>
        ))}
      </section>

      {/* 6–9. Secciones narrativas */}
      {[
        { num: 6, title: 'Estilo de Comunicación', text: sections.communication },
        { num: 7, title: 'Motivadores y Desmotivadores', text: sections.motivators },
        { num: 8, title: 'Comportamiento bajo Presión', text: sections.pressure },
        { num: 9, title: 'Señales de Alerta', text: sections.alerts },
      ].map(s => (
        <section key={s.num} className="mb-6">
          <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">{s.num}. {s.title}</h2>
          <p className="text-sm text-slate-700">{s.text}</p>
        </section>
      ))}

      {/* 10. Preguntas de profundización */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">10. Preguntas de Profundización</h2>
        <ol className="list-decimal list-inside space-y-2">
          {sections.interviewQuestions.map((q, i) => (
            <li key={i} className="text-sm text-slate-700">{q}</li>
          ))}
        </ol>
      </section>

      {/* 11. Potencial */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">11. Potencial y Recomendaciones de Desarrollo</h2>
        <p className="text-sm text-slate-700">{sections.potential}</p>
      </section>

      {/* 12. Nota de uso */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">12. Nota de Uso</h2>
        <p className="text-xs text-slate-500 italic">
          Este informe describe el estilo conductual de la persona evaluada y no mide habilidades, conocimientos ni garantiza desempeño en ningún contexto específico. El instrumento está basado en la teoría pública DISC (Marston, 1928) y representa una arquitectura de trabajo no validada psicométricamente. Los resultados deben interpretarse como orientación y complementarse con otras fuentes de información.
        </p>
      </section>

      {report.maskIndex > 40 && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
          <span className="font-semibold">Índice de Máscara Social:</span> {Math.round(report.maskIndex)}% — nivel elevado de esfuerzo de adaptación.
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 2: Run full suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "reports/\[id\]/page"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/(admin)/reports/"
git commit -m "feat: report page — dominantTraits, potential, radar PP vs PI, no fit/risk/position"
```

---

### Task 13: PDF update

**Files:**
- Modify: `lib/report/pdf.tsx`

**Interfaces:**
- Consumes: updated `ReportSections` (dominantTraits, potential), pp/pi instead of fitScore/projectionScore/riskLevel/positionName
- Produces: updated `ReportDocument` with reordered 12-section layout

- [ ] **Step 1: Rewrite lib/report/pdf.tsx**

```typescript
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import type { ReportSections } from './narrative'
import type { DimensionVector } from '../scoring/types'

type Props = {
  candidateName: string
  generatedAt: Date
  sections: ReportSections
  pc: DimensionVector
  pp: DimensionVector
  pi: DimensionVector
  maskIndex: number
  consistencyIndex: number
  consistencyLevel: 'HIGH' | 'MODERATE' | 'LOW'
  barChartSvg: string
  radarChartSvg: string
}

const BRAND = '#2d4a7a'

const s = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Helvetica', fontSize: 10, color: '#222', lineHeight: 1.5 },
  cover: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  coverTitle: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: BRAND, marginBottom: 8, textAlign: 'center' },
  coverSub: { fontSize: 16, color: '#555', marginBottom: 4, textAlign: 'center' },
  coverDate: { fontSize: 10, color: '#888', marginTop: 24, textAlign: 'center' },
  sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: BRAND, marginTop: 20, marginBottom: 6, borderBottom: `1.5pt solid ${BRAND}`, paddingBottom: 3 },
  subTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#333', marginTop: 10, marginBottom: 3 },
  body: { fontSize: 10, color: '#333', marginBottom: 4 },
  warning: { fontSize: 10, color: '#b91c1c', backgroundColor: '#fee2e2', padding: 8, borderRadius: 4, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  label: { fontSize: 9, color: '#666', fontFamily: 'Helvetica-Bold', width: 80 },
  value: { fontSize: 10, color: '#222' },
  note: { fontSize: 9, color: '#555', fontStyle: 'italic', marginTop: 16, borderTop: '0.5pt solid #ccc', paddingTop: 8 },
  qItem: { marginBottom: 6, paddingLeft: 8 },
  qBullet: { fontSize: 10, color: '#333' },
  chart: { alignSelf: 'center', marginVertical: 10 },
  indexRow: { flexDirection: 'row', gap: 24, marginBottom: 8 },
  indexBox: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 4, padding: 8 },
  indexVal: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: BRAND },
  indexLbl: { fontSize: 9, color: '#666' },
})

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

function consistencyLabel(level: 'HIGH' | 'MODERATE' | 'LOW'): string {
  return level === 'HIGH' ? 'Alta' : level === 'MODERATE' ? 'Moderada' : 'Baja'
}

export function ReportDocument(props: Props) {
  const {
    candidateName, generatedAt,
    sections, pc, pp, pi,
    maskIndex, consistencyIndex, consistencyLevel,
    barChartSvg, radarChartSvg,
  } = props

  return (
    <Document>
      {/* Cover */}
      <Page size="A4" style={s.page}>
        <View style={s.cover}>
          <Text style={s.coverTitle}>Informe de Perfil Conductual</Text>
          <Text style={s.coverSub}>{candidateName}</Text>
          <Text style={s.coverDate}>
            Generado el {generatedAt.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
          </Text>
        </View>
      </Page>

      {/* Report body */}
      <Page size="A4" style={s.page}>

        {/* 1. Consistencia */}
        <Text style={s.sectionTitle}>1. Indicador de Consistencia</Text>
        {sections.consistencyWarning && (
          <Text style={s.warning}>{sections.consistencyWarning}</Text>
        )}
        <View style={s.indexRow}>
          <View style={s.indexBox}>
            <Text style={s.indexVal}>{Math.round(consistencyIndex)}</Text>
            <Text style={s.indexLbl}>Índice de Consistencia (0–100)</Text>
          </View>
          <View style={s.indexBox}>
            <Text style={s.indexVal}>{consistencyLabel(consistencyLevel)}</Text>
            <Text style={s.indexLbl}>Nivel</Text>
          </View>
        </View>

        {/* 2. Resumen ejecutivo */}
        <Text style={s.sectionTitle}>2. Resumen Ejecutivo</Text>
        <Text style={s.body}>{sections.executiveSummary}</Text>

        {/* 3. Gráfico de barras */}
        <Text style={s.sectionTitle}>3. Perfil Compuesto por Dimensión</Text>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image es de @react-pdf/renderer, no un elemento HTML; la regla no aplica */}
        <Image style={{ ...s.chart, width: 380, height: 160 }} src={svgToDataUri(barChartSvg)} />
        <View style={s.row}>
          {(['D', 'I', 'S', 'C'] as const).map(dim => (
            <View key={dim} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 9, color: '#666' }}>
                PP {Math.round(pp[dim])} · PI {Math.round(pi[dim])} · PC {Math.round(pc[dim])}
              </Text>
            </View>
          ))}
        </View>

        {/* 4. Radar: Perfil Percibido vs Perfil Interno */}
        <Text style={s.sectionTitle}>4. Perfil Interno vs Perfil Percibido</Text>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image es de @react-pdf/renderer, no un elemento HTML; la regla no aplica */}
        <Image style={{ ...s.chart, width: 260, height: 260 }} src={svgToDataUri(radarChartSvg)} />

        {/* 5. Análisis de rasgos dominantes */}
        <Text style={s.sectionTitle}>5. Análisis de Rasgos Dominantes</Text>
        {sections.dominantTraits.map(t => (
          <View key={t.dim} style={{ marginBottom: 5 }}>
            <Text style={s.subTitle}>
              {t.label}: {Math.round(t.distance)} pts {t.direction === 'excess' ? 'por encima' : 'por debajo'} del centro
            </Text>
            <Text style={s.body}>{t.text}</Text>
          </View>
        ))}

        {/* 6. Comunicación */}
        <Text style={s.sectionTitle}>6. Estilo de Comunicación</Text>
        <Text style={s.body}>{sections.communication}</Text>

        {/* 7. Motivadores */}
        <Text style={s.sectionTitle}>7. Motivadores y Desmotivadores</Text>
        <Text style={s.body}>{sections.motivators}</Text>

        {/* 8. Presión */}
        <Text style={s.sectionTitle}>8. Comportamiento bajo Presión</Text>
        <Text style={s.body}>{sections.pressure}</Text>

        {/* 9. Alertas */}
        <Text style={s.sectionTitle}>9. Señales de Alerta</Text>
        <Text style={s.body}>{sections.alerts}</Text>

        {/* 10. Preguntas de profundización */}
        <Text style={s.sectionTitle}>10. Preguntas de Profundización</Text>
        {sections.interviewQuestions.map((q, i) => (
          <View key={i} style={s.qItem}>
            <Text style={s.qBullet}>{i + 1}. {q}</Text>
          </View>
        ))}

        {/* 11. Potencial */}
        <Text style={s.sectionTitle}>11. Potencial y Recomendaciones de Desarrollo</Text>
        <Text style={s.body}>{sections.potential}</Text>

        {/* 12. Nota de uso */}
        <Text style={s.sectionTitle}>12. Nota de Uso</Text>
        <Text style={s.note}>
          Este informe describe el estilo conductual de la persona evaluada y no mide habilidades, conocimientos ni garantiza desempeño en ningún contexto específico. El instrumento está basado en la teoría pública DISC (Marston, 1928) y representa una arquitectura de trabajo no validada psicométricamente. Los resultados deben interpretarse como orientación y complementarse con otras fuentes de información.
        </Text>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 2: Update app/api/reports/[id]/pdf/route.ts to match new Props**

Read the current pdf route. It calls `ReportDocument` with old props. Update the call to remove `positionName`, `fitScore`, `projectionScore`, `riskLevel`, and change radar from `(pc, ideal)` to `(pp, pi)`:

```typescript
// In the pdf route, locate the ReportDocument call and update to:
// - Remove: positionName, fitScore, projectionScore, riskLevel
// - Change: buildRadarChartSvg(pc, ideal) → buildRadarChartSvg(pp, pi)
// - candidateName: handle null candidate
// - sections: use new buildReportSections + selectInterviewQuestions signatures
```

Read the full current pdf route first with the Read tool, then make targeted edits so the function call matches the new Props type. The key changes will be:

Remove from the call:
```
positionName={...}
fitScore={...}
projectionScore={...}
riskLevel={...}
```

Change:
```typescript
// old
const radarSvg = buildRadarChartSvg(pc, ideal)
// new
const radarSvg = buildRadarChartSvg(pp, pi)
```

Also update `buildReportSections` and `selectInterviewQuestions` calls to new signatures.

- [ ] **Step 3: Run full suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Verify zero TypeScript errors**

```bash
npx tsc --noEmit 2>&1
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add lib/report/pdf.tsx "app/api/reports/[id]/pdf/"
git commit -m "feat: PDF reordered to 12-section layout, dominant traits, potential, PP vs PI radar, no fit/risk/cargo"
```

---

### Task 14: E2E verification + update old E2E script

**Files:**
- Create: `scripts/e2e-sin-cargo.ts`
- Modify: `scripts/e2e-report.ts` (update to new signatures)

**Interfaces:**
- Consumes: all updated functions; runs against live local DB
- Produces: printed verification of all 12 sections with no cargo references

- [ ] **Step 1: Update scripts/e2e-report.ts to new signatures**

```typescript
// Remove `ideal` from computeAllScores call:
const scores = computeAllScores({ block1Responses, block2Responses, block3Text, durationSeconds, lexicon })

// Remove `ideal` from selectInterviewQuestions:
const interviewQuestions = selectInterviewQuestions(rows, scores.pc)

// Update buildReportSections call:
const sections = buildReportSections(rows, scores.pc, scores.maskIndex, scores.consistencyLevel, candidateName)
sections.interviewQuestions = interviewQuestions
```

- [ ] **Step 2: Create scripts/e2e-sin-cargo.ts**

```typescript
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { computeAllScores } from '../lib/scoring'
import { computeDistanceToCenter } from '../lib/scoring/center'
import { selectInterviewQuestions } from '../lib/report/questions'
import { buildReportSections, type NarrativeRow, DIMS, DIM_LABELS } from '../lib/report/narrative'
import type { BlockResponseInput, LexiconEntry } from '../lib/scoring/types'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/conductual'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

// Deterministic test responses: Bloque 1 (PP) — 6 groups
const BLOCK1: BlockResponseInput[] = [
  { groupNumber: 1, mostDim: 'D', leastDim: 'C', isControl: false },
  { groupNumber: 2, mostDim: 'D', leastDim: 'S', isControl: false },
  { groupNumber: 3, mostDim: 'D', leastDim: 'C', isControl: false },
  { groupNumber: 4, mostDim: 'D', leastDim: 'S', isControl: false },
  { groupNumber: 5, mostDim: 'I', leastDim: 'C', isControl: false },
  { groupNumber: 6, mostDim: 'D', leastDim: 'S', isControl: false },
]

// Bloque 2 (PI) — 6 main + 1 control (consistent answers)
const BLOCK2: BlockResponseInput[] = [
  { groupNumber: 1, mostDim: 'D', leastDim: 'C', isControl: false },
  { groupNumber: 2, mostDim: 'D', leastDim: 'S', isControl: false },
  { groupNumber: 3, mostDim: 'D', leastDim: 'C', isControl: false },
  { groupNumber: 4, mostDim: 'D', leastDim: 'S', isControl: false },
  { groupNumber: 5, mostDim: 'I', leastDim: 'C', isControl: false },
  { groupNumber: 6, mostDim: 'D', leastDim: 'S', isControl: false },
  { groupNumber: 7, mostDim: 'D', leastDim: 'C', isControl: true }, // control: consistent with group 1
]

const BLOCK3_TEXT = 'Soy una persona decidida y directa, orientada al resultado y la autonomía. Me motiva el reto y el control sobre mi trabajo.'

async function main() {
  console.log('=== E2E Sin Cargo ===\n')

  // 1. Create Assessment (no candidateId, no positionId)
  const consultant = await prisma.consultant.findUniqueOrThrow({ where: { id: 'default-consultant' } })
  const assessment = await prisma.assessment.create({
    data: { consultantId: consultant.id },
  })
  console.log(`Assessment creado: ${assessment.id} (token: ${assessment.token})`)
  console.log(`candidateId: ${assessment.candidateId ?? 'null — correcto'}\n`)

  // 2. Self-registration: create Candidate and link
  const candidate = await prisma.candidate.create({
    data: {
      consultantId: consultant.id,
      name: 'Ana',
      lastName: 'Prueba',
      email: 'ana@test.com',
      consentPrivacy: true,
    },
  })
  await prisma.assessment.update({
    where: { id: assessment.id },
    data: { candidateId: candidate.id, status: 'IN_PROGRESS', startedAt: new Date() },
  })
  console.log(`Candidata registrada: ${candidate.name} ${candidate.lastName ?? ''}`)
  console.log(`Email: ${candidate.email}, consentPrivacy: ${candidate.consentPrivacy}\n`)

  // 3. Simulate block responses
  for (const r of BLOCK1) {
    await prisma.blockResponse.create({
      data: { assessmentId: assessment.id, block: 1, ...r },
    })
  }
  for (const r of BLOCK2) {
    await prisma.blockResponse.create({
      data: { assessmentId: assessment.id, block: 2, ...r },
    })
  }
  await prisma.assessment.update({
    where: { id: assessment.id },
    data: {
      block3Text: BLOCK3_TEXT,
      status: 'COMPLETED',
      completedAt: new Date(),
      durationSeconds: 420,
    },
  })
  console.log('Respuestas de bloques cargadas.')

  // 4. Load lexicon and compute scores (no ideal)
  const lexiconRows = await prisma.lexiconTerm.findMany({ where: { active: true } })
  const lexicon: LexiconEntry[] = lexiconRows.map(r => ({
    dimension: r.dimension as 'D' | 'I' | 'S' | 'C',
    term: r.term,
    weight: r.weight,
  }))

  const scores = computeAllScores({
    block1Responses: BLOCK1,
    block2Responses: BLOCK2,
    block3Text: BLOCK3_TEXT,
    durationSeconds: 420,
    lexicon,
  })

  console.log('\n=== Perfiles ===')
  for (const dim of DIMS) {
    console.log(`  ${DIM_LABELS[dim]}: PP=${Math.round(scores.pp[dim])} PI=${Math.round(scores.pi[dim])} PT=${Math.round(scores.pt[dim])} PC=${Math.round(scores.pc[dim])}`)
  }
  console.log(`  Máscara: ${Math.round(scores.maskIndex)}% | Consistencia: ${Math.round(scores.consistencyIndex)} (${scores.consistencyLevel})`)
  console.log(`  (sin fitScore, sin projectionScore, sin riskLevel — correcto)\n`)

  // 5. Distances to center
  const distances = computeDistanceToCenter(scores.pc)
  console.log('=== Distancias al centro ===')
  for (const dim of DIMS) {
    const dir = scores.pc[dim] >= 50 ? 'exceso' : 'déficit'
    console.log(`  ${DIM_LABELS[dim]}: ${Math.round(distances[dim])} pts (${dir})`)
  }

  // 6. Narrative sections
  const narrativeRows = await prisma.narrativeContent.findMany()
  const rows: NarrativeRow[] = narrativeRows.map(r => ({
    id: r.id,
    section: r.section,
    dimension: r.dimension,
    subtype: r.subtype,
    questionIndex: r.questionIndex,
    riskLevel: r.riskLevel,
    intensity: r.intensity,
    content: r.content,
  }))

  const candidateName = `${candidate.name} ${candidate.lastName ?? ''}`.trim()
  const questions = selectInterviewQuestions(rows, scores.pc)
  const sections = buildReportSections(rows, scores.pc, scores.maskIndex, scores.consistencyLevel, candidateName)
  sections.interviewQuestions = questions

  console.log('\n=== Secciones del informe (sin cargo) ===')
  console.log(`\n1. consistencyWarning: ${sections.consistencyWarning ?? '(ninguna)'}`)
  console.log(`\n2. executiveSummary:\n   ${sections.executiveSummary}`)
  console.log(`\n5. dominantTraits:`)
  for (const t of sections.dominantTraits) {
    console.log(`   [${t.dim}] ${t.label}: ${Math.round(t.distance)} pts ${t.direction} — ${t.text.slice(0, 60)}...`)
  }
  console.log(`\n6. communication:\n   ${sections.communication.slice(0, 100)}...`)
  console.log(`\n7. motivators:\n   ${sections.motivators.slice(0, 80)}...`)
  console.log(`\n8. pressure:\n   ${sections.pressure.slice(0, 80)}...`)
  console.log(`\n9. alerts:\n   ${sections.alerts.slice(0, 80)}...`)
  console.log(`\n10. profundización (${sections.interviewQuestions.length} preguntas):`)
  sections.interviewQuestions.forEach((q, i) => console.log(`   ${i + 1}. ${q}`))
  console.log(`\n11. potential:\n   ${sections.potential}`)

  // 7. Assertions
  console.log('\n=== Verificaciones ===')
  const checks: [string, boolean][] = [
    ['Assessment creado sin candidateId inicial', true], // verified above
    ['candidateName incluye apellido', candidateName.includes('Prueba')],
    ['dominantTraits tiene 4 entradas', sections.dominantTraits.length === 4],
    ['dominantTraits ordenados por distancia desc', sections.dominantTraits[0].distance >= sections.dominantTraits[1].distance],
    ['potential contiene nombre', sections.potential.includes('Ana')],
    ['potential NO menciona cargo', !sections.potential.toLowerCase().includes('cargo')],
    ['executiveSummary NO menciona ajuste', !sections.executiveSummary.includes('Ajuste')],
    ['executiveSummary NO menciona riesgo', !sections.executiveSummary.includes('Riesgo')],
    ['profundización tiene 4 o 6 preguntas', [4, 6].includes(sections.interviewQuestions.length)],
    ['POTENTIAL row encontrado', sections.potential.length > 0],
    ['GAP_ANALYSIS texts usan "punto neutro"', sections.dominantTraits.every(t => t.text.includes('punto neutro'))],
  ]

  let allPassed = true
  for (const [label, result] of checks) {
    const mark = result ? '✓' : '✗'
    console.log(`  ${mark} ${label}`)
    if (!result) allPassed = false
  }

  // Cleanup
  await prisma.blockResponse.deleteMany({ where: { assessmentId: assessment.id } })
  await prisma.assessment.delete({ where: { id: assessment.id } })
  await prisma.candidate.delete({ where: { id: candidate.id } })

  if (!allPassed) {
    console.log('\n⚠ Una o más verificaciones fallaron.')
    process.exit(1)
  }
  console.log('\n✓ E2E Sin Cargo completado.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

- [ ] **Step 3: Run full test suite (final)**

```bash
npx vitest run
```

Expected: all tests pass. Note the count — it should be ≥ 62 (56 previous + 6 new center tests).

- [ ] **Step 4: Verify zero TypeScript errors**

```bash
npx tsc --noEmit 2>&1
```

Expected: 0 errors.

- [ ] **Step 5: Run the new E2E script**

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/conductual" npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/e2e-sin-cargo.ts 2>&1
```

Expected: all ✓ marks, "E2E Sin Cargo completado." printed.

- [ ] **Step 6: Commit**

```bash
git add scripts/
git commit -m "feat: E2E sin cargo — full flow from self-registration to report sections without position"
```

---

### Final step: build verification + push

- [ ] **Step 1: Run next build against local DB**

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/conductual" npm run build 2>&1
```

Expected: `✓ Compiled successfully`, 0 ESLint errors, 0 type errors.

- [ ] **Step 2: Commit spec + plan**

```bash
git add docs/
git commit -m "docs: spec and implementation plan for sin-cargo migration"
```

- [ ] **Step 3: Push**

```bash
git push origin main
```

---

## Delivery checklist

When all tasks are complete, deliver in one message:

1. Full output of `npx vitest run` (all tests, pass/fail count)
2. Full output of `scripts/e2e-sin-cargo.ts` (all 11 checks, ✓ or ✗)
3. Full output of `npx tsc --noEmit` (must be empty = 0 errors)
4. Explicit list of any deviations taken during implementation (DD-1 through DD-6 are already documented in the spec — any new ones must be added here)
