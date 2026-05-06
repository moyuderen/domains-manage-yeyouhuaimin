'use server'

import { revalidatePath } from 'next/cache'

import { requireAccess } from '@/lib/auth/access-server'
import { createSubdomain, deleteSubdomain, updateSubdomain } from '@/lib/data/domains'
import { subdomainSchema } from '@/schemas/domainSchemas'
import type { SubdomainFormValues } from '@/types/domain'

export async function createSubdomainAction(domainId: string, values: SubdomainFormValues) {
  await requireAccess()
  const parsed = subdomainSchema.parse(values)
  await createSubdomain(domainId, parsed)
  revalidatePath('/domains')
  revalidatePath(`/domains/${domainId}`)
}

export async function updateSubdomainAction(domainId: string, id: string, values: SubdomainFormValues) {
  await requireAccess()
  const parsed = subdomainSchema.parse(values)
  await updateSubdomain(id, parsed)
  revalidatePath('/domains')
  revalidatePath(`/domains/${domainId}`)
}

export async function deleteSubdomainAction(domainId: string, id: string) {
  await requireAccess()
  await deleteSubdomain(id)
  revalidatePath('/domains')
  revalidatePath(`/domains/${domainId}`)
}
