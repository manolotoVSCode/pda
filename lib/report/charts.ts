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

const DIM_LIGHT_COLORS: Record<Dimension, string> = {
  D: '#fde8e0',
  I: '#fef3dc',
  S: '#d9f4ec',
  C: '#dce9f7',
}

const TENDENCIAS_LABELS: Record<Dimension, string> = {
  D: 'Orientación a resultados y decisión directa',
  I: 'Persuasión y comunicación interpersonal',
  S: 'Atención y escucha',
  C: 'Seguimiento de normas y procedimientos',
}

// Labels for the two extremes of the tendencias track.
// Left (low score) = Mayor esfuerzo: the person has to consciously push toward this dimension.
// Right (high score) = Menor esfuerzo: these behaviors come naturally to the person.
const TENDENCIAS_POLES: Record<Dimension, { low: string; high: string }> = {
  D: { low: 'Mayor esfuerzo', high: 'Menor esfuerzo' },
  I: { low: 'Mayor esfuerzo', high: 'Menor esfuerzo' },
  S: { low: 'Mayor esfuerzo', high: 'Menor esfuerzo' },
  C: { low: 'Mayor esfuerzo', high: 'Menor esfuerzo' },
}

// Descriptive sub-labels for each axis of the wheel chart
const WHEEL_AXIS_LABELS: Record<Dimension, string> = {
  D: 'Decisión · Impacto',
  I: 'Conexión · Persuasión',
  S: 'Constancia · Apoyo',
  C: 'Análisis · Rigor',
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
      `<text x="${LABEL_W - 8}" y="${y + BAR_H / 2 + 5}" text-anchor="end" font-family="Helvetica" font-size="13" fill="#333">${DIM_LABELS[dim]}</text>`,
      `<rect x="${LABEL_W}" y="${y}" width="${barW.toFixed(1)}" height="${BAR_H}" fill="${DIM_COLORS[dim]}" rx="3"/>`,
      `<text x="${LABEL_W + barW + 6}" y="${y + BAR_H / 2 + 5}" font-family="Helvetica" font-size="12" fill="#555">${Math.round(val)}</text>`,
    ].join('\n')
  }).join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <line x1="${LABEL_W}" y1="${MARGIN_T - 4}" x2="${LABEL_W}" y2="${H - MARGIN_B + 4}" stroke="#ddd" stroke-width="1"/>
  <line x1="${LABEL_W}" y1="${H - MARGIN_B + 4}" x2="${LABEL_W + CHART_W}" y2="${H - MARGIN_B + 4}" stroke="#ddd" stroke-width="1"/>
  ${bars}
