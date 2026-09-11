import type { DimensionVector } from '../scoring/types'

type Dimension = 'D' | 'I' | 'S' | 'C'

const DIM_LABELS: Record<Dimension, string> = {
  D: 'Iniciativa',
  I: 'Vínculo',
  S: 'Cadencia',
  C: 'Precisión',
}

const DIM_COLORS: Record<Dimension, string> = {
  D: '#e05c3a',
  I: '#f0a030',
  S: '#4aad8c',
  C: '#4a7fbf',
}

const DIMS: Dimension[] = ['D', 'I', 'S', 'C']

export function buildBarChartSvg(pc: DimensionVector): string {
  const W = 420
  const BAR_H = 28
  const GAP = 14
  const LABEL_W = 85
  const MARGIN_R = 48
  const MARGIN_T = 16
  const MARGIN_B = 16
  const CHART_W = W - LABEL_W - MARGIN_R
  const H = DIMS.length * (BAR_H + GAP) + MARGIN_T + MARGIN_B

  const bars = DIMS.map((dim, i) => {
    const val = pc[dim]
    const barW = (val / 100) * CHART_W
    const y = MARGIN_T + i * (BAR_H + GAP)
    return [
      `<text x="${LABEL_W - 8}" y="${y + BAR_H / 2 + 5}" text-anchor="end" font-family="sans-serif" font-size="13" fill="#333">${DIM_LABELS[dim]}</text>`,
      `<rect x="${LABEL_W}" y="${y}" width="${barW.toFixed(1)}" height="${BAR_H}" fill="${DIM_COLORS[dim]}" rx="3"/>`,
      `<text x="${LABEL_W + barW + 6}" y="${y + BAR_H / 2 + 5}" font-family="sans-serif" font-size="12" fill="#555">${Math.round(val)}</text>`,
    ].join('\n')
  }).join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <line x1="${LABEL_W}" y1="${MARGIN_T - 4}" x2="${LABEL_W}" y2="${H - MARGIN_B + 4}" stroke="#ddd" stroke-width="1"/>
  <line x1="${LABEL_W}" y1="${H - MARGIN_B + 4}" x2="${LABEL_W + CHART_W}" y2="${H - MARGIN_B + 4}" stroke="#ddd" stroke-width="1"/>
  ${bars}
</svg>`
}

export function buildRadarChartSvg(pc: DimensionVector, ideal: DimensionVector): string {
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

  function polygon(vectors: DimensionVector): string {
    return DIMS.map((dim, i) => {
      const [x, y] = pt(i, vectors[dim])
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
    D: [0, -14],
    I: [14, 0],
    S: [0, 14],
    C: [-14, 0],
  }
  const dimLabels = DIMS.map((dim, i) => {
    const [x, y] = pt(i, 115)
    const [ox, oy] = labelOffsets[dim]
    return `<text x="${(x + ox).toFixed(2)}" y="${(y + oy).toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="11" fill="#475569">${DIM_LABELS[dim]}</text>`
  }).join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  ${gridLines}
  ${axisLines}
  <path d="${polygon(ideal)}" fill="rgba(74,127,191,0.15)" stroke="#4a7fbf" stroke-width="1.5" stroke-dasharray="5,3"/>
  <path d="${polygon(pc)}" fill="rgba(224,92,58,0.15)" stroke="#e05c3a" stroke-width="2"/>
  ${dimLabels}
  <circle cx="${CX - 60}" cy="${SIZE - 18}" r="5" fill="#e05c3a"/>
  <text x="${CX - 52}" y="${SIZE - 14}" font-family="sans-serif" font-size="10" fill="#333">Perfil Compuesto</text>
  <circle cx="${CX + 35}" cy="${SIZE - 18}" r="5" fill="#4a7fbf"/>
  <text x="${CX + 43}" y="${SIZE - 14}" font-family="sans-serif" font-size="10" fill="#333">Perfil Ideal</text>
</svg>`
}
