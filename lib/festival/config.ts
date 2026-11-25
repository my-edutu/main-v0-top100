export const FESTIVAL_KEY = 'afl-festival-2026'
export const FESTIVAL_IMAGE = '/images/afl-festival-2026.webp'
export const FESTIVAL_PAYMENT_PATH = '/dashboard/me/award/payment'
export const FESTIVAL_DATE = '30 November 2026'
export const FESTIVAL_VENUE = 'ALX Tech Hub, Costain'
export const FESTIVAL_ADDRESS = '5th Floor, ITF House, Plot 12 Funsho Williams Avenue, Iponri, Surulere, Lagos'
export const FESTIVAL_DIRECTIONS_URL = 'https://www.google.com/maps/dir/?api=1&destination=ITF+House%2C+12+Funsho+Williams+Avenue%2C+Iponri%2C+Surulere%2C+Lagos%2C+Nigeria'
export const FESTIVAL_TICKET_VIEW_PATH = '/dashboard/festival/ticket'
export const FESTIVAL_TIME = 'Time to be confirmed'
export const FESTIVAL_TICKET_PATH = '/api/member/festival-interest/ticket'

export const canAttendFestival = (membershipStatus: string) =>
  membershipStatus === 'approved'
