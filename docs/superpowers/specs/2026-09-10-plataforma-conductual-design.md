# Plataforma Conductual — Documento de Diseño
**Fecha:** 2026-09-10
**Stack:** Next.js 14 (App Router) · TypeScript · Prisma · PostgreSQL · iron-session · @react-pdf/renderer · Vitest
**Fuente de verdad del instrumento:** `Arquitectura_Algoritmo_Informe_PDA.md` (versión aprobada con correcciones de "resultado" y "norma")

---

## 1. Contexto y restricciones transversales

La plataforma administra un instrumento de evaluación conductual propio, basado en la teoría pública DISC (Marston, 1928), y genera un informe extenso orientado a selección de personal. Todo nombre de dimensión, escala visual, paleta de colores e iconografía es una decisión de diseño original; en ningún punto se referencia ni replica ningún instrumento comercial existente.

El instrumento es una arquitectura de trabajo no validada psicométricamente. Cada informe exportado debe incluir la nota de uso definida en §4 del documento de referencia.

El banco de párrafos narrativos (§5 del documento de referencia) y el diccionario léxico (§6) se almacenan como contenido editable en base de datos, nunca como constantes en el código. Esto permite recalibración sin cambios de desarrollo.

---

## 2. Arquitectura general

### 2.1 Estructura de carpetas

```
/
├── app/
│   ├── (admin)/                  # Rutas protegidas por iron-session
│   │   ├── layout.tsx            # Guard de sesión
│   │   ├── dashboard/page.tsx
│   │   ├── positions/
│   │   │   ├── page.tsx          # Lista de cargos
│   │   │   └── [id]/page.tsx     # Crear / editar cargo + perfil ideal
│   │   ├── candidates/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── assessments/
│   │   │   ├── page.tsx          # Lista + creación (asigna candidato a cargo)
│   │   │   └── [id]/page.tsx     # Detalle + link para candidato
│   │   ├── reports/
│   │   │   └── [id]/page.tsx     # Ver informe + botón de exportar PDF
│   │   └── settings/
│   │       ├── lexicon/page.tsx  # Editar términos y pesos del diccionario
│   │       └── templates/page.tsx # Editar banco de párrafos y preguntas
│   ├── eval/[token]/             # Rutas públicas del evaluado (sin login)
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Entry point → redirect a block1
│   │   ├── block1/page.tsx       # 6 grupos — Percepción externa
│   │   ├── block2/page.tsx       # 7 grupos — Autopercepción
│   │   ├── block3/page.tsx       # Texto libre
│   │   └── done/page.tsx         # Pantalla de cierre
│   ├── login/page.tsx
│   └── api/
│       ├── auth/route.ts         # POST login / POST logout
│       ├── assessments/[token]/
│       │   ├── block1/route.ts   # PATCH — guardar respuestas B1
│       │   ├── block2/route.ts   # PATCH — guardar respuestas B2
│       │   ├── block3/route.ts   # PATCH — guardar texto + completar
│       │   └── start/route.ts    # POST — registrar startedAt
│       └── reports/[id]/
│           ├── route.ts          # POST — generar informe
│           └── pdf/route.ts      # GET — stream del PDF
├── lib/
│   ├── scoring/
│   │   ├── normalize.ts          # Normalización bruto → 0-100
│   │   ├── textual.ts            # Perfil Textual + suffix stripping
│   │   ├── composite.ts          # Perfil Compuesto
│   │   ├── mask.ts               # Índice de Máscara Social
│   │   ├── consistency.ts        # Índice de Consistencia
│   │   ├── fit.ts                # Ajuste al Cargo
│   │   ├── projection.ts         # Proyección de Desempeño
│   │   └── index.ts              # Orquestador (llama a todos en orden)
│   ├── report/
│   │   ├── narrative.ts          # Selección de párrafos del banco
│   │   ├── questions.ts          # Selección de preguntas de entrevista
│   │   ├── pdf.tsx               # Componente @react-pdf/renderer
│   │   └── charts.ts             # SVG parametrizado (barras + radar)
│   └── db.ts                     # Instancia singleton de PrismaClient
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                   # Datos iniciales: consultor, léxico, plantillas
└── __tests__/
    └── scoring/                  # Vitest — solo motor de puntuación
```

### 2.2 Flujo de extremo a extremo

```
Consultor crea candidato + asignación a cargo
    → Assessment creado con token único (cuid)
    → Consultor comparte URL: /eval/[token]

Candidato abre /eval/[token]
    → GET verifica token válido y status != COMPLETED
    → POST /api/assessments/[token]/start → registra startedAt, status = IN_PROGRESS
    → Bloque 1: selección libre de 8 palabras de 24 → POST block1
    → Bloque 2 Parte 1: selección libre de 8 palabras de 24 principales → POST block2
    → Bloque 2 Parte 2: decisión explícita sí/no sobre 4 palabras de control
      (una por una, obligatoria antes de avanzar) → POST block2/control
    → Bloque 3 (texto libre) → POST block3 → registra completedAt,
      durationSeconds, status = COMPLETED

Consultor abre /admin/reports/[assessmentId]
    → POST /api/reports/[id] → ejecuta motor de puntuación →
      ejecuta motor narrativo → persiste Report → retorna datos
    → GET /api/reports/[id]/pdf → genera y descarga PDF
```

