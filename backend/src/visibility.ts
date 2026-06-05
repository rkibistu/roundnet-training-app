import type { HabitDomain } from '@prisma/client'
import prisma from './db.js'

export function groupRoot(domain: HabitDomain): string {
  return domain.rootDomainId ?? domain.id
}

export async function canSeeDomain(requesterId: string, domain: HabitDomain): Promise<boolean> {
  if (domain.ownerId === requesterId) return true
  if (domain.accessibilityState !== 'private') return true

  // private: requester must be a member of the attunement group anchored at groupRoot(domain)
  // (Part 2 will add: OR holds a pending Domain Invite into the group)
  const root = groupRoot(domain)
  const isMember = await prisma.habitDomain.count({
    where: {
      ownerId: requesterId,
      OR: [{ id: root }, { rootDomainId: root }],
    },
  })
  return isMember > 0
}
