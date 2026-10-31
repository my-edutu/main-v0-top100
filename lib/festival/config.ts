export const FESTIVAL_KEY = 'afl-festival-2026'
export const FESTIVAL_IMAGE = '/images/afl-festival-2026.webp'
export const FESTIVAL_PAYMENT_PATH = '/dashboard/me/award/payment'

export const canAttendFestival = (membershipStatus: string) =>
  membershipStatus === 'approved'