---

## 3. Autenticación

**Mecanismo:** iron-session (cookie httpOnly firmada con SECRET_KEY, sin base de datos de sesiones).

- `POST /api/auth` con `{ password }` → compara contra `ADMIN_PASSWORD` en env → setea cookie de sesión.
- El layout de `(admin)/` verifica la cookie en cada request del servidor. Si no existe → redirect a `/login`.
- El candidato accede a `/eval/[token]` sin ningún tipo de autenticación; la validez del token es el único control de acceso.

**Variables de entorno requeridas:**
```
DATABASE_URL=
ADMIN_PASSWORD=        # hash bcrypt de la contraseña
SESSION_SECRET=        # mínimo 32 chars para iron-session
```

**Preparación para multi-consultor (futuro):** La tabla `Consultant` ya existe en el schema. Cuando se implemente multi-tenancy, se reemplaza iron-session por NextAuth, se agrega pantalla de registro/login, y el `consultantId` ya presente en `Position` y `Candidate` activa el aislamiento de datos por fila. No se requiere migración de schema.

---

## 4. Modelo de datos (Prisma schema completo)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Dimension {
  D  // Dominancia
  I  // Influencia
  S  // Estabilidad
  C  // Cumplimiento
}

enum AssessmentStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
}

enum ConsistencyLevel {
  HIGH      // 85–100
  MODERATE  // 60–84
  LOW       // < 60
}

enum RiskLevel {
  LOW     // 75–100
  MEDIUM  // 50–74
  HIGH    // < 50
}

enum NarrativeSection {
  COMMUNICATION        // §5.3 Estilo de comunicación
  MOTIVATORS           // §5.3 Motivadores y desmotivadores
  PRESSURE             // §5.3 Comportamiento bajo presión
  ALERTS               // §5.3 Señales de alerta (dimensión más baja)
  INTERVIEW_QUESTIONS  // §5.4 Preguntas de entrevista
  PROJECTION           // §5.5 Proyección de desempeño
  INTENSITY            // §5.2 Modificadores de intensidad
}

enum IntensityLevel {
  HIGH    // puntaje 67–100
  MEDIUM  // puntaje 34–66
  LOW     // puntaje 0–33
}

model Consultant {
  id           String       @id @default(cuid())
  name         String
  passwordHash String
  positions    Position[]
  candidates   Candidate[]
  createdAt    DateTime     @default(now())
}

model Position {
  id           String       @id @default(cuid())
  consultantId String
  consultant   Consultant   @relation(fields: [consultantId], references: [id])
  name         String
  description  String?
  idealD       Float        // Perfil Ideal Dominancia, escala 0–100
  idealI       Float
  idealS       Float
  idealC       Float
  assessments  Assessment[]
  createdAt    DateTime     @default(now())
}

model Candidate {
  id           String       @id @default(cuid())
  consultantId String
  consultant   Consultant   @relation(fields: [consultantId], references: [id])
  name         String
  email        String?
  assessments  Assessment[]
  createdAt    DateTime     @default(now())
}

model Assessment {
  id              String           @id @default(cuid())
  token           String           @unique @default(cuid())
  candidateId     String
  candidate       Candidate        @relation(fields: [candidateId], references: [id])
  positionId      String
  position        Position         @relation(fields: [positionId], references: [id])
  status          AssessmentStatus @default(PENDING)
  startedAt       DateTime?
  completedAt     DateTime?
  durationSeconds Int?             // completedAt - startedAt, en segundos
  block3Text      String?
  blockResponses  BlockResponse[]
  report          Report?
  createdAt       DateTime         @default(now())
}

// Una fila por grupo respondido.
// Bloque 1: groupNumber 1–6, isControl siempre false.
// Bloque 2: groupNumber 1–7, isControl true solo para groupNumber 7.
model BlockResponse {
  id           String     @id @default(cuid())
  assessmentId String
  assessment   Assessment @relation(fields: [assessmentId], references: [id])
  block        Int        // 1 o 2
  groupNumber  Int        // 1–6 (B1) o 1–7 (B2)
  isControl    Boolean    @default(false)
  mostDim      Dimension
  leastDim     Dimension

  @@unique([assessmentId, block, groupNumber])
}

