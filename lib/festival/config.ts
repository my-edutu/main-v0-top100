export const FESTIVAL_KEY = 'afl-festival-2026'
export const FESTIVAL_IMAGE = '/images/afl-festival-2026.webp'
export const FESTIVAL_PAYMENT_PATH = '/dashboard/me/award/payment'
export const FESTIVAL_DATE = '30 November 2026'
export const FESTIVAL_VENUE = 'University of Lagos'
export const FESTIVAL_TIME = 'Time to be confirmed'
export const FESTIVAL_TICKET_PATH = '/api/member/festival-interest/ticket'

export const canAttendFestival = (membershipStatus: string) =>
  membershipStatus === 'approved'
