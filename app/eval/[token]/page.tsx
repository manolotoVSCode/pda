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

  // Self-registration required before any block; show intro first
  if (!assessment.candidateId) {
    redirect(`/eval/${params.token}/intro`)
  }

  if (assessment.status === 'COMPLETED') {
    redirect(`/eval/${params.token}/done`)
  }

  const b1Count = assessment.blockResponses.filter(r => r.block === 1).length
  const b2MainCount = assessment.blockResponses.filter(r => r.block === 2 && !r.isControl).length
  const b2ControlDone = assessment.block2ControlCompletedAt != null

  if (b1Count < 8) redirect(`/eval/${params.token}/block1`)
  if (b2MainCount < 8) redirect(`/eval/${params.token}/block2`)
  if (!b2ControlDone) redirect(`/eval/${params.token}/block2-control`)
  if (!assessment.block3Text) redirect(`/eval/${params.token}/block3`)

  redirect(`/eval/${params.token}/done`)
}
