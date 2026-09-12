import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { buildReportSections, type NarrativeRow } from '../lib/report/narrative'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function show(label: string, pc: { D: number; I: number; S: number; C: number }) {
  const narrativeRows = await prisma.narrativeContent.findMany()
  const rows: NarrativeRow[] = narrativeRows.map(r => ({
    id: r.id,
    section: r.section as string,
    dimension: r.dimension as string | null,
    subtype: r.subtype,
    questionIndex: r.questionIndex,
    riskLevel: r.riskLevel as string | null,
    intensity: r.intensity as string | null,
    content: r.content,
  }))

  const sections = buildReportSections(rows, pc, 0, 'HIGH', 'Ana Prueba')

  console.log(`\n${'='.repeat(80)}`)
  console.log(`CASO: ${label}`)
  console.log(`PC → D=${pc.D} I=${pc.I} S=${pc.S} C=${pc.C}`)
  console.log('='.repeat(80))
  console.log('\nEXECUTIVE SUMMARY:')
  console.log(sections.executiveSummary)
  console.log('\nPROFILE DESCRIPTION:')
  sections.profileDescription.forEach((item, i) => {
    console.log(`\n[Párrafo ${i + 1} — ${item.dim}]`)
    console.log(item.text)
  })
}

async function main() {
  // Caso 1: E2E actual
  await show('E2E sin cargo (D=100, I=14, S=14, C=0)', { D: 100, I: 14, S: 14, C: 0 })

  // Caso 2: D alto + S alto vs I bajo + C bajo
  await show('D alto + S alto (D=80, I=20, S=80, C=20)', { D: 80, I: 20, S: 80, C: 20 })

  // Caso 3: I alto + C alto vs D bajo + S bajo
  await show('I alto + C alto (D=15, I=85, S=25, C=90)', { D: 15, I: 85, S: 25, C: 90 })
}

main().catch(console.error).finally(() => prisma.$disconnect())