// Todos los vectores calculados se persisten para auditoría.
// Un Report se crea al momento de generar el informe, después de COMPLETED.
model Report {
  id               String           @id @default(cuid())
  assessmentId     String           @unique
  assessment       Assessment       @relation(fields: [assessmentId], references: [id])
  // Perfil Percibido (Bloque 1 normalizado)
  ppD              Float
  ppI              Float
  ppS              Float
  ppC              Float
  // Perfil Interno (Bloque 2 normalizado, sin grupo de control)
  piD              Float
  piI              Float
  piS              Float
  piC              Float
  // Perfil Textual (Bloque 3 normalizado)
  ptD              Float
  ptI              Float
  ptS              Float
  ptC              Float
  // Perfil Compuesto = PI×0.60 + PP×0.25 + PT×0.15
  pcD              Float
  pcI              Float
  pcS              Float
  pcC              Float
  // Índices
  maskIndex        Float            // 0–100
  consistencyIndex Float            // 0–100
  consistencyLevel ConsistencyLevel
  contradictions   Int              // 0, 1 o 2
  fitScore         Float            // Ajuste al Cargo 0–100
  projectionScore  Float            // Proyección 0–100
  riskLevel        RiskLevel
  pdfUrl           String?
  generatedAt      DateTime         @default(now())
}

// Diccionario léxico editable (§6 del documento de referencia)
// term: forma canónica en minúsculas sin acentos (ej: "meticuloso", "norma")
model LexiconTerm {
  id        String    @id @default(cuid())
  dimension Dimension
  term      String
  weight    Int       // 1, 2 o 3
  active    Boolean   @default(true)

  @@unique([dimension, term])
}

