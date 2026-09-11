import Link from 'next/link'

const navItems = [
  { href: '/positions', label: 'Cargos', description: 'Crear y editar cargos con perfil ideal' },
  { href: '/candidates', label: 'Candidatos', description: 'Registrar candidatos' },
  { href: '/assessments', label: 'Evaluaciones', description: 'Crear evaluaciones y ver resultados' },
  { href: '/settings/lexicon', label: 'Léxico', description: 'Editar diccionario del Bloque 3' },
  { href: '/settings/templates', label: 'Plantillas', description: 'Editar banco de párrafos narrativos' },
]

export default function DashboardPage() {
  return (
    <main className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Panel del consultor</h1>
      <p className="text-slate-500 mb-8">Plataforma de evaluación conductual.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg border border-slate-200 bg-white p-5 hover:border-slate-400 hover:shadow-sm transition-all"
          >
            <p className="font-semibold text-slate-800">{item.label}</p>
            <p className="text-sm text-slate-500 mt-1">{item.description}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
