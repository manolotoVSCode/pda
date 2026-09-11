import { db } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'

export default async function EvalEntryPage({
  params,
}: {
  params: { token: string }
}) {
  const assessment = await db.assessment.findUnique({
    where: { token: params.token },
    include: { blockResponses: true },
  })

  if (!assessment) notFound()

  // Self-registration required before any block
  if (!assessment.candidateId) {
    redirect(`/eval/${params.token}/register`)
  }

  if (assessment.status === 'COMPLETED') {
    redirect(`/eval/${params.token}/done`)
  }

  const b1Count = assessment.blockResponses.filter(r => r.block === 1).length
  const b2Count = assessment.blockResponses.filter(r => r.block === 2).length

  if (b1Count < 6) redirect(`/eval/${params.token}/block1`)
  if (b2Count < 7) redirect(`/eval/${params.token}/block2`)
  if (!assessment.block3Text) redirect(`/eval/${params.token}/block3`)

  redirect(`/eval/${params.token}/done`)
}