// Banco de contenido narrativo editable (§5 del documento de referencia)
// Campos opcionales según la sección:
//   COMMUNICATION / MOTIVATORS / PRESSURE: solo dimension
//   ALERTS: solo dimension (dimensión más baja del perfil)
//   INTERVIEW_QUESTIONS: dimension + subtype ("excess"|"deficit") + questionIndex (1|2)
//   PROJECTION: solo riskLevel
//   INTENSITY: solo intensity (prefijo de modificador)
model NarrativeContent {
  id            String           @id @default(cuid())
  section       NarrativeSection
  dimension     Dimension?
  subtype       String?          // "excess" o "deficit" — solo para INTERVIEW_QUESTIONS
  questionIndex Int?             // 1 o 2 — solo para INTERVIEW_QUESTIONS
  riskLevel     RiskLevel?       // solo para PROJECTION
  intensity     IntensityLevel?  // solo para INTENSITY
  content       String
}
```

---

## 5. Motor de puntuación (funciones puras)

Todas las funciones en `lib/scoring/` son **puras** (sin efectos secundarios, sin acceso a base de datos) y deben tener cobertura de pruebas unitarias completa en `__tests__/scoring/` con Vitest.

### 5.1 Normalización de puntaje bruto (`normalize.ts`)

```
rawScore ∈ {-6, -5, ..., +6}
normalizedScore = (rawScore + 6) / 12 × 100
```

- Rango de entrada: −6 a +6 (6 grupos × ±1 punto por dimensión).
- Rango de salida: 0 a 100 exactos (sin redondeo).
- Esta función se aplica a cada dimensión de Bloque 1 (→ Perfil Percibido) y Bloque 2 grupos 1–6 (→ Perfil Interno). El grupo 7 de control no entra en esta normalización.

**Tabla de referencia completa (sin aproximación):**

| Bruto | Normalizado |
|-------|-------------|
| −6 | 0 |
| −5 | 8.333… |
| −4 | 16.666… |
| −3 | 25 |
| −2 | 33.333… |
| −1 | 41.666… |
| 0 | 50 |
| +1 | 58.333… |
| +2 | 66.666… |
| +3 | 75 |
| +4 | 83.333… |
| +5 | 91.666… |
| +6 | 100 |

Los valores se mantienen como `number` de JavaScript (float 64-bit) durante todo el cálculo. Se redondean únicamente en capa de presentación (display), no en los cálculos intermedios.

### 5.2 Puntaje bruto por bloque (`normalize.ts`)

Para cada bloque, iterar sobre las respuestas de los grupos válidos (Bloque 1: todos; Bloque 2: groupNumber 1–6, excluir grupo 7):

```
rawScore[dim] = Σ (+1 si mostDim === dim) + Σ (−1 si leastDim === dim)
```

### 5.3 Perfil Textual (`textual.ts`)

**Entradas:** texto libre (string), lista activa de LexiconTerm desde base de datos.

**Algoritmo:**
1. Normalizar texto: minúsculas, eliminar acentos (NFD + strip combining marks), eliminar puntuación.
2. Tokenizar por espacios.
3. Para cada token, aplicar suffix-stripping para obtener forma canónica:
   - Si termina en `as` → reemplazar por `o`
   - Si termina en `os` → reemplazar por `o`
   - Si termina en `a` → reemplazar por `o`
   - Si termina en `es` → quitar `es`
   - Si termina en `s` → quitar `s`
   - Intentar cada regla en orden; usar la primera que produzca un match en el diccionario
   - Si ninguna regla produce match, usar el token original
4. Para cada dimensión, hacer `Set` de términos del token que matchean el diccionario activo. **Cada término cuenta máximo una vez por texto**, independientemente de cuántas veces aparezca.
5. Puntaje bruto por dimensión = suma de `weight` de los términos encontrados (sin repetición).
6. Denominador por dimensión = suma de `weight` de **todos los términos activos de esa dimensión** en el diccionario (calculado dinámicamente en cada ejecución, no hardcodeado).
7. Normalización: `ptScore[dim] = (rawScore[dim] / denominator[dim]) × 100`
8. Si `denominator[dim] === 0` (diccionario vacío para esa dimensión): `ptScore[dim] = 0`.

**Limitación documentada:** formas reflexivas (`relacionarse`), infinitivos conjugados (`me relaciono`), y femeninos formados por adición (no por sustitución de `-o` → `-a`) no son capturados por las reglas de suffix-stripping. El consultor puede agregar esas variantes como términos independientes en el panel de calibración.

### 5.4 Perfil Compuesto (`composite.ts`)

```
PC[dim] = clamp(PI[dim]×0.60 + PP[dim]×0.25 + PT[dim]×0.15, 0, 100)
```

Cuando PT está indefinido (texto sin coincidencias léxicas), los pesos se redistribuyen proporcionalmente y se aplica el mismo límite:

```
PC[dim] = clamp(PI[dim]×(12/17) + PP[dim]×(5/17), 0, 100)
```

**Por qué es necesario el límite:** PP y PI están acotados en [0, 100] por dimensión (cupo fijo de 8 palabras, máximo 6 por dimensión). PT no está acotado de la misma forma: la normalización relativa `PT[dim] = (4/3)×100×raw[dim]/Σraw` puede alcanzar 133.33 cuando todo el peso léxico del texto se concentra en una sola dimensión. Sin el límite, combinar PI=100 + PP=100 + PT=133.33 produce PC = 60+25+20 = 105, rompiendo la escala [0, 100] que usan la distancia al centro, el gráfico de barras y las barras de Tendencias.

**Convención de almacenamiento — PT indefinido:** cuando `computeTextualProfile` retorna `null` (texto sin coincidencias léxicas), los campos `ptD/ptI/ptS/ptC` del modelo `Report` se almacenan como `0.0`. Esto es una convención de representación, **no un resultado de la normalización relativa**: la normalización relativa no puede producir (0, 0, 0, 0) porque, si hay cualquier coincidencia léxica, la suma Σraw > 0 garantiza que al menos una dimensión es positiva. Por lo tanto, `ptD=ptI=ptS=ptC=0.0` en la base de datos significa exclusivamente "texto sin coincidencias", y puede ser interpretado como PT indefinido sin ambigüedad. El campo `ptDefined` en `ScoringResult` (runtime) registra esta distinción explícitamente en código.

### 5.5 Índice de Máscara Social (`mask.ts`)

```
euclidean(PP, PI) = sqrt((PP.D − PI.D)² + (PP.I − PI.I)² + (PP.S − PI.S)² + (PP.C − PI.C)²)
maxDistance = sqrt(4 × 100²) = 200
maskIndex = (euclidean(PP, PI) / maxDistance) × 100
```

Umbral de interpretación: maskIndex > 40 → señal de alto esfuerzo de adaptación social.

### 5.6 Índice de Consistencia (`consistency.ts`)

El instrumento verifica consistencia mediante 4 pares de control, uno por dimensión. Cada par consiste en una palabra principal del Bloque 2 (D1, I1, S1, C1) y su sinónimo semántico presentado de forma separada en la Parte 2 del Bloque 2.

**Estructura del par:**
- `mainKey`: palabra principal (ej. D1 = "Decidido"), seleccionada en Parte 1 junto con las otras 23 palabras principales.
- `controlKey`: sinónimo (ej. ctrl_D = "Resuelto"), respondido en Parte 2 como decisión explícita sí/no.

**Paso 1 — Contradicciones:**

Un par es contradictorio si exactamente una de sus dos palabras está marcada:

```
for each pair (mainKey, controlKey):
  mainSelected   = mainKey ∈ block2Part1Selections
  controlMarked  = controlKey marked YES in block2Part2
  contradiction  = mainSelected XOR controlMarked

contradictions ∈ {0, 1, 2, 3, 4}
rawConsistency = (1 − contradictions / 4) × 100
```

Valores: 0 contradicciones → 100; 1 → 75; 2 → 50; 3 → 25; 4 → 0.

**Paso 2 — Ajuste por tiempo:**

```
durationMinutes = durationSeconds / 60
if (durationMinutes < 3):
    consistencyIndex = min(rawConsistency, 60)
