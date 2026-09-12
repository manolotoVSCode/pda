/**
 * update-potential-bullets.ts
 * Updates POTENTIAL narrative content to use \n• bullet format.
 * Run once against production DB.
 *
 * Usage: npx tsx scripts/update-potential-bullets.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const rows = [
  {
    id: 'potential-D',
    content: [
      '[nombre] desarrolla su mayor potencial en entornos que activan su orientación a resultados y su capacidad de decisión.',
      '• Asígnale retos con autonomía real y metas medibles; evita la supervisión excesiva sobre el cómo.',
      '• Reconoce sus logros de forma directa y concreta, no solo con palabras: resultados visibles.',
      '• Para su desarrollo, estimúlale la escucha activa y la consideración del impacto de sus decisiones en el equipo.',
    ].join('\n'),
  },
  {
    id: 'potential-I',
    content: [
      '[nombre] desarrolla su mayor potencial en entornos que activan su capacidad de influencia interpersonal.',
      '• Asígnale roles con interacción frecuente, variedad de proyectos y espacio para compartir ideas en proceso.',
      '• Reconoce sus aportes en público y entrega retroalimentación con calidez, no solo con datos.',
      '• Un área de crecimiento relevante: el seguimiento sistemático de compromisos y la profundización antes de pasar al siguiente tema.',
    ].join('\n'),
  },
  {
    id: 'potential-S',
    content: [
      '[nombre] desarrolla su mayor potencial en entornos que activan su capacidad de constancia y colaboración sostenida.',
      '• Provéele estabilidad, tiempo para adaptarse a los cambios y relaciones de confianza de largo plazo.',
      '• Anticipa los cambios con anticipación suficiente; evita presionarla a decidir bajo prisa constante.',
      '• Área de desarrollo: acompañarla a expresar su posición con más asertividad, sin esperar consenso previo.',
    ].join('\n'),
  },
  {
    id: 'potential-C',
    content: [
      '[nombre] desarrolla su mayor potencial en entornos que activan su rigor analítico y su orientación a la calidad.',
      '• Provéele reglas claras, tiempo para analizar antes de actuar y estándares de calidad bien definidos.',
      '• Entrega la información completa antes de pedir una decisión y valora su precisión de forma explícita.',
      '• Conviene trabajar con [nombre] su tolerancia al error y la capacidad de decidir en condiciones de incertidumbre.',
    ].join('\n'),
  },
]

async function main() {
  console.log('Updating POTENTIAL narrative content with bullet markers...\n')
  for (const row of rows) {
    await prisma.narrativeContent.update({
      where: { id: row.id },
      data: { content: row.content },
    })
    console.log(`✓ ${row.id}`)
    console.log(row.content.split('\n').map(l => `  ${l}`).join('\n'))
    console.log()
  }
  console.log('Done.')
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
