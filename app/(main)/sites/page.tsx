import { SitesPageClient } from '@/components/sites/SitesPageClient'
import { getSites, getFavoriteSites } from '@/lib/data/sites'

export default async function SitesPage() {
  const [result, favorites] = await Promise.all([
    getSites({
      keyword: '',
      category: 'all',
      isActive: 'all',
      page: 1,
      pageSize: 100,
    }),
    getFavoriteSites(),
  ])

  return <SitesPageClient initialSites={result.items} total={result.total} initialFavorites={favorites} />
}
