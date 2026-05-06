import type { Site, SiteRow } from '@/types/site'

export function mapSite(row: SiteRow): Site {
  return {
    id: row.id,
    name: row.name,
    category: row.category ?? '',
    iconUrl: row.icon_url ?? '',
    description: row.description ?? '',
    remark: row.remark ?? '',
    websiteUrl: row.website_url ?? '',
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
