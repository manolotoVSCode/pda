import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { selectInterviewQuestions } from '@/lib/report/questions'
import { buildReportSections, type NarrativeRow, DIM_LABELS } from '@/lib/report/narrative'
import { buildBarChartSvg, buildRadarChartSvg, buildTendenciasChartSvg } from '@/lib/report/charts'
import { DIMENSION_LEGEND } from '@/lib/report/legend'

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
  const tendenciasSvg = buildTendenciasChartSvg(pc)

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

      {/* Dimension Legend */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">Las cuatro dimensiones del modelo</h2>
        <div className="space-y-3">
          {DIMENSION_LEGEND.map(d => (
            <div key={d.dim}>
              <p className="text-sm font-semibold text-slate-700">{d.dim} — {d.name}</p>
              <p className="text-sm text-slate-600">{d.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 1. Consistencia */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">1. Indicador de Consistencia</h2>
        {sections.consistencyWarning && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-3 text-sm text-red-700">
            {sections.consistencyWarning}
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <StatBox label="Índice de Consistencia (0–100)" value={String(Math.round(report.consistencyIndex))} />
          <StatBox label="Nivel" value={consistencyLabel} />
          <StatBox
            label="Tiempo de resolución"
            value={
              report.assessment.durationSeconds != null
                ? (() => {
                    const m = Math.floor(report.assessment.durationSeconds / 60)
                    const s = report.assessment.durationSeconds % 60
                    return m > 0 ? `${m} min ${s} seg` : `${s} seg`
                  })()
                : '—'
            }
          />
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

      {/* 6. Descripción del Perfil */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">6. Descripción del Perfil</h2>
        <div className="space-y-4">
          {sections.profileDescription.map((item, i) => (
            <p key={i} className="text-sm text-slate-700">{item.text}</p>
          ))}
        </div>
      </section>

      {/* 7. Señales de Alerta */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">7. Señales de Alerta</h2>
        <p className="text-sm text-slate-700 mb-3">{sections.alerts}</p>
        {report.maskIndex > 40 ? (
          <div className="bg-amber-50 border border-amber-300 rounded p-3 text-sm text-amber-800">
            <span className="font-semibold">Índice de Máscara Social: {Math.round(report.maskIndex)}%</span> — nivel elevado de esfuerzo de adaptación. El perfil percibido difiere significativamente del perfil interno; considerar en la interpretación.
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded p-3 text-sm text-slate-600">
            <span className="font-semibold">Índice de Máscara Social: {Math.round(report.maskIndex)}%</span> — dentro del rango esperado.
          </div>
        )}
      </section>

      {/* 8. Preguntas de profundización */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">8. Preguntas de Profundización</h2>
        <ol className="list-decimal list-inside space-y-2">
          {sections.interviewQuestions.map((q, i) => (
            <li key={i} className="text-sm text-slate-700">{q}</li>
          ))}
        </ol>
      </section>

      {/* 9. Potencial */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">9. Potencial y Recomendaciones de Desarrollo</h2>
        <p className="text-sm text-slate-700">{sections.potential}</p>
      </section>

      {/* 10. Tendencias de comportamiento */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">10. Tendencias de Comportamiento</h2>
        <div dangerouslySetInnerHTML={{ __html: tendenciasSvg }} />
      </section>

      {/* 11. Nota de uso */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-3">11. Nota de Uso</h2>
        <p className="text-xs text-slate-500 italic">
          Este informe describe el estilo conductual de la persona evaluada y no mide habilidades, conocimientos ni garantiza desempeño en ningún contexto específico. El instrumento está basado en la teoría pública DISC (Marston, 1928) y representa una arquitectura de trabajo no validada psicométricamente. Los resultados deben interpretarse como orientación y complementarse con otras fuentes de información.
        </p>
      </section>

    </main>
  )
}
