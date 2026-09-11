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
  positionName: string
  generatedAt: Date
  sections: ReportSections
  pc: DimensionVector
  pp: DimensionVector
  pi: DimensionVector
  maskIndex: number
  consistencyIndex: number
  consistencyLevel: 'HIGH' | 'MODERATE' | 'LOW'
  fitScore: number
  projectionScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  barChartSvg: string
  radarChartSvg: string
}

const BRAND = '#2d4a7a'
const ACCENT = '#e05c3a'

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
  badge: { fontSize: 9, padding: '3 8', borderRadius: 3 },
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

function levelLabel(level: 'LOW' | 'MEDIUM' | 'HIGH'): string {
  return level === 'LOW' ? 'Bajo' : level === 'MEDIUM' ? 'Moderado' : 'Alto'
}

function consistencyLabel(level: 'HIGH' | 'MODERATE' | 'LOW'): string {
  return level === 'HIGH' ? 'Alta' : level === 'MODERATE' ? 'Moderada' : 'Baja'
}

export function ReportDocument(props: Props) {
  const {
    candidateName, positionName, generatedAt,
    sections, pc, pp, pi,
    maskIndex, consistencyIndex, consistencyLevel,
    fitScore, projectionScore, riskLevel,
    barChartSvg, radarChartSvg,
  } = props

  return (
    <Document>
      {/* Cover */}
      <Page size="A4" style={s.page}>
        <View style={s.cover}>
          <Text style={s.coverTitle}>Informe de Perfil Conductual</Text>
          <Text style={s.coverSub}>{candidateName}</Text>
          <Text style={s.coverSub}>Cargo: {positionName}</Text>
          <Text style={s.coverDate}>
            Generado el {generatedAt.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
          </Text>
        </View>
      </Page>

      {/* Report body */}
      <Page size="A4" style={s.page}>

        {/* 1. Consistency */}
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

        {/* 2. Executive summary */}
        <Text style={s.sectionTitle}>2. Resumen Ejecutivo</Text>
        <View style={s.indexRow}>
          <View style={s.indexBox}>
            <Text style={s.indexVal}>{Math.round(fitScore)}%</Text>
            <Text style={s.indexLbl}>Ajuste al Cargo</Text>
          </View>
          <View style={s.indexBox}>
            <Text style={s.indexVal}>{Math.round(projectionScore)}</Text>
            <Text style={s.indexLbl}>Proyección de Desempeño (0–100)</Text>
          </View>
          <View style={s.indexBox}>
            <Text style={s.indexVal}>{levelLabel(riskLevel)}</Text>
            <Text style={s.indexLbl}>Riesgo de Adaptación</Text>
          </View>
        </View>
        <Text style={s.body}>{sections.executiveSummary}</Text>

        {/* 3. Bar chart */}
        <Text style={s.sectionTitle}>3. Perfil Compuesto por Dimensión</Text>
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

        {/* 4. Radar chart */}
        <Text style={s.sectionTitle}>4. Comparación con Perfil Ideal</Text>
        <Image style={{ ...s.chart, width: 260, height: 260 }} src={svgToDataUri(radarChartSvg)} />

        {/* 5. Gap analysis */}
        <Text style={s.sectionTitle}>5. Análisis de Brecha</Text>
        {sections.gapAnalysis.map(g => (
          <View key={g.dim} style={{ marginBottom: 5 }}>
            <Text style={s.subTitle}>
              {g.label}: {g.gap > 0 ? '+' : ''}{Math.round(g.gap)} pts
            </Text>
            <Text style={s.body}>{g.text}</Text>
          </View>
        ))}

        {/* 6. Communication */}
        <Text style={s.sectionTitle}>6. Estilo de Comunicación</Text>
        <Text style={s.body}>{sections.communication}</Text>

        {/* 7. Motivators */}
        <Text style={s.sectionTitle}>7. Motivadores y Desmotivadores</Text>
        <Text style={s.body}>{sections.motivators}</Text>

        {/* 8. Pressure */}
        <Text style={s.sectionTitle}>8. Comportamiento bajo Presión</Text>
        <Text style={s.body}>{sections.pressure}</Text>

        {/* 9. Alerts */}
        <Text style={s.sectionTitle}>9. Señales de Alerta</Text>
        <Text style={s.body}>{sections.alerts}</Text>

        {/* 10. Interview questions */}
        <Text style={s.sectionTitle}>10. Preguntas Sugeridas de Entrevista</Text>
        {sections.interviewQuestions.map((q, i) => (
          <View key={i} style={s.qItem}>
            <Text style={s.qBullet}>{i + 1}. {q}</Text>
          </View>
        ))}

        {/* 11. Projection */}
        <Text style={s.sectionTitle}>11. Proyección de Desempeño</Text>
        <Text style={s.body}>{sections.projection}</Text>

        {/* Mask index note (if shown in alerts, skip duplicate here) */}
        {maskIndex > 40 && !sections.alerts.includes('Máscara') && (
          <View style={{ marginTop: 6 }}>
            <Text style={s.body}>
              Índice de Máscara Social: {Math.round(maskIndex)}% — nivel de esfuerzo de adaptación elevado.
            </Text>
          </View>
        )}

        {/* 12. Usage note */}
        <Text style={s.sectionTitle}>12. Nota de Uso</Text>
        <Text style={s.note}>
          Este informe es una herramienta de apoyo para el proceso de selección de personal y no constituye, por sí solo, el criterio de decisión. El instrumento está basado en la teoría pública DISC (Marston, 1928) y representa una arquitectura de trabajo no validada psicométricamente. Los resultados deben interpretarse en conjunto con entrevistas, verificación de referencias y otras fuentes de información. Toda decisión de contratación es responsabilidad exclusiva del consultor y de la organización.
        </Text>
      </Page>
    </Document>
  )
}
