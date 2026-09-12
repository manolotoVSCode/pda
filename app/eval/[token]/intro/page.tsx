import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function IntroPage({
  params,
}: {
  params: { token: string }
}) {
  const assessment = await db.assessment.findUnique({
    where: { token: params.token },
    select: { id: true },
  })

  if (!assessment) notFound()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="max-w-md">
        <h1 className="text-xl font-semibold text-slate-800 mb-4">
          Evaluación de perfil conductual
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed mb-8">
          A continuación completarás un cuestionario breve sobre cómo te describes a ti mismo
          en distintos contextos. El proceso toma aproximadamente diez minutos.
          Para obtener resultados precisos, responde con honestidad y sin interrupciones,
          eligiendo lo que mejor te representa, no lo que crees que se espera de ti.
          No hay respuestas correctas ni incorrectas.
        </p>
        <Link
          href={`/eval/${params.token}/register`}
          className="inline-block rounded bg-slate-800 px-6 py-2.5 text-sm text-white font-medium hover:bg-slate-700 transition-colors"
        >
          Continuar
        </Link>
      </div>
    </div>
  )
}
