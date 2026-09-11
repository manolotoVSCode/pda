import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  req: Request,
  { params }: { params: { token: string } },
) {
  const assessment = await db.assessment.findUnique({
    where: { token: params.token },
  })

  if (!assessment) {
    return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 })
  }

  if (assessment.candidateId) {
    return NextResponse.json({ error: 'Esta evaluación ya tiene un participante registrado' }, { status: 409 })
  }

  const body = await req.json()
  const { name, lastName, email, emailConfirm, gender, birthDate, consentPrivacy, consentComms } = body

  // Validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  }
  if (!lastName || typeof lastName !== 'string' || lastName.trim().length === 0) {
    return NextResponse.json({ error: 'El apellido es requerido' }, { status: 400 })
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'El correo electrónico no es válido' }, { status: 400 })
  }
  if (email !== emailConfirm) {
    return NextResponse.json({ error: 'Los correos electrónicos no coinciden' }, { status: 400 })
  }
  if (!consentPrivacy) {
    return NextResponse.json({ error: 'Debes aceptar las políticas de privacidad para continuar' }, { status: 400 })
  }

  const candidate = await db.candidate.create({
    data: {
      consultantId: assessment.consultantId,
      name: name.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      gender: gender?.trim() ?? null,
      birthDate: birthDate ? new Date(birthDate) : null,
      consentPrivacy: true,
      consentComms: consentComms === true,
    },
  })

  await db.assessment.update({
    where: { id: assessment.id },
    data: { candidateId: candidate.id },
  })

  return NextResponse.json({ candidateId: candidate.id }, { status: 201 })
}
