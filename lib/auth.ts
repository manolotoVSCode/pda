import bcrypt from 'bcryptjs'
import { db } from './db'

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const consultant = await db.consultant.findFirst()
  if (!consultant) return false
  return bcrypt.compare(password, consultant.passwordHash)
}