</svg>`
}

/**
 * Polar area (rose) chart for the four PC dimensions.
 * Each 90° sector's radius is proportional to the dimension's PC score.
 * D=top, I=right, S=bottom, C=left — using our own descriptive axis labels,
 * not the proprietary R·E·P·N·A schema of any other instrument.
 */
export function buildWheelChartSvg(pc: DimensionVector): string {
  const W = 340
  const H = 300
  const CX = 170  // horizontal center (extra width accommodates side labels)
  const CY = 150
  const R = 90    // max radius

  const toRad = (deg: number) => (deg * Math.PI) / 180
  const SQ2 = Math.SQRT1_2  // cos/sin of 45° = 0.7071

  // Build a 90° sector path from startDeg to startDeg+90 (SVG convention: 0°=right, clockwise)
  function makeSector(dim: Dimension, startDeg: number): string {
    const r = Math.max((pc[dim] / 100) * R, 3)
    const x1 = (CX + r * Math.cos(toRad(startDeg))).toFixed(2)
    const y1 = (CY + r * Math.sin(toRad(startDeg))).toFixed(2)
    const x2 = (CX + r * Math.cos(toRad(startDeg + 90))).toFixed(2)
    const y2 = (CY + r * Math.sin(toRad(startDeg + 90))).toFixed(2)
    return `<path d="M ${CX},${CY} L ${x1},${y1} A ${r.toFixed(2)},${r.toFixed(2)} 0 0,1 ${x2},${y2} Z" fill="${DIM_COLORS[dim]}" opacity="0.83"/>`
  }

  // Score callout at the midpoint angle inside the sector
  function scoreLabel(dim: Dimension, midDeg: number): string {
    const r = Math.max((pc[dim] / 100) * R, 3)
    if (r < 22) return ''
    const lx = (CX + r * 0.60 * Math.cos(toRad(midDeg))).toFixed(1)
    const ly = (CY + r * 0.60 * Math.sin(toRad(midDeg)) + 3.5).toFixed(1)
    return `<text x="${lx}" y="${ly}" text-anchor="middle" font-family="Helvetica-Bold" font-size="9" fill="white" opacity="0.95">${Math.round(pc[dim])}</text>`
  }

  // Grid rings at 25 / 50 / 75 / 100% of R
  const grid = [0.25, 0.50, 0.75, 1.0].map(pct => {
    const r = (pct * R).toFixed(1)
    const stroke = pct === 1 ? '#c8d4e4' : '#e8edf4'
    const sw = pct === 1 ? 1 : 0.75
    return `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>`
  }).join('\n  ')

  // Diagonal dividers between sectors
  const dividers = [
    `<line x1="${(CX - R * SQ2).toFixed(1)}" y1="${(CY - R * SQ2).toFixed(1)}" x2="${(CX + R * SQ2).toFixed(1)}" y2="${(CY + R * SQ2).toFixed(1)}" stroke="#d0d9e8" stroke-width="0.75"/>`,
    `<line x1="${(CX + R * SQ2).toFixed(1)}" y1="${(CY - R * SQ2).toFixed(1)}" x2="${(CX - R * SQ2).toFixed(1)}" y2="${(CY + R * SQ2).toFixed(1)}" stroke="#d0d9e8" stroke-width="0.75"/>`,
  ].join('\n  ')

  // Sectors: D=top(225°→315°), I=right(315°→45°), S=bottom(45°→135°), C=left(135°→225°)
  const sectors = [
    makeSector('D', 225),
    makeSector('I', 315),
    makeSector('S', 45),
    makeSector('C', 135),
  ].join('\n  ')

  const scores = [
    scoreLabel('D', 270),
    scoreLabel('I', 0),
    scoreLabel('S', 90),
    scoreLabel('C', 180),
  ].filter(Boolean).join('\n  ')

  const LR = R + 18  // distance from center to axis label

  const axisLabels = [
    // D — top
    `<text x="${CX}" y="${(CY - LR).toFixed(1)}" text-anchor="middle" font-family="Helvetica-Bold" font-size="9" fill="${DIM_COLORS['D']}">${DIM_LABELS['D'].toUpperCase()}</text>`,
    `<text x="${CX}" y="${(CY - LR + 12).toFixed(1)}" text-anchor="middle" font-family="Helvetica" font-size="7.5" fill="#94a3b8">${WHEEL_AXIS_LABELS['D']}</text>`,
    // I — right
    `<text x="${(CX + LR + 2).toFixed(1)}" y="${(CY - 4).toFixed(1)}" text-anchor="start" font-family="Helvetica-Bold" font-size="9" fill="${DIM_COLORS['I']}">${DIM_LABELS['I'].toUpperCase()}</text>`,
    `<text x="${(CX + LR + 2).toFixed(1)}" y="${(CY + 8).toFixed(1)}" text-anchor="start" font-family="Helvetica" font-size="7.5" fill="#94a3b8">${WHEEL_AXIS_LABELS['I']}</text>`,
    // S — bottom
    `<text x="${CX}" y="${(CY + LR + 13).toFixed(1)}" text-anchor="middle" font-family="Helvetica-Bold" font-size="9" fill="${DIM_COLORS['S']}">${DIM_LABELS['S'].toUpperCase()}</text>`,
    `<text x="${CX}" y="${(CY + LR + 25).toFixed(1)}" text-anchor="middle" font-family="Helvetica" font-size="7.5" fill="#94a3b8">${WHEEL_AXIS_LABELS['S']}</text>`,
    // C — left
    `<text x="${(CX - LR - 2).toFixed(1)}" y="${(CY - 4).toFixed(1)}" text-anchor="end" font-family="Helvetica-Bold" font-size="9" fill="${DIM_COLORS['C']}">${DIM_LABELS['C'].toUpperCase()}</text>`,
    `<text x="${(CX - LR - 2).toFixed(1)}" y="${(CY + 8).toFixed(1)}" text-anchor="end" font-family="Helvetica" font-size="7.5" fill="#94a3b8">${WHEEL_AXIS_LABELS['C']}</text>`,
  ].join('\n  ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${grid}
  ${dividers}
  ${sectors}
  <circle cx="${CX}" cy="${CY}" r="3" fill="white" opacity="0.9"/>
  ${scores}
  ${axisLabels}
</svg>`
}

