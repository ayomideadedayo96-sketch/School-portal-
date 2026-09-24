import { getCurrentProfile } from '@/lib/auth/getProfile'
import ResultsPageContent from '@/components/results/ResultsPageContent'

export default async function AdminResultsPage({
  searchParams,
}: {
  searchParams: { session?: string; term?: string; class?: string; subject?: string }
}) {
  const { profile } = await getCurrentProfile()

  return <ResultsPageContent profile={profile!} basePath="/admin/results" searchParams={searchParams} />
}
