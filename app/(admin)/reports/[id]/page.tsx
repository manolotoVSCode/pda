import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { selectInterviewQuestions } from '@/lib/report/questions'
import { buildReportSections, type NarrativeRow } from '@/lib/report/narrative'
import { buildBarChartSvg, buildRadarChartSvg } from '@/lib/report/charts'

const DIM_LABELS = { D: 'Iniciativa', I: 'Vínculo', S: 'Cadencia', C: 'Precisión' }

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
    include: {
      assessment: {
        include: {
          candidate: true,
          position: true,
        },
      },
    },
  })

  if (!report) notFound()

  const pc = { D: report.pcD, I: report.pcI, S: report.pcS, C: report.pcC }
  const pp = { D: report.ppD, I: report.ppI, S: report.ppS, C: report.ppC }
  const pi = { D: report.piD, I: report.piI, S: report.piS, C: report.piC }
  const ideal = {
    D: report.assessment.position.idealD,
    I: report.assessment.position.idealI,
    S: report.assessment.position.idealS,
    C: report.assessment.position.idealC,
  }

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

  const interviewQuestions = selectInterviewQuestions(rows, pc, ideal)
  const sections = buildReportSections(
    rows, pc, ideal,
    report.fitScore, report.maskIndex,
    report.consistencyLevel as 'HIGH' | 'MODERATE' | 'LOW',
    report.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH',
    interviewQuestions,
    report.assessment.candidate.name,
  )

  const barSvg = buildBarChartSvg(pc)
  const radarSvg = buildRadarChartSvg(pc, ideal)

  const riskLabel = report.riskLevel === 'LOW' ? 'Bajo' : report.riskLevel === 'MEDIUM' ? 'Moderado' : 'Alto'
  const consistencyLabel = report.consistencyLevel === 'HIGH' ? 'Alta' : report.consistencyLevel === 'MODERATE' ? 'Moderada' : 'Baja'

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

      <h1 className="text-2xl font-bold text-slate-800">{report.assessment.candidate.name}</h1>
      <p className="text-slate-500 mb-6">
        Cargo: {report.assessment.position.name} ·{' '}
        {new Date(report.generatedAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
      </p>

      {/* Consistency */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">1. Indicador de Consistencia</h2>
        {sections.consistencyWarning && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-3 text-sm text-red-700">
            {sections.consistencyWarning}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Índice de Consistencia" value={String(Math.round(report.consistencyIndex))} />
          <StatBox label="Nivel" value={consistencyLabel} />
        </div>
      </section>

      {/* Executive summary */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">2. Resumen Ejecutivo</h2>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <StatBox label="Ajuste al Cargo" value={`${Math.round(report.fitScore)}%`} />
          <StatBox label="Proyección" value={String(Math.round(report.projectionScore))} />
          <StatBox label="Riesgo de Adaptación" value={riskLabel} />
        </div>
        <p className="text-sm text-slate-700">{sections.executiveSummary}</p>
      </section>

      {/* Bar chart */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">3. Perfil Compuesto</h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
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

      {/* Radar chart */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">4. Comparación con Perfil Ideal</h2>
        <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: radarSvg }} />
      </section>

      {/* Gap analysis */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">5. Análisis de Brecha</h2>
        {sections.gapAnalysis.map(g => (
          <div key={g.dim} className="mb-3">
            <p className="text-sm font-semibold text-slate-700">
              {g.label}: {g.gap > 0 ? '+' : ''}{Math.round(g.gap)} pts
            </p>
            <p className="text-sm text-slate-600">{g.text}</p>
          </div>
        ))}
      </section>

      {/* Narrative sections */}
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

      {/* Interview questions */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">10. Preguntas Sugeridas de Entrevista</h2>
        <ol className="list-decimal list-inside space-y-2">
          {sections.interviewQuestions.map((q, i) => (
            <li key={i} className="text-sm text-slate-700">{q}</li>
          ))}
        </ol>
      </section>

      {/* Projection */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">11. Proyección de Desempeño</h2>
        <p className="text-sm text-slate-700">{sections.projection}</p>
      </section>

      {/* Usage note */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">12. Nota de Uso</h2>
        <p className="text-xs text-slate-500 italic">
          Este informe es una herramienta de apoyo para el proceso de selección de personal y no constituye, por sí solo, el criterio de decisión. El instrumento está basado en la teoría pública DISC (Marston, 1928) y representa una arquitectura de trabajo no validada psicométricamente. Los resultados deben interpretarse en conjunto con entrevistas, verificación de referencias y otras fuentes de información. Toda decisión de contratación es responsabilidad exclusiva del consultor y de la organización.
        </p>
      </section>

      {/* Mask index note */}
      {report.maskIndex > 40 && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
          <span className="font-semibold">Índice de Máscara Social:</span> {Math.round(report.maskIndex)}% — nivel elevado de esfuerzo de adaptación.
        </div>
      )}
    </main>
  )
}
