import { getCurrentProfile } from '@/lib/auth/getProfile'
import ResultsPageContent from '@/components/results/ResultsPageContent'

export default async function TeacherResultsPage({
  searchParams,
}: {
  searchParams: { session?: string; term?: string; class?: string; subject?: string }
}) {
  const { profile } = await getCurrentProfile()

  return <ResultsPageContent profile={profile!} basePath="/teacher/results" searchParams={searchParams} />
}
