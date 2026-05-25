import type { HabitDomain } from '@prisma/client'

export function canSee(requesterId: string, domain: HabitDomain): boolean {
  if (domain.accessibilityState !== 'private') return true
  return domain.ownerId === requesterId
}
