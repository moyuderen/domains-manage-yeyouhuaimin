export type Site = {
  id: string
  name: string
  category: string
  iconUrl: string
  description: string
  remark: string
  websiteUrl: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type SiteFormValues = {
  name: string
  category: string
  iconUrl: string
  description: string
  remark: string
  websiteUrl: string
  isActive: boolean
}

export type SiteRow = {
  id: string
  name: string
  category: string
  icon_url: string
  description: string
  remark: string
  website_url: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type SiteFilters = {
  keyword: string
  category: string | 'all'
  isActive: boolean | 'all'
}

export type SiteListQuery = SiteFilters & {
  page: number
  pageSize: number
}

export type PaginatedSites = {
  items: Site[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type FavoriteSite = {
  siteId: string
  position: number
}