else:
    consistencyIndex = rawConsistency
```

**Paso 3 — Nivel:**

| Contradicciones | rawConsistency | Nivel |
|-----------------|---------------|-------|
| 0 | 100 | HIGH |
| 1 | 75 | HIGH |
| 2 | 50 | MODERATE |
| 3–4 | 0–25 | LOW |

**Fundamento del diseño:** al separar el presupuesto de las palabras de control del presupuesto de selección principal, la coincidencia deja de ser una restricción de presupuesto y pasa a ser una señal semántica pura. Bajo esta estructura, un respondente genuino obtiene 0–1 contradicciones con probabilidad ~95–97 % (promedio de los cuatro pares aprobados); un respondente que responde aleatoriamente en la Parte 2 obtiene 0–1 contradicciones con probabilidad ~31 %.

**Limitación conocida — estrategia "siempre No":** si un evaluado responde "No" a las cuatro palabras de control sin leerlas, obtiene 0–1 contradicciones con probabilidad ~59 %, lo que puede resultar en HIGH o MODERATE aun sin haber respondido con cuidado. El mecanismo no detecta de forma fiable esta forma específica de respuesta descuidada. La presentación secuencial obligatoria (una decisión por pantalla) reduce la probabilidad de que ocurra por inercia, pero no la elimina. Este es el límite de discriminación del diseño actual con 4 pares binarios.

### 5.7 Ajuste al Cargo (`fit.ts`)

```
euclidean(PC, ideal) = sqrt((PC.D − ideal.D)² + (PC.I − ideal.I)² + (PC.S − ideal.S)² + (PC.C − ideal.C)²)
maxDistance = 200
fitScore = 100 − (euclidean(PC, ideal) / maxDistance) × 100
```

### 5.8 Proyección de Desempeño (`projection.ts`)

```
stabilityComponent = (PC.S + PC.C) / 2
projectionScore = (fitScore × 0.50) + ((100 − maskIndex) × 0.20) + (stabilityComponent × 0.30)
```

Niveles de riesgo de adaptación:

| Rango | Nivel |
|-------|-------|
| 75–100 | LOW |
| 50–74 | MEDIUM |
| < 50 | HIGH |

---

## 6. Diccionario léxico — seed inicial (`prisma/seed.ts`)

Formas canónicas en minúsculas sin acentos, según Sección 6 del documento de referencia con correcciones aprobadas (`resultado` y `norma`).

### Dominancia

| term | weight |
|------|--------|
| decidido | 3 |
| directo | 3 |
| competitivo | 3 |
| exigente | 2 |
| firme | 2 |
| audaz | 2 |
| control | 2 |
| resultado | 2 |
| autoridad | 2 |
| confrontar | 2 |
| impaciente | 1 |
| urgencia | 1 |
| independiente | 1 |
| riesgo | 1 |
| cuestionar | 1 |

**Denominador actual con seed inicial: 28**

### Influencia

| term | weight |
|------|--------|
| sociable | 3 |
| entusiasta | 3 |
| comunicativo | 3 |
| persuasivo | 3 |
| expresivo | 2 |
| optimista | 2 |
| carismatico | 2 |
| espontaneo | 2 |
| extrovertido | 2 |
| relacionarse | 2 |
| amigable | 1 |
| cercano | 1 |
| positivo | 1 |
| interactuar | 1 |
| motivar | 1 |

**Denominador actual con seed inicial: 29**

### Estabilidad

| term | weight |
|------|--------|
| paciente | 3 |
| calmado | 3 |
| constante | 3 |
| tranquilo | 3 |
| leal | 2 |
| conciliador | 2 |
| sereno | 2 |
| estable | 2 |
| colaborador | 2 |
| rutina | 2 |
| escuchar | 1 |
| armonia | 1 |
| apoyo | 1 |
| disponible | 1 |
| flexible | 1 |

**Denominador actual con seed inicial: 29**

### Cumplimiento

| term | weight |
|------|--------|
| meticuloso | 3 |
| riguroso | 3 |
| analitico | 3 |
| detallista | 3 |
| ordenado | 3 |
| cauteloso | 2 |
| preciso | 2 |
| norma | 2 |
| procedimiento | 2 |
| verificar | 2 |
| reservado | 1 |
| logico | 1 |
| estructura | 1 |
| calidad | 1 |
| consistente | 1 |

**Denominador actual con seed inicial: 30**

---

## 7. Motor narrativo (§5 del documento de referencia)

### 7.1 Lógica de selección de dimensión (`lib/report/narrative.ts`)

- **COMMUNICATION, MOTIVATORS, PRESSURE:** dimensión con mayor `PC[dim]`. En caso de empate: D > I > S > C.
- **ALERTS:** dimensión con menor `PC[dim]`. Mismo criterio de desempate.
- **INTERVIEW_QUESTIONS:** ver §7.3.
- **PROJECTION:** determinado por `riskLevel`.

### 7.2 Modificadores de intensidad (§5.2)

El prefijo se selecciona según el puntaje de la dimensión dominante:

| Rango | IntensityLevel | Prefijo (editable) |
|-------|---------------|---------------------|
| 67–100 | HIGH | "Esta característica se manifiesta de forma intensa y consistente: " |
| 34–66 | MEDIUM | "Esta característica está presente de forma moderada: " |
| 0–33 | LOW | "Esta característica aparece de forma leve u ocasional: " |

El texto final = `intensityPrefix + paragraphContent`.

### 7.3 Selección de preguntas de entrevista (§5.4, `lib/report/questions.ts`)

1. Calcular brecha con signo por dimensión: `gap[dim] = PC[dim] − ideal[dim]`.
2. Ordenar las 4 dimensiones por `|gap[dim]|` descendente.
3. Seleccionar las 2 dimensiones con mayor brecha absoluta → 2 preguntas cada una = 4 preguntas base.
4. Si `|gap[dim3]| >= |gap[dim2]| − 5` (tercera dimensión dentro de 5 puntos de la segunda): agregar 2 preguntas de la tercera dimensión → máximo 6 preguntas.
5. Para cada dimensión seleccionada: si `gap[dim] > 0` → subtype `"excess"`; si `gap[dim] < 0` → subtype `"deficit"`. Si `gap[dim] === 0`, esa dimensión se omite aunque esté entre las de mayor brecha absoluta, y se sube la siguiente en el ranking hasta completar el mínimo de 4 preguntas o hasta agotar las dimensiones disponibles.
6. Seleccionar `questionIndex` 1 y 2 de la sección INTERVIEW_QUESTIONS para la dimensión y subtype correspondientes.

### 7.4 Plantilla de proyección (§5.5)

El texto de proyección se construye desde `NarrativeContent` (section=PROJECTION, riskLevel=...) reemplazando los marcadores:
- `[nombre]` → `candidate.name`
- `[porcentaje]` → `fitScore` redondeado a entero + `%`
- `[dimensión de mayor brecha]` → nombre legible de la dimensión con mayor `|gap[dim]|`

---

## 8. Flujo de aplicación del instrumento (UI)

### 8.1 Banco de adjetivos (hardcoded en código, no editable)

El banco de adjetivos y la asignación de dimensiones por grupo es parte del instrumento y **no** se edita desde el panel. Los términos del Bloque 3 (diccionario léxico) sí son editables; los adjetivos de los Bloques 1 y 2 no lo son.

**Banco principal — 24 palabras (Bloque 1 y Bloque 2 Parte 1):**

| Clave | Palabra | Dimensión |
|-------|---------|-----------|
| D1 | Decidido | D |
| D2 | Directo | D |
| D3 | Competitivo | D |
| D4 | Exigente | D |
| D5 | Firme | D |
| D6 | Audaz | D |
| I1 | Sociable | I |
| I2 | Entusiasta | I |
| I3 | Persuasivo | I |
| I4 | Expresivo | I |
| I5 | Optimista | I |
| I6 | Comunicativo | I |
| S1 | Paciente | S |
| S2 | Constante | S |
| S3 | Colaborador | S |
| S4 | Leal | S |
| S5 | Sereno | S |
| S6 | Conciliador | S |
| C1 | Meticuloso | C |
| C2 | Analítico | C |
| C3 | Cauteloso | C |
| C4 | Ordenado | C |
| C5 | Riguroso | C |
| C6 | Reservado | C |

**Palabras de control — 4 palabras (Bloque 2 Parte 2 únicamente):**

Cada palabra de control es sinónimo semántico de la palabra principal de su dimensión (D1, I1, S1, C1). Se presentan separadas del banco principal para eliminar competencia de presupuesto.

| Clave | Palabra | Par principal | Dimensión | Estado |
|-------|---------|---------------|-----------|--------|
| ctrl_D | Resuelto | D1 Decidido | D | ✓ Aprobado |
| ctrl_I | Amigable | I1 Sociable | I | ✓ Aprobado |
| ctrl_S | Sosegado | S1 Paciente | S | ✓ Aprobado |
| ctrl_C | Detallista | C1 Meticuloso | C | ✓ Aprobado — a vigilar en piloto |

**Nota de seguimiento (piloto de validación):** `ctrl_C` (Detallista ↔ C1 Meticuloso) fue el par de mayor estimación teórica de p_match (0.91), pero queda marcado para observación prioritaria durante el piloto. "Detallista" connota orientación al producto o al resultado; "Meticuloso" connota orientación al proceso o al método. Para algunos evaluados los dos términos pueden evocar constructos distinguibles, produciendo una contradicción que no refleja inconsistencia de atención sino diferenciación semántica genuina. Si el piloto confirma una tasa de contradicción en este par sistemáticamente superior a los demás, se revisará la palabra. Por ahora el par queda como está.

### 8.2 Diseño de interacción del instrumento

**Bloque 1 — selección libre:**
1. Se presentan las 24 palabras principales en una cuadrícula de pantalla única.
2. El evaluado marca exactamente **8 palabras** que lo describen.
3. El contador muestra palabras restantes; cuando se alcanza el límite, las no seleccionadas se desactivan.
4. Botón "Continuar" habilitado solo cuando hay exactamente 8 seleccionadas.

**Bloque 2 Parte 1 — selección libre (banco principal):**
1. Se presentan las mismas 24 palabras principales en una cuadrícula de pantalla única.
2. El evaluado marca exactamente **8 palabras** que lo describen en su entorno de trabajo.
3. Misma mecánica de contador y bloqueo que Bloque 1.
4. Al confirmar, avanza automáticamente a la Parte 2.

**Bloque 2 Parte 2 — verificación de control:**
1. Se presentan las 4 palabras de control **una por una**, en pantallas secuenciales independientes.
2. Cada pantalla muestra una sola palabra y dos botones: **"Sí me describe"** / **"No me describe"**.
3. El evaluado **debe resolver cada decisión** antes de ver la siguiente; no hay opción de omitir.
4. No hay botón "atrás" entre decisiones de control.
5. Al completar las 4 decisiones, avanza automáticamente al Bloque 3.

(La presentación secuencial obligatoria cierra la vía de evasión "marcar ninguna sin leer", que bajo selección puramente aleatoria en la parte de control produce ~1.5 contradicciones esperadas, comparable a respuesta aleatoria real.)

### 8.3 Medición de tiempo

- `startedAt` se registra en el servidor cuando el evaluado hace el primer clic en Bloque 1 (`POST /api/assessments/[token]/start`).
- `completedAt` se registra cuando se confirma el envío del Bloque 3.
- `durationSeconds = completedAt − startedAt` en segundos (entero).

### 8.4 Guardado de progreso

Cada grupo se guarda al avanzar (PATCH a la API), no en batch al finalizar el bloque. El estado en sesión del cliente (localStorage o useState con useEffect) permite retomar si el evaluado cierra y reabre la misma URL, siempre que el status sea IN_PROGRESS.

### 8.5 Diseño visual

- Nombres de dimensiones en la UI del informe y panel: **"Iniciativa"** (D), **"Vínculo"** (I), **"Cadencia"** (S), **"Precisión"** (C). Estos nombres son originales y no coinciden con ningún producto comercial.
- Paleta de colores y disposición gráfica: decisión del implementador en Fase 4, sin referencias a paletas de instrumentos comerciales conocidos.
- Los ejes del gráfico radar y las barras del gráfico de dimensiones usan los cuatro nombres originales anteriores.

---

## 9. Generación del informe

### 9.1 Orden del informe (§4 del documento de referencia)

1. Portada: nombre del candidato, cargo evaluado, fecha.
2. Indicador de Consistencia: nivel + frase condicional. Si `consistencyLevel === LOW`: advertencia explícita de validez reducida y recomendación de repetir evaluación.
3. Resumen ejecutivo: ajuste al cargo, nivel de riesgo, síntesis de estilo conductual dominante.
4. Gráfico de barras: 4 dimensiones del Perfil Compuesto.
5. Gráfico radar: Perfil Compuesto vs. Perfil Ideal del cargo.
6. Análisis de brecha: por dimensión, texto interpretativo de cada diferencia relevante.
7. Estilo de comunicación: prefijo de intensidad + párrafo base de la dimensión dominante.
8. Motivadores y desmotivadores: prefijo de intensidad + párrafo base.
9. Comportamiento bajo presión: prefijo de intensidad + párrafo base.
10. Señales de alerta: párrafo de la dimensión más baja + mención del Índice de Máscara si > 40.
11. Preguntas sugeridas de entrevista: 4–6 preguntas según regla de §7.3.
12. Proyección de desempeño y recomendación: plantilla por nivel de riesgo con marcadores reemplazados.
13. Nota de uso: texto fijo conforme §4 y §7 del documento de referencia.

### 9.2 Gráficos

- **Barras:** 4 barras horizontales, SVG parametrizado generado en servidor (`lib/report/charts.ts`). Dimensiones nombradas con los nombres originales (§8.5). Escala 0–100 visible.
- **Radar:** polígono de 4 vértices superpuesto sobre cuadrícula de referencia del perfil ideal. SVG parametrizado. Sin nomenclatura coincidente con radar charts de instrumentos comerciales.

### 9.3 Exportación PDF

`GET /api/reports/[id]/pdf` genera el PDF usando `@react-pdf/renderer` con el componente de `lib/report/pdf.tsx`. Los gráficos SVG se embeben directamente en el PDF (no se requiere Puppeteer). El response es un stream con `Content-Type: application/pdf` y `Content-Disposition: attachment`.

---

## 10. Panel del consultor

### 10.1 Vistas

| Ruta | Propósito |
|------|-----------|
| `/admin/dashboard` | Resumen: últimas evaluaciones, candidatos pendientes |
| `/admin/positions` | Listar, crear y editar cargos con perfil ideal (sliders 0–100 por dimensión) |
| `/admin/candidates` | Listar y crear candidatos (nombre, email opcional) |
| `/admin/assessments` | Crear asignación (candidato + cargo), ver link de evaluado, ver estado |
| `/admin/reports/[id]` | Ver informe completo en pantalla y exportar PDF |
| `/admin/settings/lexicon` | Tabla editable de LexiconTerm: agregar, editar peso, desactivar |
| `/admin/settings/templates` | Editar contenido de NarrativeContent por sección |

### 10.2 Reutilización de perfiles ideales

Un cargo (`Position`) tiene un perfil ideal único. El mismo cargo puede asignarse a múltiples evaluaciones (múltiples candidatos). El consultor puede definir un perfil ideal una vez y reutilizarlo en todas las evaluaciones de ese cargo sin re-ingresarlo.

Un candidato puede tener múltiples evaluaciones contra distintos cargos, cada evaluación con su propio informe. El test (respuestas) no se reutiliza entre evaluaciones; cada instancia de `Assessment` tiene sus propias `BlockResponse`.

---

## 11. Pruebas unitarias

Cobertura obligatoria en `__tests__/scoring/` para cada función de `lib/scoring/`:

| Función | Casos clave a cubrir |
|---------|---------------------|
| `normalize` | Bruto −6 → 0; bruto 0 → 50; bruto +6 → 100; valores intermedios sin redondeo |
| `rawScore` | Todos MÁS en D → rawD=+6; todos MENOS en D → rawD=−6; mezcla |
| `textualScore` | Match exacto; match con suffix-stripping; término repetido cuenta una vez; denominador dinámico; diccionario vacío → 0 |
| `composite` | Pesos correctos (0.60/0.25/0.15); suma de pesos = 1 |
| `maskIndex` | PP===PI → 0; PP y PI opuestos → 100; caso intermedio conocido |
| `consistencyIndex` | 0 contradicciones → 100; 1 → 50; 2 → 0; tiempo < 3min con 0 contradicciones → 60 |
| `fitScore` | PC===ideal → 100; opuestos → 0; caso intermedio conocido |
| `projectionScore` | Pesos correctos (0.50/0.20/0.30); nivel LOW/MEDIUM/HIGH en umbrales exactos |

---

## 12. Decisiones de diseño tomadas sin especificación explícita

Estas decisiones se tomaron durante el proceso de diseño y quedan documentadas para validación:

| Decisión | Justificación |
|----------|--------------|
| Nombres de dimensiones en UI: Iniciativa / Vínculo / Cadencia / Precisión | Requisito de diseño original; no coinciden con ningún instrumento comercial conocido |
| Síntesis del resumen ejecutivo: reutiliza el párrafo de COMMUNICATION sin modificador de intensidad | §4 pide "síntesis de tres líneas sobre el estilo conductual dominante"; §5 ya define ese contenido en el banco COMMUNICATION. Agregar una sección EXECUTIVE_SUMMARY separada duplicaría el contenido editable sin valor adicional. El consultor puede ajustar el párrafo de COMMUNICATION para que también sirva como síntesis ejecutiva. |
| Botón "atrás" deshabilitado dentro de un bloque | Reduce modulación consciente de respuestas; consistente con el espíritu de selección forzada |
| Vectores calculados persistidos en `Report` | Auditoría: permite verificar qué valor produjo cada frase del informe sin recalcular |
| Gráficos como SVG parametrizado en servidor | Evita Puppeteer/headless browser; compatible con Vercel serverless |
| `durationSeconds` como entero en base de datos | Precisión suficiente para el umbral de 3 minutos; evita drift de float |
| Guardado por grupo en tiempo real (no batch) | Permite retomar evaluación ante cierre accidental |
| Token de evaluado como `cuid()` en `Assessment.token` | Suficientemente impredecible para acceso sin login; no es un secret crítico |
| `iron-session` sin tabla de sesiones | Mínima infraestructura para un solo consultor; migrable a NextAuth al agregar multi-consultor |
| Denominadores del seed inicial: D=28, I=29, S=29, C=30 | El documento de referencia indica "veintiocho por dimensión" como referencia aproximada; el cálculo exacto del seed produce valores distintos. La implementación usa el denominador dinámico calculado en cada ejecución, por lo que la diferencia no afecta al algoritmo. |
