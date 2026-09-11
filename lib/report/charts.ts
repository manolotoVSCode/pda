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
  D: 'Orientación competitiva a resultados',
  I: 'Persuasión y comunicación interpersonal',
  S: 'Atención y escucha',
  C: 'Seguimiento de normas y procedimientos',
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

export function buildRadarChartSvg(pp: DimensionVector, pi: DimensionVector): string {
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

export function buildTendenciasChartSvg(pc: DimensionVector): string {
  const W = 420
  const SLIDER_H = 65
  const TRACK_Y = 22  // track top relative to each slider block
  const TRACK_H = 10
  const H = DIMS.length * SLIDER_H - 10  // last slider needs no trailing gap

  const gradDefs = DIMS.map(dim => `
    <linearGradient id="gt-${dim}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${DIM_LIGHT_COLORS[dim]}"/>
      <stop offset="100%" stop-color="${DIM_COLORS[dim]}"/>
    </linearGradient>`).join('')

  const sliders = DIMS.map((dim, i) => {
    const baseY = i * SLIDER_H
    const trackTop = baseY + TRACK_Y
    const indicatorX = (pc[dim] / 100) * W
    const circleY = trackTop - 4
    const extremeY = trackTop + TRACK_H + 14
    const divider = i < DIMS.length - 1
      ? `<line x1="0" y1="${baseY + SLIDER_H - 5}" x2="${W}" y2="${baseY + SLIDER_H - 5}" stroke="#f1f5f9" stroke-width="1"/>`
      : ''
    return `
  <text x="0" y="${baseY + 14}" font-family="Helvetica-Bold" font-size="11" fill="#475569">${TENDENCIAS_LABELS[dim]}</text>
  <text x="${W}" y="${baseY + 14}" font-family="Helvetica-Bold" font-size="12" fill="${DIM_COLORS[dim]}" text-anchor="end">${Math.round(pc[dim])}</text>
  <rect x="0" y="${trackTop}" width="${W}" height="${TRACK_H}" rx="5" fill="url(#gt-${dim})"/>
  <rect x="${(indicatorX - 1.5).toFixed(1)}" y="${trackTop - 2}" width="3" height="${TRACK_H + 4}" rx="1.5" fill="white"/>
  <circle cx="${indicatorX.toFixed(1)}" cy="${circleY}" r="6" fill="${DIM_COLORS[dim]}" stroke="white" stroke-width="2"/>
  <text x="0" y="${extremeY}" font-family="Helvetica" font-size="9" fill="#94a3b8">Mayor esfuerzo</text>
  <text x="${W}" y="${extremeY}" font-family="Helvetica" font-size="9" fill="#94a3b8" text-anchor="end">Menor esfuerzo</text>
  ${divider}`
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${gradDefs}</defs>
  ${sliders}
</svg>`
}
