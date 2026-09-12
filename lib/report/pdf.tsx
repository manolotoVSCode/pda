import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import type { ReportSections } from './narrative'
import { DIM_LABELS } from './narrative'
import type { DimensionVector } from '../scoring/types'
import { DIMENSION_LEGEND } from './legend'

type Dimension = 'D' | 'I' | 'S' | 'C'

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
  durationSeconds: number | null
  barChartSvg: string
  radarChartSvg: string
  tendenciasChartSvg: string
  logoDataUri?: string
}

const BRAND = '#2d4a7a'

const DIM_COLORS: Record<Dimension, string> = {
  D: '#e05c3a',
  I: '#f0a030',
  S: '#4aad8c',
  C: '#4a7fbf',
}

const DIM_LIGHT_COLORS: Record<Dimension, string> = {
  D: '#fde8e0',
  I: '#fef3dc',
  S: '#d9f4ec',
  C: '#dce9f7',
}

const s = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Helvetica', fontSize: 10, color: '#222', lineHeight: 1.5 },

  // Cover — fixed: marginBottom 8→24, explicit lineHeight 1.2 to decouple from page
  cover: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  coverTitle: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: BRAND, marginBottom: 24, lineHeight: 1.2, textAlign: 'center' },
  coverSub: { fontSize: 16, color: '#555', marginBottom: 4, textAlign: 'center', lineHeight: 1.2 },
  coverDate: { fontSize: 10, color: '#888', marginTop: 24, textAlign: 'center', lineHeight: 1.2 },

  // Section headers
  sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: BRAND, marginTop: 20, marginBottom: 6, borderBottomWidth: 1.5, borderBottomColor: BRAND, borderBottomStyle: 'solid', paddingBottom: 3 },
  sectionNum: { fontSize: 9, color: '#aaa', fontFamily: 'Helvetica' },

  subTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#333', marginTop: 10, marginBottom: 3 },
  body: { fontSize: 10, color: '#444', marginBottom: 4 },
  warning: { fontSize: 10, color: '#b91c1c', backgroundColor: '#fee2e2', padding: 8, borderRadius: 4, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  label: { fontSize: 9, color: '#666', fontFamily: 'Helvetica-Bold', width: 80 },
  value: { fontSize: 10, color: '#222' },
  note: { fontSize: 9, color: '#555', fontStyle: 'italic', marginTop: 16, borderTopWidth: 0.5, borderTopColor: '#ccc', borderTopStyle: 'solid', paddingTop: 8 },
  maskInfo: { fontSize: 10, color: '#444', backgroundColor: '#f8fafc', borderRadius: 4, padding: 8, marginTop: 6 },
  maskAlert: { fontSize: 10, color: '#92400e', backgroundColor: '#fffbeb', borderRadius: 4, padding: 8, marginTop: 6 },
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
    maskIndex, consistencyIndex, consistencyLevel, durationSeconds,
    barChartSvg, radarChartSvg, tendenciasChartSvg, logoDataUri,
  } = props

  const durationLabel = durationSeconds != null
    ? (() => {
        const m = Math.floor(durationSeconds / 60)
        const s = durationSeconds % 60
        return m > 0 ? `${m} min ${s} seg` : `${s} seg`
      })()
    : '—'

  return (
    <Document>
      {/* Cover */}
      <Page size="A4" style={s.page}>
        <View style={s.cover}>
          {logoDataUri && (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={{ width: 220, height: 66, marginBottom: 32 }} src={logoDataUri} />
          )}
          <Text style={s.coverTitle}>Informe de Perfil Conductual</Text>
          <Text style={s.coverSub}>{candidateName}</Text>
          <Text style={s.coverDate}>
            Generado el {generatedAt.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
          </Text>
        </View>
      </Page>

      {/* Dimension Legend Page */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>Las cuatro dimensiones del modelo</Text>
        {DIMENSION_LEGEND.map(d => {
          const dim = d.dim as Dimension
          return (
            <View key={dim} style={{ flexDirection: 'row', marginBottom: 16 }}>
              <View style={{ width: 3, backgroundColor: DIM_COLORS[dim], borderRadius: 2, marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: DIM_COLORS[dim], marginBottom: 2 }}>
                  {d.dim} — {d.name}
                </Text>
                <Text style={s.body}>{d.description}</Text>
              </View>
            </View>
          )
        })}
      </Page>

      {/* Report body */}
      <Page size="A4" style={s.page}>

        {/* 1. Consistencia */}
        <Text style={s.sectionTitle}>
          <Text style={s.sectionNum}>1. </Text>Indicador de Consistencia
        </Text>
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
          <View style={s.indexBox}>
            <Text style={s.indexVal}>{durationLabel}</Text>
            <Text style={s.indexLbl}>Tiempo de resolución</Text>
          </View>
        </View>

        {/* 2. Resumen ejecutivo */}
        <Text style={s.sectionTitle}>
          <Text style={s.sectionNum}>2. </Text>Resumen Ejecutivo
        </Text>
        <Text style={s.body}>{sections.executiveSummary}</Text>

        {/* 3. Gráfico de barras */}
        <Text style={s.sectionTitle}>
          <Text style={s.sectionNum}>3. </Text>Perfil Compuesto por Dimensión
        </Text>
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
        <Text style={s.sectionTitle}>
          <Text style={s.sectionNum}>4. </Text>Perfil Interno vs Perfil Percibido
        </Text>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image es de @react-pdf/renderer, no un elemento HTML; la regla no aplica */}
        <Image style={{ ...s.chart, width: 260, height: 260 }} src={svgToDataUri(radarChartSvg)} />

        {/* 5. Análisis de rasgos dominantes */}
        <Text style={s.sectionTitle}>
          <Text style={s.sectionNum}>5. </Text>Análisis de Rasgos Dominantes
        </Text>
        {sections.dominantTraits.map(t => (
          <View key={t.dim} style={{ marginBottom: 8 }}>
            {/* Badge row: colored bar + dim code + name + distance chip */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 3 }}>
              <View style={{ width: 3, height: 13, backgroundColor: DIM_COLORS[t.dim], borderRadius: 2, marginRight: 6 }} />
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: DIM_COLORS[t.dim] }}>{t.dim}</Text>
              <Text style={{ fontSize: 10, color: '#666', marginLeft: 4 }}>· {t.label}</Text>
              <View style={{ marginLeft: 'auto', backgroundColor: DIM_LIGHT_COLORS[t.dim], borderRadius: 10, paddingVertical: 1, paddingHorizontal: 6 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: DIM_COLORS[t.dim] }}>
                  {t.direction === 'excess' ? '+' : '–'}{Math.round(t.distance)} pts · {t.direction === 'excess' ? 'por encima' : 'por debajo'}
                </Text>
              </View>
            </View>
            <Text style={s.body}>{t.text}</Text>
          </View>
        ))}

        {/* 6. Descripción del Perfil */}
        <Text style={s.sectionTitle}>
          <Text style={s.sectionNum}>6. </Text>Descripción del Perfil
        </Text>
        {sections.profileDescription.map((item, i) => (
          <View key={i} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: DIM_COLORS[item.dim], marginRight: 5 }} />
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: DIM_COLORS[item.dim] }}>
                {DIM_LABELS[item.dim].toUpperCase()}
              </Text>
            </View>
            <Text style={s.body}>{item.text}</Text>
          </View>
        ))}

        {/* 7. Señales de Alerta */}
        <Text style={s.sectionTitle}>
          <Text style={s.sectionNum}>7. </Text>Señales de Alerta
        </Text>
        <Text style={s.body}>{sections.alerts}</Text>
        {maskIndex > 40 ? (
          <View style={s.maskAlert}>
            <Text><Text style={{ fontFamily: 'Helvetica-Bold' }}>Índice de Máscara Social: {Math.round(maskIndex)}%</Text> — nivel elevado de esfuerzo de adaptación. El perfil percibido difiere significativamente del perfil interno; considerar en la interpretación.</Text>
          </View>
        ) : (
          <View style={s.maskInfo}>
            <Text><Text style={{ fontFamily: 'Helvetica-Bold' }}>Índice de Máscara Social: {Math.round(maskIndex)}%</Text> — dentro del rango esperado.</Text>
          </View>
        )}

        {/* 8. Preguntas de profundización */}
        <Text style={s.sectionTitle}>
          <Text style={s.sectionNum}>8. </Text>Preguntas de Profundización
        </Text>
        {sections.interviewQuestions.map((q, i) => (
          <View key={i} style={s.qItem}>
            <Text style={s.qBullet}>{i + 1}. {q}</Text>
          </View>
        ))}

        {/* 9. Potencial */}
        <Text style={s.sectionTitle}>
          <Text style={s.sectionNum}>9. </Text>Potencial y Recomendaciones de Desarrollo
        </Text>
        <Text style={s.body}>{sections.potential}</Text>

        {/* 10. Tendencias de comportamiento */}
        <Text style={s.sectionTitle}>
          <Text style={s.sectionNum}>10. </Text>Tendencias de Comportamiento
        </Text>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image es de @react-pdf/renderer */}
        <Image style={{ ...s.chart, width: 420, height: 250 }} src={svgToDataUri(tendenciasChartSvg)} />

        {/* 11. Nota de uso */}
        <Text style={s.sectionTitle}>
          <Text style={s.sectionNum}>11. </Text>Nota de Uso
        </Text>
        <Text style={s.note}>
          Este informe describe el estilo conductual de la persona evaluada y no mide habilidades, conocimientos ni garantiza desempeño en ningún contexto específico. El instrumento está basado en la teoría pública DISC (Marston, 1928) y representa una arquitectura de trabajo no validada psicométricamente. Los resultados deben interpretarse como orientación y complementarse con otras fuentes de información.
        </Text>

      </Page>
    </Document>
  )
}
