import type { createAdminClient } from '@/lib/supabase/server'

export async function getAwardLetterAccess(db: ReturnType<typeof createAdminClient>, memberId: string) {
  const [profile, award] = await Promise.all([
    db.from('profiles').select('membership_status').eq('id', memberId).maybeSingle(),
    db.from('awardees').select('year').eq('profile_id', memberId).order('year', { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
  ])
  if (profile.error || award.error) throw new Error('Award record unavailable')
  const status = profile.data?.membership_status
  if (!status || status === 'rejected' || status === 'suspended' || (!award.data && status !== 'approved')) return null
  const year = String(award.data?.year ?? '')
  return { year: /^\d{4}$/.test(year) ? year : undefined }
}