export function buildRadarChartSvg(pp: DimensionVector, pi: DimensionVector): string {
  const SIZE = 300
  const CX = SIZE / 2
  const CY = SIZE / 2
  const R = 100
  const anglesRad = [270, 0, 90, 180].map(deg => (deg * Math.PI) / 180)

  function pt(dimIdx: number, val: number): [number, number] {
    const r = (val / 100) * R
    return [
      CX + r * Math.cos(anglesRad[dimIdx]),
      CY + r * Math.sin(anglesRad[dimIdx]),
    ]
  }

  function polygon(vec: DimensionVector): string {
    return DIMS.map((dim, i) => {
      const [x, y] = pt(i, vec[dim])
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
    D: [0, -14], I: [14, 0], S: [0, 14], C: [-14, 0],
  }
  const dimLabels = DIMS.map((dim, i) => {
    const [x, y] = pt(i, 115)
    const [ox, oy] = labelOffsets[dim]
    return `<text x="${(x + ox).toFixed(2)}" y="${(y + oy).toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-family="Helvetica" font-size="11" fill="#475569">${DIM_LABELS[dim]}</text>`
  }).join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  ${gridLines}
  ${axisLines}
  <path d="${polygon(pi)}" fill="rgba(74,127,191,0.15)" stroke="#4a7fbf" stroke-width="1.5" stroke-dasharray="5,3"/>
  <path d="${polygon(pp)}" fill="rgba(224,92,58,0.15)" stroke="#e05c3a" stroke-width="2"/>
  ${dimLabels}
  <circle cx="${CX - 70}" cy="${SIZE - 18}" r="5" fill="#e05c3a"/>
  <text x="${CX - 62}" y="${SIZE - 14}" font-family="Helvetica" font-size="10" fill="#333">Perfil Percibido</text>
  <circle cx="${CX + 30}" cy="${SIZE - 18}" r="5" fill="#4a7fbf"/>
  <text x="${CX + 38}" y="${SIZE - 14}" font-family="Helvetica" font-size="10" fill="#333">Perfil Interno</text>
</svg>`
}

/**
 * Horizontal track chart for behavioral tendencies.
 * Each dimension shows:
 *   - A colored badge (bar + dim code + descriptive label)
 *   - Two behavioral poles at each extreme (low = left, high = right)
 *   - A gradient-filled track up to the score position
 *   - A white tick mark at the neutral midpoint (50)
 *   - A circle indicator at the score position
 */
export function buildTendenciasChartSvg(pc: DimensionVector): string {
  const W = 420
  const SLIDER_H = 68
  const H = DIMS.length * SLIDER_H - 10

  const gradDefs = DIMS.map(dim => `
    <linearGradient id="gt-${dim}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${DIM_LIGHT_COLORS[dim]}"/>
      <stop offset="100%" stop-color="${DIM_COLORS[dim]}"/>
    </linearGradient>`).join('')

  const sliders = DIMS.map((dim, i) => {
    const baseY = i * SLIDER_H
    const trackY = baseY + 26
    const trackH = 9
    const indicatorX = (pc[dim] / 100) * W
    const circleY = trackY + trackH / 2
    const neutralX = W / 2
    const poles = TENDENCIAS_POLES[dim]
    const divider = i < DIMS.length - 1
      ? `<line x1="0" y1="${baseY + SLIDER_H - 6}" x2="${W}" y2="${baseY + SLIDER_H - 6}" stroke="#f1f5f9" stroke-width="1"/>`
      : ''

    return `
  <rect x="0" y="${baseY + 2}" width="3" height="13" rx="1.5" fill="${DIM_COLORS[dim]}"/>
  <text x="9" y="${baseY + 13}" font-family="Helvetica-Bold" font-size="10" fill="${DIM_COLORS[dim]}">${dim}</text>
  <text x="22" y="${baseY + 13}" font-family="Helvetica" font-size="10" fill="#475569">· ${TENDENCIAS_LABELS[dim]}</text>
  <text x="${W}" y="${baseY + 13}" font-family="Helvetica-Bold" font-size="11" fill="${DIM_COLORS[dim]}" text-anchor="end">${Math.round(pc[dim])}</text>
  <text x="0" y="${baseY + 23}" font-family="Helvetica" font-size="8" fill="#94a3b8">${poles.low}</text>
  <text x="${W}" y="${baseY + 23}" font-family="Helvetica" font-size="8" fill="#94a3b8" text-anchor="end">${poles.high}</text>
  <rect x="0" y="${trackY}" width="${W}" height="${trackH}" rx="4.5" fill="#f1f5f9"/>
  <rect x="0" y="${trackY}" width="${indicatorX.toFixed(1)}" height="${trackH}" rx="4.5" fill="url(#gt-${dim})"/>
  <rect x="${(neutralX - 1).toFixed(1)}" y="${trackY - 2}" width="2" height="${trackH + 4}" rx="1" fill="white" opacity="0.85"/>
  <circle cx="${indicatorX.toFixed(1)}" cy="${circleY.toFixed(1)}" r="6" fill="${DIM_COLORS[dim]}" stroke="white" stroke-width="2"/>
  ${divider}`
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${gradDefs}</defs>
  ${sliders}
</svg>`
}
