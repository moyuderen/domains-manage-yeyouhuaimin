import { DashboardPageClient } from '@/components/dashboard/DashboardPageClient'
import { getDashboardData } from '@/lib/data/dashboard'

export default async function DashboardPage() {
  const data = await getDashboardData()

  return <DashboardPageClient {...data} />
}
