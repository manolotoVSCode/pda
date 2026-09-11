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
