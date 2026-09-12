/**
 * preview-charts.ts
 * Generates an HTML file at /tmp/preview-charts.html with the three
 * new visual elements rendered using sample data, and opens it in the browser.
 *
 * Usage: npx tsx scripts/preview-charts.ts
 */
import { buildBarChartSvg, buildWheelChartSvg, buildTendenciasChartSvg } from '../lib/report/charts'
import { writeFileSync } from 'fs'
import { execSync } from 'child_process'

// Sample profile — varied scores to show contrast across all four dims
const pc = { D: 78, I: 52, S: 24, C: 65 }
const pp = { D: 82, I: 48, S: 20, C: 70 }
const pi = { D: 73, I: 56, S: 28, C: 60 }

const barSvg    = buildBarChartSvg(pc)
const wheelSvg  = buildWheelChartSvg(pc)
const tendSvg   = buildTendenciasChartSvg(pc)

// Sample long-text section with bullet points (simulating \n• DB content)
const sampleBulletText = `Este perfil muestra una orientación marcada hacia la iniciativa y la precisión analítica.
• Aprovecha entornos donde pueda ejercer influencia directa y tomar decisiones con autonomía.
• Complementa sus fortalezas con escucha activa cuando trabaja en equipos colaborativos.
• Mantiene altos estándares de calidad; conviene equilibrarlos con flexibilidad ante cambios inesperados.`

const bulletHtml = sampleBulletText.split('\n•').map((p, i) => {
  const text = i === 0 ? p.trim() : `• ${p.trim()}`
  return `<p style="margin:0 0 6px 0;font-size:13px;color:#444;line-height:1.5;">${text}</p>`
}).join('')

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Preview — nuevos elementos gráficos del informe</title>
  <style>
    body { font-family: Helvetica, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 32px; color: #222; }
    h1 { font-size: 18px; color: #2d4a7a; margin-bottom: 4px; }
    .subtitle { font-size: 13px; color: #64748b; margin-bottom: 40px; }
    section { background: white; border-radius: 8px; padding: 28px 32px; margin-bottom: 32px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    h2 { font-size: 14px; color: #2d4a7a; border-bottom: 1.5px solid #2d4a7a; padding-bottom: 4px; margin-top: 0; margin-bottom: 16px; }
    .label { font-size: 11px; color: #94a3b8; margin-bottom: 8px; }
    .chip { display:inline-block; background:#f1f5f9; border-radius:4px; padding:2px 8px; font-size:11px; color:#64748b; margin-bottom:12px; }
    svg { display: block; }
  </style>
</head>
<body>
  <h1>Preview — nuevos elementos visuales del informe PDF</h1>
  <p class="subtitle">Datos de muestra: D=78 I=52 S=24 C=65 — representativo de un perfil dominante D–C</p>

  <!-- 1. Wheel chart -->
  <section>
    <h2>3. Perfil Compuesto por Dimensión — Rueda polar</h2>
    <p class="label">Aparece debajo del gráfico de barras en la sección 3, después de las puntuaciones PP · PI · PC</p>
    <div style="display:flex;justify-content:center;">
      ${wheelSvg}
    </div>
  </section>

  <!-- 2. Bar chart (context reference) -->
  <section>
    <h2>3. Gráfico de barras (referencia, no cambia)</h2>
    <p class="label">El gráfico de barras sigue igual; se muestra aquí solo como referencia para comparar con la rueda</p>
    <div style="display:flex;justify-content:center;">
      ${barSvg}
    </div>
  </section>

  <!-- 3. Tendencias — corregido -->
  <section>
    <h2>10. Tendencias de Comportamiento — polos corregidos</h2>
    <p class="label">Extremos restaurados a "Mayor esfuerzo" / "Menor esfuerzo". Diseño visual (badges, degradado, tick neutro) sin cambios.</p>
    <div style="display:flex;justify-content:center;">
      ${tendSvg}
    </div>
  </section>

  <!-- 4. Bullet section -->
  <section>
    <h2>9. Potencial y Recomendaciones — viñetas</h2>
    <p class="label">Si el texto de la BD incluye marcadores \\n• el componente BulletSection los divide en párrafos separados. Retrocompatible: texto plano sin marcadores se renderiza como un párrafo único.</p>
    <div class="chip">Con marcadores \\n• (requiere actualización de la BD)</div>
    <div style="background:#f8fafc;border-radius:6px;padding:16px 20px;">
      ${bulletHtml}
    </div>
  </section>
</body>
</html>`

const outPath = '/tmp/preview-charts.html'
writeFileSync(outPath, html, 'utf-8')
console.log(`Preview written to ${outPath}`)

try {
  execSync(`open "${outPath}"`)
} catch {
  console.log('Open manually in your browser.')
}
