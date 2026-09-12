/**
 * Lexicon v2 update — two targeted corrections:
 *
 * 1. S dimension: deactivate 'escuchar' (infinitive verb, wrong form)
 *                 add 'ponderado' [1] (equilibrio deliberado, núcleo S puro)
 *
 * 2. C dimension: deactivate 'reservado' (describes low extroversion, not Precisión)
 *                 add 'metódico' [2] (metodical/systematic, core C trait)
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  // ── S: escuchar → ponderado ──────────────────────────────────────────────
  const escuchar = await prisma.lexiconTerm.findFirst({
    where: { dimension: 'S', term: 'escuchar' },
  })
  if (escuchar) {
    await prisma.lexiconTerm.update({
      where: { id: escuchar.id },
      data: { active: false },
    })
    console.log('S: deactivated "escuchar"')
  } else {
    console.log('S: "escuchar" not found (already removed or never present)')
  }

  await prisma.lexiconTerm.upsert({
    where: { dimension_term: { dimension: 'S', term: 'ponderado' } },
    update: { active: true, weight: 1 },
    create: { dimension: 'S', term: 'ponderado', weight: 1, active: true },
  })
  console.log('S: upserted "ponderado" [1]')

  // ── C: reservado → metódico ──────────────────────────────────────────────
  const reservado = await prisma.lexiconTerm.findFirst({
    where: { dimension: 'C', term: 'reservado' },
  })
  if (reservado) {
    await prisma.lexiconTerm.update({
      where: { id: reservado.id },
      data: { active: false },
    })
    console.log('C: deactivated "reservado"')
  } else {
    console.log('C: "reservado" not found (already removed or never present)')
  }

  await prisma.lexiconTerm.upsert({
    where: { dimension_term: { dimension: 'C', term: 'metódico' } },
    update: { active: true, weight: 2 },
    create: { dimension: 'C', term: 'metódico', weight: 2, active: true },
  })
  console.log('C: upserted "metódico" [2]')

  // ── Verify final state ────────────────────────────────────────────────────
  const terms = await prisma.lexiconTerm.findMany({
    where: { active: true },
    orderBy: [{ dimension: 'asc' }, { weight: 'desc' }, { term: 'asc' }],
  })
  const byDim: Record<string, typeof terms> = { D: [], I: [], S: [], C: [] }
  for (const t of terms) byDim[t.dimension].push(t)

  console.log('\nFinal active lexicon:')
  const labels: Record<string, string> = { D: 'Iniciativa', I: 'Vínculo', S: 'Cadencia', C: 'Precisión' }
  for (const dim of ['D', 'I', 'S', 'C']) {
    console.log(`\n  ${labels[dim]} (${dim}) — ${byDim[dim].length} terms`)
    for (const t of byDim[dim]) console.log(`    [${t.weight}] ${t.term}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
